import { trpc } from "@/lib/trpc";
import { HRLayout } from "@/components/HRLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Building2,
  Users,
  HardHat,
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Link } from "wouter";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  href,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  href?: string;
}) {
  const content = (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">{label}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {href && (
        <p className="text-xs text-muted-foreground mt-3 group-hover:text-primary transition-colors">
          View details →
        </p>
      )}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export default function HRDashboard() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = trpc.timesheets.dashboardStats.useQuery();
  const { data: recentTimesheets } = trpc.timesheets.all.useQuery({ status: "submitted" });

  return (
    <HRLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1 w-8 rounded-full bg-accent" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{t('overview')}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t('hrDashboard')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-5 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-3" />
                <div className="h-8 bg-muted rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats && (
              <>
                <StatCard
                  label={t('activeTeams')}
                  value={stats?.totalTeams ?? 0}
                  icon={Building2}
                  color="bg-primary/10 text-primary"
                  href="/hr/teams"
                />
                <StatCard
                  label={t('employees')}
                  value={stats?.totalEmployees ?? 0}
                  icon={Users}
                  color="bg-emerald-100 text-emerald-700"
                  href="/hr/employees"
                />
                <StatCard
                  label={t('managers')}
                  value={stats?.totalManagers ?? 0}
                  icon={HardHat}
                  color="bg-blue-100 text-blue-700"
                  href="/hr/managers"
                />
                <StatCard
                  label={t('pendingReview')}
                  value={stats?.pendingTimesheets ?? 0}
                  icon={ClipboardList}
                  color={
                    (stats?.pendingTimesheets ?? 0) > 0
                      ? "bg-amber-100 text-amber-700"
                      : "bg-muted text-muted-foreground"
                  }
                  href="/hr/timesheets"
                />
              </>
            )}
          </div>
        )}

        {/* Recent Timesheets */}
        <div className="bg-card rounded-xl border border-border overflow-hidden mb-8">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h2 className="font-semibold text-foreground text-sm">{t('awaitingReview')}</h2>
            </div>
            <Link href="/hr/timesheets" className="text-xs text-primary hover:underline font-medium">
              {t('viewAll')}
            </Link>
          </div>
          {recentTimesheets && recentTimesheets.length > 0 ? (
            <div className="divide-y divide-border">
              {recentTimesheets.slice(0, 5).map((ts) => (
                <Link
                  key={ts.id}
                  href={`/hr/timesheets/${ts.id}`}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/50 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {ts.teamName ?? t('noData')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ts.managerName ?? t('manager')} · {ts.workDate instanceof Date ? ts.workDate.toLocaleDateString() : String(ts.workDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={ts.status} />
                    <span className="text-muted-foreground group-hover:text-primary transition-colors text-xs">→</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-3" />
              <p className="text-foreground font-medium text-sm">{t('allCaughtUp')}</p>
              <p className="text-muted-foreground text-xs mt-1">{t('noTimesheetsPending')}</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/hr/teams"
            className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{t('manageTeams')}</p>
              <p className="text-xs text-muted-foreground">{t('createAssign')}</p>
            </div>
          </Link>
          <Link
            href="/hr/export"
            className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{t('exportReports')}</p>
              <p className="text-xs text-muted-foreground">{t('excelDownload')}</p>
            </div>
          </Link>
          <Link
            href="/hr/audit"
            className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{t('auditTrail')}</p>
              <p className="text-xs text-muted-foreground">{t('systemActivity')}</p>
            </div>
          </Link>
        </div>
      </div>
    </HRLayout>
  );
}
