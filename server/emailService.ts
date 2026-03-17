import nodemailer from "nodemailer";
import { createEmailNotification, markEmailFailed, markEmailSent, getDb } from "./db";
import { emailNotifications } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Use a test transport if no SMTP configured; in production, configure SMTP via env vars
function createTransport() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(process.env.SMTP_PORT ?? "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: smtpUser, pass: smtpPass },
    });
  }

  // Fallback: log-only transport for development
  return {
    sendMail: async (options: any) => {
      console.log("[Email] Would send email:", {
        to: options.to,
        subject: options.subject,
        preview: options.text?.substring(0, 100),
      });
      return { messageId: `mock-${Date.now()}` };
    },
  };
}

export async function sendTimesheetSubmissionAlert(params: {
  hrAdminEmails: string[];
  managerName: string;
  teamName: string;
  workDate: string;
  timesheetId: number;
  hrAdminIds?: number[];
}) {
  const { hrAdminEmails, managerName, teamName, workDate, timesheetId } = params;
  const subject = `[ConstructHR] Timesheet Submitted — ${teamName} (${workDate})`;
  const body = `
A new timesheet has been submitted and requires your review.

Manager: ${managerName}
Team: ${teamName}
Work Date: ${workDate}

Please log in to ConstructHR to review and approve or flag this timesheet.

This is an automated notification from ConstructHR Timesheet Management System.
  `.trim();

  for (let i = 0; i < hrAdminEmails.length; i++) {
    const email = hrAdminEmails[i];
    const hrAdminId = params.hrAdminIds?.[i];
    await createEmailNotification({
      recipientId: hrAdminId,
      recipientEmail: email,
      subject,
      body,
      type: "submission_alert",
      relatedTimesheetId: timesheetId,
    });
  }

  await deliverPendingEmails();
}

export async function sendTimesheetReviewNotification(params: {
  managerEmail: string;
  managerId?: number;
  managerName: string;
  teamName: string;
  workDate: string;
  status: "approved" | "flagged";
  reviewNotes?: string;
  timesheetId: number;
}) {
  const { managerEmail, managerName, teamName, workDate, status, reviewNotes, timesheetId } = params;
  const isApproved = status === "approved";
  const subject = isApproved
    ? `[ConstructHR] Timesheet Approved — ${teamName} (${workDate})`
    : `[ConstructHR] Timesheet Requires Correction — ${teamName} (${workDate})`;

  const body = isApproved
    ? `
Dear ${managerName},

Your timesheet for ${teamName} on ${workDate} has been approved by HR.

Thank you for your timely submission.

ConstructHR Timesheet Management System
    `.trim()
    : `
Dear ${managerName},

Your timesheet for ${teamName} on ${workDate} has been flagged and requires correction.

${reviewNotes ? `HR Notes: ${reviewNotes}` : ""}

Please log in to ConstructHR to review the feedback and resubmit your timesheet.

ConstructHR Timesheet Management System
    `.trim();

  await createEmailNotification({
    recipientId: params.managerId,
    recipientEmail: managerEmail,
    subject,
    body,
    type: isApproved ? "approval" : "correction_request",
    relatedTimesheetId: timesheetId,
  });

  await deliverPendingEmails();
}

async function deliverPendingEmails() {
  const db = await getDb();
  if (!db) return;

  const pending = await db
    .select()
    .from(emailNotifications)
    .where(eq(emailNotifications.status, "pending"))
    .limit(10);

  const transport = createTransport();

  for (const notification of pending) {
    try {
      await transport.sendMail({
        from: process.env.SMTP_FROM ?? "noreply@constructhr.com",
        to: notification.recipientEmail,
        subject: notification.subject,
        text: notification.body,
        html: `<pre style="font-family: sans-serif; white-space: pre-wrap;">${notification.body}</pre>`,
      });
      await markEmailSent(notification.id);
    } catch (error) {
      console.error("[Email] Failed to send:", error);
      await markEmailFailed(notification.id);
    }
  }
}
