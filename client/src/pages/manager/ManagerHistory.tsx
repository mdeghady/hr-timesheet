import { trpc } from "@/lib/trpc";
import { ManagerLayout } from "@/components/ManagerLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { ClipboardList, ChevronRight, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

export default function ManagerHistory() {
  const { data: timesheets, isLoading } = trpc.timesheets.myTimesheets.useQuery();

  return (
    <ManagerLayout>
      <div className="px-4 pt-6 pb-4">
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1 w-6 rounded-full bg-accent" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Records</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Submission History</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {timesheets?.length ?? 0} total submissions
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : !timesheets || timesheets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-foreground font-medium">No submissions yet</p>
            <p className="text-muted-foreground text-sm mt-1">Your submitted timesheets will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {timesheets.map((ts) => {
              const dateStr = ts.workDate instanceof Date
                ? ts.workDate.toLocaleDateString("en-US", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : String(ts.workDate);

              return (
                <Link
                  key={ts.id}
                  href={`/manager/history/${ts.id}`}
                  className="flex items-center gap-4 bg-card rounded-2xl border border-border p-4 hover:border-primary/30 hover:shadow-sm transition-all group"
                >
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    ts.status === "approved" ? "bg-emerald-500"
                    : ts.status === "submitted" ? "bg-amber-500"
                    : ts.status === "flagged" ? "bg-red-500"
                    : "bg-muted-foreground"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{dateStr}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge status={ts.status} />
                      {ts.status === "flagged" && (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </ManagerLayout>
  );
}
