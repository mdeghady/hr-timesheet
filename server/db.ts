import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  auditLogs,
  emailNotifications,
  employees,
  teamAssignments,
  teams,
  timesheetEntries,
  timesheets,
  users,
  type InsertAuditLog,
  type InsertEmployee,
  type InsertTeam,
  type InsertTimesheet,
  type InsertTimesheetEntry,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "hr_admin";
    updateSet.role = "hr_admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getAllManagers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(users)
    .where(and(eq(users.role, "manager"), eq(users.isActive, true)))
    .orderBy(users.name);
}

export async function getAllHRAdmins() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(users)
    .where(and(eq(users.role, "hr_admin"), eq(users.isActive, true)))
    .orderBy(users.name);
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "user" | "admin" | "hr_admin" | "manager") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function updateUserProfile(userId: number, data: { name?: string; phone?: string; isActive?: boolean }) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, userId));
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export async function createTeam(data: InsertTeam) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(teams).values(data);
  return result[0];
}

export async function getAllTeams() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: teams.id,
      name: teams.name,
      description: teams.description,
      projectSite: teams.projectSite,
      managerId: teams.managerId,
      isActive: teams.isActive,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt,
      managerName: users.name,
      managerEmail: users.email,
    })
    .from(teams)
    .leftJoin(users, eq(teams.managerId, users.id))
    .orderBy(teams.name);
}

export async function getTeamById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({
      id: teams.id,
      name: teams.name,
      description: teams.description,
      projectSite: teams.projectSite,
      managerId: teams.managerId,
      isActive: teams.isActive,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt,
      managerName: users.name,
      managerEmail: users.email,
    })
    .from(teams)
    .leftJoin(users, eq(teams.managerId, users.id))
    .where(eq(teams.id, id))
    .limit(1);
  return result[0];
}

export async function updateTeam(id: number, data: Partial<InsertTeam>) {
  const db = await getDb();
  if (!db) return;
  await db.update(teams).set({ ...data, updatedAt: new Date() }).where(eq(teams.id, id));
}

export async function deleteTeam(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(teams).set({ isActive: false, updatedAt: new Date() }).where(eq(teams.id, id));
}

export async function getTeamsByManagerId(managerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teams).where(and(eq(teams.managerId, managerId), eq(teams.isActive, true)));
}

// ─── Employees ────────────────────────────────────────────────────────────────

export async function createEmployee(data: InsertEmployee) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(employees).values(data);
}

export async function getAllEmployees() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      firstName: employees.firstName,
      lastName: employees.lastName,
      jobTitle: employees.jobTitle,
      phone: employees.phone,
      email: employees.email,
      teamId: employees.teamId,
      isActive: employees.isActive,
      createdAt: employees.createdAt,
      teamName: teams.name,
    })
    .from(employees)
    .leftJoin(teams, eq(employees.teamId, teams.id))
    .orderBy(employees.lastName, employees.firstName);
}

export async function getEmployeesByTeamId(teamId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(employees)
    .where(and(eq(employees.teamId, teamId), eq(employees.isActive, true)))
    .orderBy(employees.lastName, employees.firstName);
}

export async function updateEmployee(id: number, data: Partial<InsertEmployee>) {
  const db = await getDb();
  if (!db) return;
  await db.update(employees).set({ ...data, updatedAt: new Date() }).where(eq(employees.id, id));
}

export async function deleteEmployee(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(employees).set({ isActive: false, updatedAt: new Date() }).where(eq(employees.id, id));
}

export async function getEmployeeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return result[0];
}

// ─── Team Assignments ─────────────────────────────────────────────────────────

export async function assignEmployeeToTeam(employeeId: number, teamId: number, assignedBy: number) {
  const db = await getDb();
  if (!db) return;
  // Close previous active assignment
  await db
    .update(teamAssignments)
    .set({ isActive: false, unassignedAt: new Date() })
    .where(and(eq(teamAssignments.employeeId, employeeId), eq(teamAssignments.isActive, true)));
  // Update employee's teamId
  await db.update(employees).set({ teamId, updatedAt: new Date() }).where(eq(employees.id, employeeId));
  // Create new assignment record
  await db.insert(teamAssignments).values({ employeeId, teamId, assignedBy, isActive: true });
}

