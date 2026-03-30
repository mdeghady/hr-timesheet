export const MAX_HOURS_PER_DAY = 16;
export const MAX_OVERTIME_HOURS = 8;

export const WORK_TYPES = ["regular", "overtime", "holiday", "sick", "absent"] as const;

export const TIMESHEET_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  flagged: "Flagged",
};

export const TIMESHEET_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  flagged: "bg-red-100 text-red-700",
};

export const USER_ROLE_LABELS: Record<string, string> = {
  user: "User",
  admin: "System Admin",
  hr_admin: "HR Admin",
  manager: "Team Manager",
};

export const WORK_TYPE_LABELS: Record<string, string> = {
  regular: "Regular",
  overtime: "Overtime",
  holiday: "Holiday",
  sickLeave: "Sick Leave",
  absent: "Absent",
  leave: "Leave",
  weekend: "Weekend",
  publicHoliday: "Public Holiday",
};
