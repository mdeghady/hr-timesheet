import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  assignEmployeeToTeam,
  createAuditLog,
  createEmployee,
  createOrGetTimesheet,
  createTeam,
  deleteEmployee,
  deleteTeam,
  getAllEmployees,
  getAllHRAdmins,
  getAllManagers,
  getAllTeams,
  getAllTimesheets,
  getAllUsers,
  getAuditLogs,
  getDashboardStats,
  getEmployeeById,
  getEmployeesByTeamId,
  getTeamAssignmentHistory,
  getTeamById,
  getTeamsByManagerId,
  getTimesheetById,
  getTimesheetsByManager,
  getTimesheetWithEntries,
  reviewTimesheet,
  submitTimesheet,
  updateEmployee,
  updateTeam,
  updateTimesheetNotes,
  updateUserProfile,
  updateUserRole,
  upsertTimesheetEntry,
  deleteTimesheetEntry,
} from "./db";
import { sendTimesheetReviewNotification, sendTimesheetSubmissionAlert } from "./emailService";
import { generateTimesheetExcel } from "./excelExport";

// ─── Role Guards ──────────────────────────────────────────────────────────────

const hrAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "hr_admin" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "HR Admin access required" });
  }
  return next({ ctx });
});

const managerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "manager" && ctx.user.role !== "hr_admin" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Manager access required" });
  }
  return next({ ctx });
});

// ─── Audit Helper ─────────────────────────────────────────────────────────────

async function audit(
  userId: number,
  action: string,
  entityType: string,
  entityId?: number,
  oldValues?: unknown,
  newValues?: unknown
) {
  await createAuditLog({
    userId,
    action,
    entityType,
    entityId,
    oldValues: oldValues ? JSON.stringify(oldValues) : undefined,
    newValues: newValues ? JSON.stringify(newValues) : undefined,
  });
}

