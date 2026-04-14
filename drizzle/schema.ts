import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  date,
  index,
} from "drizzle-orm/mysql-core";

// ─── Users (HR Admins + Managers) ────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "hr_admin", "manager"]).default("user").notNull(),
  phone: varchar("phone", { length: 32 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Teams ────────────────────────────────────────────────────────────────────
export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  projectSite: varchar("projectSite", { length: 256 }),
  managerId: int("managerId").references(() => users.id, { onDelete: "set null" }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdBy: int("createdBy").references(() => users.id, { onDelete: "set null" }),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

// ─── Employees ────────────────────────────────────────────────────────────────
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  employeeCode: varchar("employeeCode", { length: 32 }).notNull().unique(),
  firstName: varchar("firstName", { length: 64 }).notNull(),
  jobTitle: varchar("jobTitle", { length: 128 }),
  employeeStatus: varchar("employeeStatus", { length: 128 }),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  teamId: int("teamId").references(() => teams.id, { onDelete: "set null" }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdBy: int("createdBy").references(() => users.id, { onDelete: "set null" }),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

// ─── Team Assignments (history of employee-team membership) ──────────────────
export const teamAssignments = mysqlTable(
  "team_assignments",
  {
    id: int("id").autoincrement().primaryKey(),
    employeeId: int("employeeId").notNull().references(() => employees.id, { onDelete: "cascade" }),
    teamId: int("teamId").notNull().references(() => teams.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assignedAt").defaultNow().notNull(),
    unassignedAt: timestamp("unassignedAt"),
    assignedBy: int("assignedBy").references(() => users.id, { onDelete: "set null" }),
    isActive: boolean("isActive").default(true).notNull(),
  },
  (t) => [
    index("idx_ta_employee").on(t.employeeId),
    index("idx_ta_team").on(t.teamId),
  ]
);

export type TeamAssignment = typeof teamAssignments.$inferSelect;
export type InsertTeamAssignment = typeof teamAssignments.$inferInsert;

// ─── Timesheets (one per manager per date) ────────────────────────────────────
export const timesheets = mysqlTable(
  "timesheets",
  {
    id: int("id").autoincrement().primaryKey(),
    managerId: int("managerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    teamId: int("teamId").notNull().references(() => teams.id, { onDelete: "cascade" }),
    workDate: date("workDate").notNull(),
    status: mysqlEnum("status", ["draft", "submitted", "approved", "flagged"]).default("draft").notNull(),
    notes: text("notes"),
    reviewedBy: int("reviewedBy").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewedAt"),
    reviewNotes: text("reviewNotes"),
    submittedAt: timestamp("submittedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("idx_ts_manager").on(t.managerId),
    index("idx_ts_team").on(t.teamId),
    index("idx_ts_date").on(t.workDate),
    index("idx_ts_status").on(t.status),
  ]
);

export type Timesheet = typeof timesheets.$inferSelect;
export type InsertTimesheet = typeof timesheets.$inferInsert;

// ─── Timesheet Entries (per employee per timesheet) ───────────────────────────
export const timesheetEntries = mysqlTable(
  "timesheet_entries",
  {
    id: int("id").autoincrement().primaryKey(),
    timesheetId: int("timesheetId").notNull().references(() => timesheets.id, { onDelete: "cascade" }),
    employeeId: int("employeeId").notNull().references(() => employees.id, { onDelete: "cascade" }),
    hoursWorked: decimal("hoursWorked", { precision: 4, scale: 2 }).notNull(),
    overtimeHours: decimal("overtimeHours", { precision: 4, scale: 2 }).default("0"),
    workType: mysqlEnum("workType", ["regular", "overtime", "holiday", "sick", "absent"]).default("regular").notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("idx_te_timesheet").on(t.timesheetId),
    index("idx_te_employee").on(t.employeeId),
  ]
);

export type TimesheetEntry = typeof timesheetEntries.$inferSelect;
export type InsertTimesheetEntry = typeof timesheetEntries.$inferInsert;

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 64 }).notNull(),
    entityType: varchar("entityType", { length: 64 }).notNull(),
    entityId: int("entityId"),
    oldValues: text("oldValues"),
    newValues: text("newValues"),
    ipAddress: varchar("ipAddress", { length: 64 }),
    userAgent: text("userAgent"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    index("idx_al_user").on(t.userId),
    index("idx_al_entity").on(t.entityType, t.entityId),
    index("idx_al_created").on(t.createdAt),
  ]
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ─── Email Notifications Log ──────────────────────────────────────────────────
export const emailNotifications = mysqlTable(
  "email_notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    recipientId: int("recipientId").references(() => users.id, { onDelete: "set null" }),
    recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
    subject: varchar("subject", { length: 256 }).notNull(),
    body: text("body").notNull(),
    type: mysqlEnum("type", ["submission_alert", "review_result", "correction_request", "approval"]).notNull(),
    relatedTimesheetId: int("relatedTimesheetId").references(() => timesheets.id, { onDelete: "set null" }),
    sentAt: timestamp("sentAt"),
    status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    index("idx_en_recipient").on(t.recipientId),
    index("idx_en_status").on(t.status),
  ]
);

export type EmailNotification = typeof emailNotifications.$inferSelect;
export type InsertEmailNotification = typeof emailNotifications.$inferInsert;
