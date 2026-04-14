import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/hooks/useTranslation";
import { ManagerLayout } from "@/components/ManagerLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Users, AlertTriangle } from "lucide-react";
import { Link, useParams } from "wouter";
import { WORK_TYPES } from "@/lib/constants";

export default function ManagerTimesheetDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: ts, isLoading } = trpc.timesheets.byId.useQuery({ id: parseInt(id) });

  if (isLoading) {
    return (
      <ManagerLayout>
        <div className="px-4 pt-6 space-y-4 animate-pulse">
          <div className="h-6 bg-muted rounded w-40" />
          <div className="h-24 bg-muted rounded-2xl" />
          <div className="h-48 bg-muted rounded-2xl" />
        </div>
      </ManagerLayout>
    );
  }

  if (!ts) {
    return (
      <ManagerLayout>
        <div className="px-4 pt-6 text-center">
          <p className="text-muted-foreground text-sm">Timesheet not found.</p>
          <Link href="/manager/history" className="text-primary text-sm hover:underline mt-2 block">
            ← Back to History
          </Link>
        </div>
      </ManagerLayout>
    );
  }

  const totalHours = ts.entries?.reduce((sum, e) => sum + parseFloat(String(e.hoursWorked)), 0) ?? 0;
  const totalOvertime = ts.entries?.reduce((sum, e) => sum + parseFloat(String(e.overtimeHours ?? 0)), 0) ?? 0;

  const dateStr = ts.workDate instanceof Date
    ? ts.workDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : String(ts.workDate);

  return (
    <ManagerLayout>
      <div className="px-4 pt-6 pb-4">
        {/* Back */}
        <Link href="/manager/history" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to History
        </Link>

        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status={ts.status} />
          </div>
          <h1 className="text-lg font-bold text-foreground">{dateStr}</h1>
        </div>

        {/* Flagged Notice */}
        {ts.status === "flagged" && ts.reviewNotes && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Correction Required</p>
              <p className="text-xs text-red-700 mt-1">{ts.reviewNotes}</p>
              <Link
                href={`/manager/timesheet?edit=${ts.id}`}
                className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-red-700 hover:underline"
              >
                Edit & Resubmit →
              </Link>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Employees", value: ts.entries?.length ?? 0, icon: Users },
            { label: "Total Hrs", value: `${totalHours.toFixed(1)}h`, icon: Clock },
            { label: "Overtime", value: `${totalOvertime.toFixed(1)}h`, icon: Clock },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-card rounded-xl border border-border p-3 text-center">
              <p className="text-base font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Manager Notes */}
        {ts.notes && (
          <div className="bg-muted/50 rounded-2xl p-4 mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Your Notes</p>
            <p className="text-sm text-foreground">{ts.notes}</p>
          </div>
        )}

        {/* Entries */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Employee Hours</p>
          </div>
          {!ts.entries || ts.entries.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-muted-foreground">No entries recorded.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {ts.entries.map((entry) => {
                const isAbsent = entry.workType === "absent" || entry.workType === "sick";
                return (
                  <div key={entry.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary text-xs font-bold">
                        {(entry.firstName ?? "?").charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {entry.firstName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded capitalize">
                          {entry.workType}
                        </span>
                        {entry.notes && (
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">{entry.notes}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {isAbsent ? (
                        <span className="text-xs text-red-600 font-medium">—</span>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-foreground">
                            {parseFloat(String(entry.hoursWorked)).toFixed(1)}h
                          </p>
                          {parseFloat(String(entry.overtimeHours ?? 0)) > 0 && (
                            <p className="text-xs text-amber-600">
                              +{parseFloat(String(entry.overtimeHours)).toFixed(1)}h OT
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Resubmit if flagged */}
        {ts.status === "flagged" && (
          <div className="mt-4">
            <Link href={`/manager/timesheet?edit=${ts.id}`}>
              <Button className="w-full">Edit & Resubmit</Button>
            </Link>
          </div>
        )}
      </div>
    </ManagerLayout>
  );
}
