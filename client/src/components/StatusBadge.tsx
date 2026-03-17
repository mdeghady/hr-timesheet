import { cn } from "@/lib/utils";
import { TIMESHEET_STATUS_LABELS } from "@/lib/constants";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 border border-slate-200",
  submitted: "bg-amber-50 text-amber-700 border border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  flagged: "bg-red-50 text-red-700 border border-red-200",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        statusStyles[status] ?? "bg-gray-100 text-gray-600",
        className
      )}
    >
      {TIMESHEET_STATUS_LABELS[status] ?? status}
    </span>
  );
}
