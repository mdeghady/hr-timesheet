import { trpc } from "@/lib/trpc";
import { HRLayout } from "@/components/HRLayout";
import { ScrollText, User, Clock } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  CREATE_TEAM: "bg-emerald-100 text-emerald-700",
  UPDATE_TEAM: "bg-blue-100 text-blue-700",
  DELETE_TEAM: "bg-red-100 text-red-700",
  CREATE_EMPLOYEE: "bg-emerald-100 text-emerald-700",
  UPDATE_EMPLOYEE: "bg-blue-100 text-blue-700",
  DELETE_EMPLOYEE: "bg-red-100 text-red-700",
  ASSIGN_EMPLOYEE: "bg-purple-100 text-purple-700",
  SUBMIT_TIMESHEET: "bg-amber-100 text-amber-700",
  SAVE_ENTRIES: "bg-slate-100 text-slate-700",
  REVIEW_TIMESHEET_APPROVED: "bg-emerald-100 text-emerald-700",
  REVIEW_TIMESHEET_FLAGGED: "bg-red-100 text-red-700",
  UPDATE_ROLE: "bg-indigo-100 text-indigo-700",
  UPDATE_PROFILE: "bg-blue-100 text-blue-700",
  DELETE_ENTRY: "bg-red-100 text-red-700",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE_TEAM: "Team Created",
  UPDATE_TEAM: "Team Updated",
  DELETE_TEAM: "Team Deactivated",
  CREATE_EMPLOYEE: "Employee Added",
  UPDATE_EMPLOYEE: "Employee Updated",
  DELETE_EMPLOYEE: "Employee Deactivated",
  ASSIGN_EMPLOYEE: "Employee Assigned",
  SUBMIT_TIMESHEET: "Timesheet Submitted",
  SAVE_ENTRIES: "Entries Saved",
  REVIEW_TIMESHEET_APPROVED: "Timesheet Approved",
  REVIEW_TIMESHEET_FLAGGED: "Timesheet Flagged",
  UPDATE_ROLE: "Role Changed",
  UPDATE_PROFILE: "Profile Updated",
  DELETE_ENTRY: "Entry Deleted",
};

export default function AuditPage() {
  const { data: logs, isLoading } = trpc.audit.logs.useQuery({ limit: 200 });

  return (
    <HRLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1 w-8 rounded-full bg-accent" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">System</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Audit Trail</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Complete history of all system actions and changes.
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Recent Activity</span>
            <span className="ml-auto text-xs text-muted-foreground">{logs?.length ?? 0} records</span>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <ScrollText className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No audit records yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log) => {
                let newVals: any = null;
                try { newVals = log.newValues ? JSON.parse(log.newValues) : null; } catch {}

                return (
                  <div key={log.id} className="flex items-start gap-4 px-6 py-3.5 hover:bg-muted/30 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[log.action] ?? "bg-muted text-muted-foreground"}`}>
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          on <span className="font-medium text-foreground capitalize">{log.entityType.replace(/_/g, " ")}</span>
                          {log.entityId ? ` #${log.entityId}` : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          by <span className="font-medium text-foreground">{log.userName ?? "System"}</span>
                        </span>
                        {newVals && Object.keys(newVals).length > 0 && (
                          <span className="text-xs text-muted-foreground truncate max-w-xs">
                            {Object.entries(newVals)
                              .slice(0, 3)
                              .map(([k, v]) => `${k}: ${String(v)}`)
                              .join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </HRLayout>
  );
}