// ─── Routers ──────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Users / Managers ──────────────────────────────────────────────────────
  users: router({
    all: hrAdminProcedure.query(() => getAllUsers()),

    managers: hrAdminProcedure.query(() => getAllManagers()),

    hrAdmins: hrAdminProcedure.query(() => getAllHRAdmins()),

    updateRole: hrAdminProcedure
      .input(
        z.object({
          userId: z.number(),
          role: z.enum(["user", "admin", "hr_admin", "manager"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await updateUserRole(input.userId, input.role);
        await audit(ctx.user.id, "UPDATE_ROLE", "user", input.userId, null, { role: input.role });
        return { success: true };
      }),

    updateProfile: hrAdminProcedure
      .input(
        z.object({
          userId: z.number(),
          name: z.string().optional(),
          phone: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { userId, ...data } = input;
        await updateUserProfile(userId, data);
        await audit(ctx.user.id, "UPDATE_PROFILE", "user", userId, null, data);
        return { success: true };
      }),
  }),

  // ─── Teams ─────────────────────────────────────────────────────────────────
  teams: router({
    all: protectedProcedure.query(() => getAllTeams()),

    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getTeamById(input.id)),

    myTeams: managerProcedure.query(({ ctx }) => getTeamsByManagerId(ctx.user.id)),

    create: hrAdminProcedure
      .input(
        z.object({
          name: z.string().min(1).max(128),
          description: z.string().optional(),
          projectSite: z.string().optional(),
          managerId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await createTeam({ ...input, createdBy: ctx.user.id });
        await audit(ctx.user.id, "CREATE_TEAM", "team", undefined, null, input);
        return { success: true };
      }),

    update: hrAdminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(128).optional(),
          description: z.string().optional(),
          projectSite: z.string().optional(),
          managerId: z.number().nullable().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const old = await getTeamById(id);
        await updateTeam(id, data as any);
        await audit(ctx.user.id, "UPDATE_TEAM", "team", id, old, data);
        return { success: true };
      }),

    delete: hrAdminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const old = await getTeamById(input.id);
        await deleteTeam(input.id);
        await audit(ctx.user.id, "DELETE_TEAM", "team", input.id, old, null);
        return { success: true };
      }),
  }),

  // ─── Employees ─────────────────────────────────────────────────────────────
  employees: router({
    all: protectedProcedure.query(() => getAllEmployees()),

    byTeam: protectedProcedure
      .input(z.object({ teamId: z.number() }))
      .query(({ input }) => getEmployeesByTeamId(input.teamId)),

    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getEmployeeById(input.id)),

    assignmentHistory: hrAdminProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(({ input }) => getTeamAssignmentHistory(input.employeeId)),

    create: hrAdminProcedure
      .input(
        z.object({
          employeeCode: z.string().min(1).max(32),
          firstName: z.string().min(1).max(64),
          lastName: z.string().min(1).max(64),
          jobTitle: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().email().optional(),
          teamId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await createEmployee({ ...input, createdBy: ctx.user.id });
        if (input.teamId) {
          const emp = await getAllEmployees();
          const created = emp.find((e) => e.employeeCode === input.employeeCode);
          if (created) {
            await assignEmployeeToTeam(created.id, input.teamId, ctx.user.id);
          }
        }
        await audit(ctx.user.id, "CREATE_EMPLOYEE", "employee", undefined, null, input);
        return { success: true };
      }),

    update: hrAdminProcedure
      .input(
        z.object({
          id: z.number(),
          employeeCode: z.string().min(1).max(32).optional(),
          firstName: z.string().min(1).max(64).optional(),
          lastName: z.string().min(1).max(64).optional(),
          jobTitle: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().email().optional(),
          teamId: z.number().nullable().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const old = await getEmployeeById(id);
        await updateEmployee(id, data as any);
        if (data.teamId !== undefined && data.teamId !== null && data.teamId !== old?.teamId) {
          await assignEmployeeToTeam(id, data.teamId, ctx.user.id);
        }
        await audit(ctx.user.id, "UPDATE_EMPLOYEE", "employee", id, old, data);
        return { success: true };
      }),

    delete: hrAdminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const old = await getEmployeeById(input.id);
        await deleteEmployee(input.id);
        await audit(ctx.user.id, "DELETE_EMPLOYEE", "employee", input.id, old, null);
        return { success: true };
      }),

    assign: hrAdminProcedure
      .input(z.object({ employeeId: z.number(), teamId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await assignEmployeeToTeam(input.employeeId, input.teamId, ctx.user.id);
        await audit(ctx.user.id, "ASSIGN_EMPLOYEE", "team_assignment", input.employeeId, null, input);
        return { success: true };
      }),
  }),

  // ─── Timesheets ─────────────────────────────────────────────────────────────
  timesheets: router({
    all: hrAdminProcedure
      .input(
        z.object({
          teamId: z.number().optional(),
          managerId: z.number().optional(),
          status: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }).optional()
      )
      .query(({ input }) => getAllTimesheets(input)),

    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getTimesheetWithEntries(input.id)),

    myTimesheets: managerProcedure.query(({ ctx }) => getTimesheetsByManager(ctx.user.id)),

    dashboardStats: hrAdminProcedure.query(() => getDashboardStats()),

    // Get or create a timesheet for a given date
    getOrCreate: managerProcedure
      .input(
        z.object({
          teamId: z.number(),
          workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Validate date is not in the future
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const workDate = new Date(input.workDate);
        if (workDate > today) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot create timesheet for future dates" });
        }
        // Validate manager owns the team
        const team = await getTeamById(input.teamId);
        if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        if (team.managerId !== ctx.user.id && ctx.user.role !== "hr_admin" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "You are not the manager of this team" });
        }
        return createOrGetTimesheet(ctx.user.id, input.teamId, input.workDate);
      }),

    saveEntries: managerProcedure
      .input(
        z.object({
          timesheetId: z.number(),
          entries: z.array(
            z.object({
              employeeId: z.number(),
              hoursWorked: z.number().min(0).max(24),
              overtimeHours: z.number().min(0).max(12).optional(),
              workType: z.enum(["regular", "overtime", "holiday", "sick", "absent"]).optional(),
              notes: z.string().optional(),
            })
          ),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const ts = await getTimesheetById(input.timesheetId);
        if (!ts) throw new TRPCError({ code: "NOT_FOUND", message: "Timesheet not found" });
        if (ts.status === "approved") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot modify an approved timesheet" });
        }
        if (ts.managerId !== ctx.user.id && ctx.user.role !== "hr_admin" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        for (const entry of input.entries) {
          const workType = entry.workType ?? "regular";
          // Non-working statuses should have 0 worked hours
          const isNonWorkingStatus = ["absent", "sick", "holiday"].includes(workType);
          const finalHoursWorked = isNonWorkingStatus ? 0 : entry.hoursWorked;
          const finalOvertimeHours = isNonWorkingStatus ? 0 : (entry.overtimeHours ?? 0);

          if (finalHoursWorked + finalOvertimeHours > 24) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Total hours cannot exceed 24 per day" });
          }
          await upsertTimesheetEntry({
            timesheetId: input.timesheetId,
            employeeId: entry.employeeId,
            hoursWorked: String(finalHoursWorked),
            overtimeHours: String(finalOvertimeHours),
            workType: workType,
            notes: entry.notes,
          });
        }

        if (input.notes !== undefined) {
          await updateTimesheetNotes(input.timesheetId, input.notes);
        }

        await audit(ctx.user.id, "SAVE_ENTRIES", "timesheet", input.timesheetId, null, {
          entryCount: input.entries.length,
        });
        return { success: true };
      }),

    submit: managerProcedure
      .input(z.object({ timesheetId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const ts = await getTimesheetById(input.timesheetId);
        if (!ts) throw new TRPCError({ code: "NOT_FOUND" });
        if (ts.managerId !== ctx.user.id && ctx.user.role !== "hr_admin" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (ts.status === "approved") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Timesheet already approved" });
        }

        await submitTimesheet(input.timesheetId);
        await audit(ctx.user.id, "SUBMIT_TIMESHEET", "timesheet", input.timesheetId, { status: ts.status }, { status: "submitted" });

        // Notify HR admins
        const hrAdmins = await getAllHRAdmins();
        const team = await getTeamById(ts.teamId);
        if (hrAdmins.length > 0 && team) {
          await sendTimesheetSubmissionAlert({
            hrAdminEmails: hrAdmins.map((a) => a.email ?? "").filter(Boolean),
            hrAdminIds: hrAdmins.map((a) => a.id),
            managerName: ctx.user.name ?? "Manager",
            teamName: team.name,
            workDate: ts.workDate instanceof Date ? ts.workDate.toISOString().split("T")[0] : String(ts.workDate),
            timesheetId: input.timesheetId,
          });
        }

        return { success: true };
      }),

    review: hrAdminProcedure
      .input(
        z.object({
          timesheetId: z.number(),
          status: z.enum(["approved", "flagged"]),
          reviewNotes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const ts = await getTimesheetById(input.timesheetId);
        if (!ts) throw new TRPCError({ code: "NOT_FOUND" });

        await reviewTimesheet(input.timesheetId, input.status, ctx.user.id, input.reviewNotes);
        await audit(ctx.user.id, `REVIEW_TIMESHEET_${input.status.toUpperCase()}`, "timesheet", input.timesheetId, { status: ts.status }, { status: input.status, reviewNotes: input.reviewNotes });

        // Notify manager
        const { getUserByOpenId, getAllUsers } = await import("./db");
        const allUsers = await getAllUsers();
        const manager = allUsers.find((u) => u.id === ts.managerId);
        const team = await getTeamById(ts.teamId);

        if (manager?.email && team) {
          await sendTimesheetReviewNotification({
            managerEmail: manager.email,
            managerId: manager.id,
            managerName: manager.name ?? "Manager",
            teamName: team.name,
            workDate: ts.workDate instanceof Date ? ts.workDate.toISOString().split("T")[0] : String(ts.workDate),
            status: input.status,
            reviewNotes: input.reviewNotes,
            timesheetId: input.timesheetId,
          });
        }

        return { success: true };
      }),

    deleteEntry: managerProcedure
      .input(z.object({ entryId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await deleteTimesheetEntry(input.entryId);
        await audit(ctx.user.id, "DELETE_ENTRY", "timesheet_entry", input.entryId, null, null);
        return { success: true };
      }),
  }),

  // ─── Manager ─────────────────────────────────────────────────────────────────
  manager: router({
    myTeam: managerProcedure.query(async ({ ctx }) => {
      const teams = await getTeamsByManagerId(ctx.user.id);
      if (!teams || teams.length === 0) return null;
      const team = teams[0];
      const employees = await getEmployeesByTeamId(team.id);
      return { ...team, employees };
    }),

    recentTimesheets: managerProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const all = await getTimesheetsByManager(ctx.user.id);
        const limit = input.limit ?? 10;
        // Attach entry count
        const result = [];
        for (const ts of all.slice(0, limit)) {
          const full = await getTimesheetWithEntries(ts.id);
          result.push({ ...ts, entryCount: full?.entries?.length ?? 0, reviewNotes: full?.reviewNotes });
        }
        return result;
      }),
  }),

  // ─── Audit Logs ─────────────────────────────────────────────────────────────
  audit: router({
    logs: hrAdminProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }))
      .query(({ input }) => getAuditLogs(input.limit ?? 100, input.offset ?? 0)),
  }),

  // ─── Excel Export ────────────────────────────────────────────────────────────
  export: router({
    timesheet: hrAdminProcedure
      .input(
        z.object({
          startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          teamId: z.number().optional(),
          reportType: z.enum(["daily", "weekly", "monthly"]),
        })
      )
      .mutation(async ({ input }) => {
        const buffer = await generateTimesheetExcel(input);
        return {
          data: buffer.toString("base64"),
          filename: `timesheet_${input.reportType}_${input.startDate}_${input.endDate}.xlsx`,
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
