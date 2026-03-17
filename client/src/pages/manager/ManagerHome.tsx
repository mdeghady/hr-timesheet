import { trpc } from "@/lib/trpc";
import { ManagerLayout } from "@/components/ManagerLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { ClipboardList, Users, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function ManagerHome() {
  const { user } = useAuth();
  const { isOnline, pendingCount } = useOfflineSync();
  const { data: myTeam } = trpc.manager.myTeam.useQuery();
  const { data: recentTimesheets } = trpc.manager.recentTimesheets.useQuery({ limit: 10 });

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const todaySheet = recentTimesheets?.find((ts) => {
    const d = ts.workDate instanceof Date ? ts.workDate.toISOString().split("T")[0] : String(ts.workDate);
    return d === todayStr;
  });

  return (
    <ManagerLayout>
      <div className="px-4 pt-6 pb-4">
        {/* Greeting */}
        <div className="mb-6">
          <p className="text-muted-foreground text-sm">{today}</p>
          <h1 className="text-xl font-bold text-foreground mt-0.5">
            Hello, {user?.name?.split(" ")[0] ?? "Manager"} 👋
          </h1>
        </div>

        {/* Today's Status */}
        <div className={`rounded-2xl p-5 mb-5 ${
          todaySheet?.status === "approved"
            ? "bg-emerald-50 border border-emerald-200"
            : todaySheet?.status === "submitted"
            ? "bg-amber-50 border border-amber-200"
            : todaySheet?.status === "flagged"
            ? "bg-red-50 border border-red-200"
            : "bg-primary/5 border border-primary/20"
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Today's Timesheet</p>
              {!todaySheet ? (
                <>
                  <p className="font-semibold text-foreground">Not submitted yet</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {myTeam?.employees?.length ?? 0} employees to log
                  </p>
                </>
              ) : (
                <>
                  <p className={`font-semibold capitalize ${
                    todaySheet.status === "approved" ? "text-emerald-700"
                    : todaySheet.status === "submitted" ? "text-amber-700"
                    : todaySheet.status === "flagged" ? "text-red-700"
                    : "text-foreground"
                  }`}>
                    {todaySheet.status === "approved" ? "Approved ✓"
                     : todaySheet.status === "submitted" ? "Submitted — Pending Review"
                     : todaySheet.status === "flagged" ? "Needs Correction"
                     : todaySheet.status}
                  </p>
                  {todaySheet.status === "flagged" && todaySheet.reviewNotes && (
                    <p className="text-xs text-red-600 mt-1">{todaySheet.reviewNotes}</p>
                  )}
                </>
              )}
            </div>
            {!todaySheet ? (
              <Link
                href="/manager/timesheet"
                className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded-xl hover:bg-primary/90 transition-colors"
              >
                Submit <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : todaySheet.status === "flagged" ? (
              <Link
                href={`/manager/timesheet?edit=${todaySheet.id}`}
                className="flex items-center gap-1 bg-red-600 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-red-700 transition-colors"
              >
                Fix <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <CheckCircle2 className={`w-6 h-6 ${todaySheet.status === "approved" ? "text-emerald-500" : "text-amber-500"}`} />
            )}
          </div>
        </div>

        {/* Offline Pending */}
        {pendingCount > 0 && isOnline && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-800">Syncing offline entries</p>
              <p className="text-xs text-blue-600">{pendingCount} entries queued for sync</p>
            </div>
          </div>
        )}

        {/* Team Summary */}
        <div className="bg-card rounded-2xl border border-border p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">My Team</span>
            </div>
            {myTeam?.name && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {myTeam.name}
              </span>
            )}
          </div>

          {!myTeam ? (
            <div className="text-center py-4">
              <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No team assigned yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Contact HR to get assigned to a team.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myTeam.employees?.slice(0, 5).map((emp) => (
                <div key={emp.id} className="flex items-center gap-3 py-1.5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary text-xs font-bold">
                      {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {emp.firstName} {emp.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{emp.jobTitle ?? emp.employeeCode}</p>
                  </div>
                </div>
              ))}
              {(myTeam.employees?.length ?? 0) > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{(myTeam.employees?.length ?? 0) - 5} more employees
                </p>
              )}
              {(myTeam.employees?.length ?? 0) === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No employees assigned to this team.</p>
              )}
            </div>
          )}
        </div>

        {/* Recent Timesheets */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Recent Submissions</span>
            </div>
            <Link href="/manager/history" className="text-xs text-primary hover:underline font-medium">
              View all
            </Link>
          </div>

          {!recentTimesheets || recentTimesheets.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-muted-foreground">No submissions yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentTimesheets.slice(0, 5).map((ts) => {
                const dateStr = ts.workDate instanceof Date
                  ? ts.workDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
                  : String(ts.workDate);
                return (
                  <div key={ts.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      ts.status === "approved" ? "bg-emerald-500"
                      : ts.status === "submitted" ? "bg-amber-500"
                      : ts.status === "flagged" ? "bg-red-500"
                      : "bg-muted-foreground"
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{dateStr}</p>
                      <p className="text-xs text-muted-foreground capitalize">{ts.status}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {ts.entryCount ?? 0} entries
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ManagerLayout>
  );
}
