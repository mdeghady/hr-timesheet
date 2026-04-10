import { ManagerLayout } from "@/components/ManagerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useTranslation } from "@/hooks/useTranslation";
import { WORK_TYPES, MAX_HOURS_PER_DAY } from "@/lib/constants";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Save,
  Send,
  WifiOff,
  Trash2,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface EntryState {
  employeeId: number;
  hoursWorked: string;
  overtimeHours: string;
  workType: string;
  notes: string;
}

export default function TimesheetSubmitPage() {
  const { t, language } = useTranslation();
  const utils = trpc.useUtils();
  const { isOnline, addOfflineEntry, markSynced } = useOfflineSync();
  const { data: myTeam } = trpc.manager.myTeam.useQuery();

  const today = new Date().toISOString().split("T")[0];
  const [workDate, setWorkDate] = useState(today);
  const [timesheetId, setTimesheetId] = useState<number | null>(null);
  const [entries, setEntries] = useState<EntryState[]>([]);
  const [notes, setNotes] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>("draft");

  const getOrCreateMutation = trpc.timesheets.getOrCreate.useMutation({
    onSuccess: (ts) => {
      setTimesheetId(ts.id);
      setCurrentStatus(ts.status);
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: existingTs } = trpc.timesheets.byId.useQuery(
    { id: timesheetId! },
    { enabled: !!timesheetId }
  );

  const saveEntriesMutation = trpc.timesheets.saveEntries.useMutation({
    onSuccess: () => {
      utils.timesheets.byId.invalidate({ id: timesheetId! });
      utils.manager.recentTimesheets.invalidate();
      toast.success(t('success'));
    },
    onError: (e) => toast.error(e.message),
  });

  const submitMutation = trpc.timesheets.submit.useMutation({
    onSuccess: () => {
      utils.manager.recentTimesheets.invalidate();
      utils.timesheets.byId.invalidate({ id: timesheetId! });
      setCurrentStatus("submitted");
      toast.success(t('timesheetSubmittedSuccess'));
    },
    onError: (e) => toast.error(e.message),
  });

  // Initialize entries when team loads
  useEffect(() => {
    if (myTeam?.employees && entries.length === 0) {
      setEntries(
        myTeam.employees.map((emp) => ({
          employeeId: emp.id,
          hoursWorked: "8",
          overtimeHours: "0",
          workType: "regular",
          notes: "",
        }))
      );
    }
  }, [myTeam]);

  // Get or create timesheet on date change
  useEffect(() => {
    if (myTeam?.id) {
      getOrCreateMutation.mutate({ teamId: myTeam.id, workDate });
    }
  }, [workDate, myTeam?.id]);

  const handleEntryChange = useCallback(
    (employeeId: number, field: keyof EntryState, value: string) => {
      setEntries((prev) =>
        prev.map((e) =>
          e.employeeId === employeeId ? { ...e, [field]: value } : e
        )
      );
    },
    []
  );

  const toggleExpanded = (employeeId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) {
        next.delete(employeeId);
      } else {
        next.add(employeeId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!timesheetId) return;
    setIsSubmitting(true);
    try {
      await saveEntriesMutation.mutateAsync({
        timesheetId,
        entries: entries.map((e) => ({
          employeeId: e.employeeId,
          hoursWorked: parseFloat(e.hoursWorked) || 0,
          overtimeHours: parseFloat(e.overtimeHours) || 0,
          workType: e.workType as "regular" | "overtime" | "holiday" | "sick" | "absent",
          notes: e.notes,
        })),
        notes,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!timesheetId) return;

    // Validate hours
    for (const entry of entries) {
      const total = parseFloat(entry.hoursWorked) + parseFloat(entry.overtimeHours);
      if (total > MAX_HOURS_PER_DAY) {
        toast.error(t('maxHoursPerDay'));
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Save first, then submit
      await saveEntriesMutation.mutateAsync({
        timesheetId,
        entries: entries.map((e) => ({
          employeeId: e.employeeId,
          hoursWorked: parseFloat(e.hoursWorked) || 0,
          overtimeHours: parseFloat(e.overtimeHours) || 0,
          workType: e.workType as "regular" | "overtime" | "holiday" | "sick" | "absent",
          notes: e.notes,
        })),
        notes,
      });

      await submitMutation.mutateAsync({ timesheetId });

      if (!isOnline) {
        toast.success(t('timesheetSavedOffline'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const workDateDisplay = new Date(workDate).toLocaleDateString(
    language === 'ar' ? 'ar-SA' : 'en-US',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  );

  const getWorkTypeLabel = (type: string) => {
    switch (type) {
      case 'regular':
        return t('workTypeRegular');
      case 'overtime':
        return t('workTypeOvertime');
      case 'holiday':
        return t('workTypeHoliday');
      case 'sickLeave':
        return t('workTypeSickLeave');
      case 'absent':
        return t('workTypeAbsent');
      case 'leave':
        return t('workTypeLeave');
      case 'weekend':
        return t('workTypeWeekend');
      case 'publicHoliday':
        return t('workTypePublicHoliday');
      default:
        return type;
    }
  };

  return (
    <ManagerLayout>
      <div className="px-4 pt-6 pb-32 sm:pb-20">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('submitDailyTimesheet')}</h1>
          <p className="text-sm text-muted-foreground">{workDateDisplay}</p>
        </div>

        {/* Connection Status */}
        {!isOnline && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700">{t('offlineMode')}</span>
          </div>
        )}

        {/* Date Selector */}
        <div className="mb-6">
          <Label className="text-sm font-medium text-foreground mb-2 block">
            {t('workDate')}
          </Label>
          <Input
            type="date"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
            max={today}
            className="bg-background border-border"
          />
        </div>

        {/* Status */}
        {currentStatus && (
          <div className="mb-6">
            <StatusBadge status={currentStatus} />
          </div>
        )}

        {/* Employees List */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('teamMembers')}</h2>

          {!myTeam?.employees || myTeam.employees.length === 0 ? (
            <div className="text-center py-8 bg-card rounded-lg border border-border">
              <p className="text-muted-foreground">{t('noEmployeesInTeam')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myTeam.employees.map((employee) => {
                const entry = entries.find((e) => e.employeeId === employee.id);
                const isExpanded = expandedIds.has(employee.id);
                const totalHours = parseFloat(entry?.hoursWorked || "0") + parseFloat(entry?.overtimeHours || "0");
                const exceedsMax = totalHours > MAX_HOURS_PER_DAY;

                return (
                  <div key={employee.id} className="bg-card rounded-lg border border-border overflow-hidden">
                    {/* Collapsed View */}
                    <button
                      onClick={() => toggleExpanded(employee.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{employee.firstName}</p>
                        <p className="text-xs text-muted-foreground">{employee.jobTitle}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">{totalHours}h</p>
                          {exceedsMax && (
                            <AlertTriangle className="w-4 h-4 text-red-500 inline-block" />
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Expanded View */}
                    {isExpanded && entry && (
                      <div className="border-t border-border p-4 bg-muted/30 space-y-4">
                        {/* Work Type */}
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                            {t('workType')}
                          </Label>
                          <Select
                            value={entry.workType}
                            onValueChange={(value) =>
                              handleEntryChange(employee.id, "workType", value)
                            }
                          >
                            <SelectTrigger className="bg-background border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {WORK_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {getWorkTypeLabel(type)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Hours - Only show for working statuses */}
                        {!['absent', 'sick', 'holiday'].includes(entry.workType) && (
                          <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                                {t('hoursWorked')}
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                max="24"
                                step="0.5"
                                value={entry.hoursWorked}
                                onChange={(e) =>
                                  handleEntryChange(employee.id, "hoursWorked", e.target.value)
                                }
                                className="bg-background border-border"
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                                {t('overtimeHours')}
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                max="24"
                                step="0.5"
                                value={entry.overtimeHours}
                                onChange={(e) =>
                                  handleEntryChange(employee.id, "overtimeHours", e.target.value)
                                }
                                className="bg-background border-border"
                              />
                            </div>
                          </div>
                        )}

                        {/* Non-working status indicator */}
                        {['absent', 'sick', 'holiday'].includes(entry.workType) && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 animate-in fade-in duration-200">
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                            <p className="text-sm text-blue-700">{t('hoursSetToZero')}</p>
                          </div>
                        )}

                        {/* Notes */}
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                            {t('notes')} ({t('optional')})
                          </Label>
                          <Textarea
                            value={entry.notes}
                            onChange={(e) =>
                              handleEntryChange(employee.id, "notes", e.target.value)
                            }
                            placeholder={t('addNotes')}
                            className="bg-background border-border text-sm"
                            rows={2}
                          />
                        </div>

                        {/* Validation */}
                        {exceedsMax && (
                          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            {t('maxHoursPerDay')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* General Notes */}
        <div className="mb-6">
          <Label className="text-sm font-medium text-foreground mb-2 block">
            {t('notes')} ({t('optional')})
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('addNotes')}
            className="bg-background border-border"
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border flex flex-col-reverse sm:flex-row gap-3 sm:justify-end z-50">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isSubmitting}
            className="w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {t('save')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || currentStatus === 'submitted' || currentStatus === 'approved'}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary/90"
          >
            <Send className="w-4 h-4" />
            {t('submitForReview')}
          </Button>
        </div>
      </div>
    </ManagerLayout>
  );
}
