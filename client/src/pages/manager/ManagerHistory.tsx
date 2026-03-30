import { useTranslation } from "@/hooks/useTranslation";
import { ManagerLayout } from "@/components/ManagerLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { trpc } from "@/lib/trpc";
import { ClipboardList, ChevronRight, AlertTriangle, Filter } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ManagerHistory() {
  const { t, language } = useTranslation();
  const { data: timesheets, isLoading } = trpc.timesheets.myTimesheets.useQuery();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredTimesheets = timesheets?.filter((ts) => {
    if (statusFilter === "all") return true;
    return ts.status === statusFilter;
  }) ?? [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-emerald-500";
      case "submitted":
        return "bg-amber-500";
      case "flagged":
        return "bg-red-500";
      default:
        return "bg-muted-foreground";
    }
  };

  return (
    <ManagerLayout>
      <div className="px-4 pt-6 pb-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1 w-6 rounded-full bg-accent" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              {t('timesheetHistory')}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t('timesheetHistory')}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {filteredTimesheets.length} {t('timesheetSubmittedSuccess')}
          </p>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <label className="text-sm font-medium text-foreground">{t('filterByStatus')}</label>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allStatuses')}</SelectItem>
              <SelectItem value="draft">{t('draft')}</SelectItem>
              <SelectItem value="submitted">{t('submitted')}</SelectItem>
              <SelectItem value="approved">{t('approved')}</SelectItem>
              <SelectItem value="flagged">{t('flagged')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredTimesheets.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-foreground font-medium">
              {statusFilter === "all" ? t('noSubmissions') : `${t('noSubmissions')} (${statusFilter})`}
            </p>
            <p className="text-muted-foreground text-sm mt-1">{t('emptyHistory')}</p>
          </div>
        ) : (
          /* Timesheets List */
          <div className="space-y-2">
            {filteredTimesheets.map((ts) => {
              const dateStr = ts.workDate instanceof Date
                ? ts.workDate.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : new Date(ts.workDate).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });

              return (
                <Link
                  key={ts.id}
                  href={`/manager/history/${ts.id}`}
                  className="flex items-center gap-4 bg-card rounded-2xl border border-border p-4 hover:border-primary/30 hover:shadow-sm transition-all group"
                >
                  {/* Status Indicator */}
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getStatusColor(ts.status)}`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{dateStr}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge status={ts.status} />
                      {ts.status === "flagged" && ts.reviewNotes && (
                        <span className="text-xs text-red-600 truncate max-w-[150px]">
                          {ts.reviewNotes}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="text-xs text-muted-foreground">{t('submissionDate')}</p>
                    {ts.reviewedAt && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(ts.reviewedAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    )}
                  </div>

                  {/* Chevron */}
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        )}

        {/* Stats Footer */}
        {timesheets && timesheets.length > 0 && (
          <div className="mt-8 pt-6 border-t border-border">
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">
                  {timesheets.filter((ts) => ts.status === "approved").length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{t('approved')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {timesheets.filter((ts) => ts.status === "submitted").length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{t('submitted')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {timesheets.filter((ts) => ts.status === "flagged").length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{t('flagged')}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </ManagerLayout>
  );
}
