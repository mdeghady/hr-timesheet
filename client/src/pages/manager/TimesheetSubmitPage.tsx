import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/hooks/useTranslation";
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
import { WORK_TYPES, MAX_HOURS_PER_DAY } from "@/lib/constants";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Save,
  Send,
  WifiOff,
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
  const { t } = useTranslation();
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
      toast.success("Entries saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const submitMutation = trpc.timesheets.submit.useMutation({
    onSuccess: () => {
      utils.manager.recentTimesheets.invalidate();
      utils.timesheets.byId.invalidate({ id: timesheetId! });
      setCurrentStatus("submitted");
      toast.success("Timesheet submitted successfully!");
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

  // Load existing entries when timesheet loads
  useEffect(() => {
    if (existingTs?.entries && existingTs.entries.length > 0) {
      setCurrentStatus(existingTs.status);
      setNotes(existingTs.notes ?? "");
      const loaded = existingTs.entries.map((e) => ({
        employeeId: e.employeeId,
        hoursWorked: String(parseFloat(String(e.hoursWorked))),
        overtimeHours: String(parseFloat(String(e.overtimeHours ?? 0))),
        workType: e.workType,
        notes: e.notes ?? "",
      }));
      // Merge with employees not yet in entries
      if (myTeam?.employees) {
        const loadedIds = new Set(loaded.map((e) => e.employeeId));
        const missing = myTeam.employees
          .filter((emp) => !loadedIds.has(emp.id))
          .map((emp) => ({
            employeeId: emp.id,
            hoursWorked: "8",
            overtimeHours: "0",
            workType: "regular",
            notes: "",
          }));
        setEntries([...loaded, ...missing]);
      } else {
        setEntries(loaded);
      }
    }
  }, [existingTs]);

  const handleDateChange = (date: string) => {
    setWorkDate(date);
    setTimesheetId(null);
    setCurrentStatus("draft");
    // Reset entries to defaults
    if (myTeam?.employees) {
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
  };

  const loadTimesheet = useCallback(() => {
    if (!myTeam) return toast.error("No team assigned");
    getOrCreateMutation.mutate({ teamId: myTeam.id, workDate });
  }, [myTeam, workDate]);

  const updateEntry = (employeeId: number, field: keyof EntryState, value: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.employeeId === employeeId ? { ...e, [field]: value } : e))
    );
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const validateEntries = () => {
    for (const entry of entries) {
      const hours = parseFloat(entry.hoursWorked);
      const overtime = parseFloat(entry.overtimeHours);
      if (isNaN(hours) || hours < 0) return "Hours worked must be a positive number";
      if (hours + overtime > MAX_HOURS_PER_DAY) return `Total hours cannot exceed ${MAX_HOURS_PER_DAY}`;
    }
    return null;
  };

  const handleSave = async () => {
    const error = validateEntries();
    if (error) return toast.error(error);

    if (!isOnline) {
      // Save to localStorage
      for (const entry of entries) {
        addOfflineEntry({
          employeeId: entry.employeeId,
          hoursWorked: parseFloat(entry.hoursWorked),
          overtimeHours: parseFloat(entry.overtimeHours),
          workType: entry.workType,
          notes: entry.notes,
          workDate,
          teamId: myTeam!.id,
        });
      }
      toast.success("Saved offline — will sync when connected");
      return;
    }

    if (!timesheetId) {
      await loadTimesheet();
      return;
    }

    saveEntriesMutation.mutate({
      timesheetId,
      entries: entries.map((e) => ({
        employeeId: e.employeeId,
        hoursWorked: parseFloat(e.hoursWorked),
        overtimeHours: parseFloat(e.overtimeHours),
        workType: e.workType as any,
        notes: e.notes || undefined,
      })),
      notes: notes || undefined,
    });
  };

  const handleSubmit = async () => {
    const error = validateEntries();
    if (error) return toast.error(error);
    if (!timesheetId) return toast.error("Please save entries first");

    setIsSubmitting(true);
    // Save first, then submit
    await new Promise<void>((resolve, reject) => {
      saveEntriesMutation.mutate(
        {
          timesheetId,
          entries: entries.map((e) => ({
            employeeId: e.employeeId,
            hoursWorked: parseFloat(e.hoursWorked),
            overtimeHours: parseFloat(e.overtimeHours),
            workType: e.workType as any,
            notes: e.notes || undefined,
          })),
          notes: notes || undefined,
        },
        { onSuccess: () => resolve(), onError: (e) => reject(e) }
      );
    }).catch((e) => {
      setIsSubmitting(false);
      toast.error(e.message);
      return;
    });

    submitMutation.mutate({ timesheetId }, {
      onSettled: () => setIsSubmitting(false),
    });
  };

  const totalHours = entries.reduce((sum, e) => sum + (parseFloat(e.hoursWorked) || 0), 0);
  const totalOvertime = entries.reduce((sum, e) => sum + (parseFloat(e.overtimeHours) || 0), 0);
  const isApproved = currentStatus === "approved";
  const isReadOnly = isApproved;

  return (
    <ManagerLayout>
      <div className="px-4 pt-6 pb-4">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1 w-6 rounded-full bg-accent" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Daily Entry</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Submit Timesheet</h1>
          {myTeam && (
            <p className="text-sm text-muted-foreground mt-0.5">{myTeam.name}</p>
          )}
        </div>

        {/* No team warning */}
        {!myTeam && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">No team assigned</p>
              <p className="text-xs text-amber-700 mt-0.5">Contact HR to get assigned to a team before submitting timesheets.</p>
            </div>
          </div>
        )}

        {/* Date Selector */}
        <div className="bg-card rounded-2xl border border-border p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Work Date</Label>
              <Input
                type="date"
                value={workDate}
                max={today}
                onChange={(e) => handleDateChange(e.target.value)}
                className="h-10"
              />
            </div>
            {!timesheetId && myTeam && (
              <div className="pt-5">
                <Button
                  onClick={loadTimesheet}
                  disabled={getOrCreateMutation.isPending}
                  size="sm"
                >
                  Load
                </Button>
              </div>
            )}
            {timesheetId && (
              <div className="pt-5">
                <StatusBadge status={currentStatus} />
              </div>
            )}
          </div>
        </div>

        {/* Approved banner */}
        {isApproved && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-800 font-medium">This timesheet has been approved by HR.</p>
          </div>
        )}

        {/* Offline banner */}
        {!isOnline && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700">Offline mode — entries will sync automatically when connected.</p>
          </div>
        )}

        {/* Summary Bar */}
        {entries.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Employees", value: entries.length },
              { label: "Total Hrs", value: totalHours.toFixed(1) },
              { label: "Overtime", value: totalOvertime.toFixed(1) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-card rounded-xl border border-border p-3 text-center">
                <p className="text-lg font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Employee Entries */}
        {entries.length > 0 && myTeam?.employees && (
          <div className="space-y-3 mb-4">
            {entries.map((entry) => {
              const emp = myTeam.employees!.find((e) => e.id === entry.employeeId);
              if (!emp) return null;
              const isExpanded = expandedIds.has(emp.id);
              const hours = parseFloat(entry.hoursWorked) || 0;
              const overtime = parseFloat(entry.overtimeHours) || 0;
              const isAbsent = entry.workType === "absent" || entry.workType === "sick";

              return (
                <div
                  key={emp.id}
                  className={`bg-card rounded-2xl border transition-all duration-150 ${
                    isAbsent ? "border-red-200" : "border-border"
                  }`}
                >
                  {/* Collapsed Row */}
                  <button
                    onClick={() => toggleExpand(emp.id)}
                    className="w-full flex items-center gap-3 p-4 text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary text-xs font-bold">
                        {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {emp.firstName} {emp.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{emp.jobTitle ?? emp.employeeCode}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isAbsent ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full capitalize">
                          {entry.workType}
                        </span>
                      ) : (
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">{hours}h</p>
                          {overtime > 0 && (
                            <p className="text-xs text-amber-600">+{overtime}h OT</p>
                          )}
                        </div>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Form */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Work Type</Label>
                        <Select
                          value={entry.workType}
                          onValueChange={(v) => updateEntry(emp.id, "workType", v)}
                          disabled={isReadOnly}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WORK_TYPES.map((wt) => (
                              <SelectItem key={wt.value} value={wt.value}>{wt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {!isAbsent && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Hours Worked</Label>
                            <Input
                              type="number"
                              min="0"
                              max="24"
                              step="0.5"
                              value={entry.hoursWorked}
                              onChange={(e) => updateEntry(emp.id, "hoursWorked", e.target.value)}
                              disabled={isReadOnly}
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Overtime Hrs</Label>
                            <Input
                              type="number"
                              min="0"
                              max="12"
                              step="0.5"
                              value={entry.overtimeHours}
                              onChange={(e) => updateEntry(emp.id, "overtimeHours", e.target.value)}
                              disabled={isReadOnly}
                              className="h-9"
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <Label className="text-xs">Notes (optional)</Label>
                        <Input
                          value={entry.notes}
                          onChange={(e) => updateEntry(emp.id, "notes", e.target.value)}
                          placeholder="Any remarks…"
                          disabled={isReadOnly}
                          className="h-9"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Timesheet Notes */}
        {timesheetId && !isReadOnly && (
          <div className="bg-card rounded-2xl border border-border p-4 mb-4">
            <Label className="text-xs text-muted-foreground mb-2 block">Timesheet Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any general notes for HR…"
              rows={2}
              className="resize-none"
            />
          </div>
        )}

        {/* Action Buttons */}
        {myTeam && entries.length > 0 && !isReadOnly && (
          <div className="space-y-3">
            {currentStatus !== "submitted" && (
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={saveEntriesMutation.isPending}
                className="w-full gap-2"
              >
                {!isOnline ? (
                  <>
                    <WifiOff className="w-4 h-4" />
                    Save Offline
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Draft
                  </>
                )}
              </Button>
            )}

            {timesheetId && currentStatus !== "submitted" && isOnline && (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || submitMutation.isPending}
                className="w-full gap-2"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? "Submitting…" : "Submit to HR"}
              </Button>
            )}

            {currentStatus === "submitted" && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                <Clock className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                <p className="text-sm font-medium text-amber-800">Submitted — Awaiting HR Review</p>
              </div>
            )}
          </div>
        )}

        {/* Load prompt */}
        {myTeam && !timesheetId && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-3">Select a date and tap Load to begin.</p>
            <Button onClick={loadTimesheet} disabled={getOrCreateMutation.isPending} className="gap-2">
              <Clock className="w-4 h-4" />
              Load Timesheet
            </Button>
          </div>
        )}
      </div>
    </ManagerLayout>
  );
}
