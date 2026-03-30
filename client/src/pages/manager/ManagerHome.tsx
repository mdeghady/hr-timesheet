import { useTranslation } from "@/hooks/useTranslation";
import { ManagerLayout } from "@/components/ManagerLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { trpc } from "@/lib/trpc";
import { ClipboardList, Users, CheckCircle2, AlertTriangle, ArrowRight, Wifi, WifiOff } from "lucide-react";
import { Link } from "wouter";

export default function ManagerHome() {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const { isOnline, pendingCount } = useOfflineSync();
  const { data: myTeam } = trpc.manager.myTeam.useQuery();
  const { data: recentTimesheets } = trpc.manager.recentTimesheets.useQuery({ limit: 10 });

  const today = new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const todaySheet = recentTimesheets?.find((ts) => {
    const d = ts.workDate instanceof Date ? ts.workDate.toISOString().split("T")[0] : String(ts.workDate);
    return d === todayStr;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-emerald-50 border border-emerald-200";
      case "submitted":
        return "bg-amber-50 border border-amber-200";
      case "flagged":
        return "bg-red-50 border border-red-200";
      default:
        return "bg-primary/5 border border-primary/20";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "approved":
        return `${t('approved')} ✓`;
      case "submitted":
        return t('submitted');
      case "flagged":
        return t('flagged');
      default:
        return status;
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case "approved":
        return "text-emerald-700";
      case "submitted":
        return "text-amber-700";
      case "flagged":
        return "text-red-700";
      default:
        return "text-foreground";
    }
  };

  return (
    <ManagerLayout>
      <div className="px-4 pt-6 pb-4">
        {/* Greeting */}
        <div className="mb-6">
          <p className="text-muted-foreground text-sm">{today}</p>
          <h1 className="text-xl font-bold text-foreground mt-0.5">
            {language === 'ar' ? `مرحباً، ${user?.name?.split(" ")[0] ?? "مدير"} 👋` : `Hello, ${user?.name?.split(" ")[0] ?? "Manager"} 👋`}
          </h1>
        </div>

        {/* Connection Status */}
        {pendingCount > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700">
              {t('pendingSync')}: {pendingCount} {t('timesheetSubmittedSuccess')}
            </span>
          </div>
        )}

        {/* Today's Status */}
        <div className={`rounded-2xl p-5 mb-5 ${getStatusColor(todaySheet?.status || '')}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground mb-1">{t('dailyTimesheet')}</p>
              {!todaySheet ? (
                <>
                  <p className="font-semibold text-foreground">{language === 'ar' ? 'لم يتم الإرسال بعد' : 'Not submitted yet'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {myTeam?.employees?.length ?? 0} {t('teamMembers')}
                  </p>
                </>
              ) : (
                <>
                  <p className={`font-semibold capitalize ${getStatusTextColor(todaySheet.status)}`}>
                    {getStatusText(todaySheet.status)}
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
                className="text-primary hover:text-primary/80 transition-colors"
              >
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            )}
          </div>
        </div>

        {/* Team Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">{t('totalTeamMembers')}</p>
              <Users className="w-4 h-4 text-primary/60" />
            </div>
            <p className="text-2xl font-bold text-foreground">{myTeam?.employees?.length ?? 0}</p>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">{t('pendingSubmissions')}</p>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {recentTimesheets?.filter(ts => ts.status === 'submitted').length ?? 0}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">{t('quickActions')}</h2>
          <div className="space-y-2">
            <Link
              href="/manager/timesheet"
              className="flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ClipboardList className="w-5 h-5 text-primary" />
                <span className="font-medium text-foreground">{t('submitDailyTimesheet')}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </Link>

            <Link
              href="/manager/history"
              className="flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <span className="font-medium text-foreground">{t('timesheetHistory')}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>
        </div>

        {/* Recent Submissions */}
        {recentTimesheets && recentTimesheets.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">{t('recentSubmissions')}</h2>
              <Link href="/manager/history" className="text-xs text-primary hover:text-primary/80">
                {t('viewFullHistory')} →
              </Link>
            </div>

            <div className="space-y-2">
              {recentTimesheets.slice(0, 3).map((sheet) => {
                const workDate = sheet.workDate instanceof Date 
                  ? sheet.workDate.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
                  : new Date(sheet.workDate).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US');

                return (
                  <Link
                    key={sheet.id}
                    href={`/manager/timesheet/${sheet.id}`}
                    className="p-3 bg-card rounded-lg border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{workDate}</p>
                        <p className="text-xs text-muted-foreground">{sheet.entryCount} {t('timesheetEntries')}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        sheet.status === 'approved' ? 'bg-emerald-100 text-emerald-700'
                        : sheet.status === 'submitted' ? 'bg-amber-100 text-amber-700'
                        : sheet.status === 'flagged' ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                      }`}>
                        {getStatusText(sheet.status)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!myTeam?.employees || myTeam.employees.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('noEmployeesInTeam')}</p>
          </div>
        )}
      </div>
    </ManagerLayout>
  );
}
