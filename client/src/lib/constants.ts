export const MAX_HOURS_PER_DAY = 16;
export const MAX_OVERTIME_HOURS = 8;

export const WORK_TYPES = [
  { value: "regular", label: "Regular" },
  { value: "overtime", label: "Overtime" },
  { value: "holiday", label: "Holiday" },
  { value: "sick", label: "Sick Leave" },
  { value: "absent", label: "Absent" },
] as const;

export const TIMESHEET_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  flagged: "Needs Correction",
};

export const TIMESHEET_STATUS_COLORS: Record<string, string> = {
  draft: "badge-draft",
  submitted: "badge-submitted",
  approved: "badge-approved",
  flagged: "badge-flagged",
};

export const USER_ROLE_LABELS: Record<string, string> = {
  user: "User",
  admin: "System Admin",
  hr_admin: "HR Admin",
  manager: "Team Manager",
};