export async function getTeamAssignmentHistory(employeeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: teamAssignments.id,
      teamId: teamAssignments.teamId,
      teamName: teams.name,
      assignedAt: teamAssignments.assignedAt,
      unassignedAt: teamAssignments.unassignedAt,
      isActive: teamAssignments.isActive,
    })
    .from(teamAssignments)
    .leftJoin(teams, eq(teamAssignments.teamId, teams.id))
    .where(eq(teamAssignments.employeeId, employeeId))
    .orderBy(desc(teamAssignments.assignedAt));
}

// ─── Timesheets ───────────────────────────────────────────────────────────────

export async function createOrGetTimesheet(managerId: number, teamId: number, workDate: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await db
    .select()
    .from(timesheets)
    .where(
      and(
        eq(timesheets.managerId, managerId),
        eq(timesheets.teamId, teamId),
        sql`${timesheets.workDate} = ${workDate}`
      )
    )
    .limit(1);
  if (existing[0]) return existing[0];
  const workDateObj = new Date(workDate + "T00:00:00Z");
  await db.insert(timesheets).values({ managerId, teamId, workDate: workDateObj, status: "draft" });
  const created = await db
    .select()
    .from(timesheets)
    .where(
      and(
        eq(timesheets.managerId, managerId),
        eq(timesheets.teamId, teamId),
        sql`${timesheets.workDate} = ${workDate}`
      )
    )
    .limit(1);
  return created[0];
}

export async function getTimesheetById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(timesheets).where(eq(timesheets.id, id)).limit(1);
  return result[0];
}

export async function getTimesheetWithEntries(id: number) {
  const db = await getDb();
  if (!db) return null;
  const ts = await db.select().from(timesheets).where(eq(timesheets.id, id)).limit(1);
  if (!ts[0]) return null;
  const entries = await db
    .select({
      id: timesheetEntries.id,
      timesheetId: timesheetEntries.timesheetId,
      employeeId: timesheetEntries.employeeId,
      hoursWorked: timesheetEntries.hoursWorked,
      overtimeHours: timesheetEntries.overtimeHours,
      workType: timesheetEntries.workType,
      notes: timesheetEntries.notes,
      employeeCode: employees.employeeCode,
      firstName: employees.firstName,
      lastName: employees.lastName,
      jobTitle: employees.jobTitle,
    })
    .from(timesheetEntries)
    .leftJoin(employees, eq(timesheetEntries.employeeId, employees.id))
    .where(eq(timesheetEntries.timesheetId, id));
  return { ...ts[0], entries };
}

export async function getAllTimesheets(filters?: {
  teamId?: number;
  managerId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.teamId) conditions.push(eq(timesheets.teamId, filters.teamId));
  if (filters?.managerId) conditions.push(eq(timesheets.managerId, filters.managerId));
  if (filters?.status) conditions.push(eq(timesheets.status, filters.status as any));
  if (filters?.startDate) conditions.push(sql`${timesheets.workDate} >= ${filters.startDate}`);
  if (filters?.endDate) conditions.push(sql`${timesheets.workDate} <= ${filters.endDate}`);

  return db
    .select({
      id: timesheets.id,
      managerId: timesheets.managerId,
      teamId: timesheets.teamId,
      workDate: timesheets.workDate,
      status: timesheets.status,
      notes: timesheets.notes,
      submittedAt: timesheets.submittedAt,
      reviewedAt: timesheets.reviewedAt,
      reviewNotes: timesheets.reviewNotes,
      createdAt: timesheets.createdAt,
      managerName: users.name,
      teamName: teams.name,
    })
    .from(timesheets)
    .leftJoin(users, eq(timesheets.managerId, users.id))
    .leftJoin(teams, eq(timesheets.teamId, teams.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(timesheets.workDate));
}

export async function getTimesheetsByManager(managerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: timesheets.id,
      teamId: timesheets.teamId,
      workDate: timesheets.workDate,
      status: timesheets.status,
      notes: timesheets.notes,
      submittedAt: timesheets.submittedAt,
      reviewedAt: timesheets.reviewedAt,
      reviewNotes: timesheets.reviewNotes,
      createdAt: timesheets.createdAt,
      teamName: teams.name,
    })
    .from(timesheets)
    .leftJoin(teams, eq(timesheets.teamId, teams.id))
    .where(eq(timesheets.managerId, managerId))
    .orderBy(desc(timesheets.workDate));
}

export async function submitTimesheet(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(timesheets)
    .set({ status: "submitted", submittedAt: new Date(), updatedAt: new Date() })
    .where(eq(timesheets.id, id));
}

export async function reviewTimesheet(
  id: number,
  status: "approved" | "flagged",
  reviewedBy: number,
  reviewNotes?: string
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(timesheets)
    .set({ status, reviewedBy, reviewNotes: reviewNotes ?? null, reviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(timesheets.id, id));
}

export async function updateTimesheetNotes(id: number, notes: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(timesheets).set({ notes, updatedAt: new Date() }).where(eq(timesheets.id, id));
}

// ─── Timesheet Entries ────────────────────────────────────────────────────────

export async function upsertTimesheetEntry(data: InsertTimesheetEntry) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await db
    .select()
    .from(timesheetEntries)
    .where(
      and(
        eq(timesheetEntries.timesheetId, data.timesheetId),
        eq(timesheetEntries.employeeId, data.employeeId)
      )
    )
    .limit(1);
  if (existing[0]) {
    await db
      .update(timesheetEntries)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(timesheetEntries.id, existing[0].id));
    return existing[0].id;
  } else {
    await db.insert(timesheetEntries).values(data);
    const created = await db
      .select()
      .from(timesheetEntries)
      .where(
        and(
          eq(timesheetEntries.timesheetId, data.timesheetId),
          eq(timesheetEntries.employeeId, data.employeeId)
        )
      )
      .limit(1);
    return created[0]?.id;
  }
}

export async function deleteTimesheetEntry(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(timesheetEntries).where(eq(timesheetEntries.id, id));
}

export async function getTimesheetEntriesForExport(startDate: string, endDate: string, teamId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [sql`${timesheets.workDate} >= ${startDate}`, sql`${timesheets.workDate} <= ${endDate}`];
  if (teamId) conditions.push(eq(timesheets.teamId, teamId));

  return db
    .select({
      workDate: timesheets.workDate,
      teamName: teams.name,
      projectSite: teams.projectSite,
      managerName: users.name,
      employeeCode: employees.employeeCode,
      firstName: employees.firstName,
      lastName: employees.lastName,
      jobTitle: employees.jobTitle,
      hoursWorked: timesheetEntries.hoursWorked,
      overtimeHours: timesheetEntries.overtimeHours,
      workType: timesheetEntries.workType,
      notes: timesheetEntries.notes,
      status: timesheets.status,
    })
    .from(timesheetEntries)
    .innerJoin(timesheets, eq(timesheetEntries.timesheetId, timesheets.id))
    .innerJoin(employees, eq(timesheetEntries.employeeId, employees.id))
    .leftJoin(teams, eq(timesheets.teamId, teams.id))
    .leftJoin(users, eq(timesheets.managerId, users.id))
    .where(and(...conditions))
    .orderBy(timesheets.workDate, teams.name, employees.lastName);
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values(data);
}

export async function getAuditLogs(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      oldValues: auditLogs.oldValues,
      newValues: auditLogs.newValues,
      createdAt: auditLogs.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

// ─── Email Notifications ──────────────────────────────────────────────────────

export async function createEmailNotification(data: {
  recipientId?: number;
  recipientEmail: string;
  subject: string;
  body: string;
  type: "submission_alert" | "review_result" | "correction_request" | "approval";
  relatedTimesheetId?: number;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(emailNotifications).values({ ...data, status: "pending" });
}

export async function markEmailSent(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(emailNotifications).set({ status: "sent", sentAt: new Date() }).where(eq(emailNotifications.id, id));
}

export async function markEmailFailed(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(emailNotifications).set({ status: "failed" }).where(eq(emailNotifications.id, id));
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { totalTeams: 0, totalEmployees: 0, totalManagers: 0, pendingTimesheets: 0, approvedToday: 0 };

  const [teamsCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(teams)
    .where(eq(teams.isActive, true));
  const [employeesCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(employees)
    .where(eq(employees.isActive, true));
  const [managersCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(and(eq(users.role, "manager"), eq(users.isActive, true)));
  const [pendingCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(timesheets)
    .where(eq(timesheets.status, "submitted"));

  const today = new Date().toISOString().split("T")[0];
  const [approvedTodayCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(timesheets)
    .where(and(eq(timesheets.status, "approved"), sql`${timesheets.workDate} >= ${today}`));

  return {
    totalTeams: Number(teamsCount?.count ?? 0),
    totalEmployees: Number(employeesCount?.count ?? 0),
    totalManagers: Number(managersCount?.count ?? 0),
    pendingTimesheets: Number(pendingCount?.count ?? 0),
    approvedToday: Number(approvedTodayCount?.count ?? 0),
  };
}
