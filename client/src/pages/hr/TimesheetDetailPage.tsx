import { trpc } from "@/lib/trpc";
import { HRLayout } from "@/components/HRLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Calendar, Clock, User, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useParams } from "wouter";
import { WORK_TYPES } from "@/lib/constants";

export default function TimesheetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();
  const { data: ts, isLoading } = trpc.timesheets.byId.useQuery({ id: parseInt(id) });

  const [reviewStatus, setReviewStatus] = useState<"approved" | "flagged">("approved");
  const [reviewNotes, setReviewNotes] = useState("");
  const [showReview, setShowReview] = useState(false);

  const reviewMutation = trpc.timesheets.review.useMutation({
    onSuccess: () => {
      utils.timesheets.byId.invalidate({ id: parseInt(id) });
      utils.timesheets.all.invalidate();
      setShowReview(false);
      setReviewNotes("");
      toast.success(reviewStatus === "approved" ? "Timesheet approved" : "Flagged for correction");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <HRLayout>
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-48" />
            <div className="h-32 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </HRLayout>
    );
  }

  if (!ts) {
    return (
      <HRLayout>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Timesheet not found.</p>
          <Link href="/hr/timesheets" className="text-primary text-sm hover:underline mt-2 block">← Back to Timesheets</Link>
        </div>
      </HRLayout>
    );
  }

  const totalHours = ts.entries?.reduce((sum, e) => sum + parseFloat(String(e.hoursWorked)), 0) ?? 0;
  const totalOvertime = ts.entries?.reduce((sum, e) => sum + parseFloat(String(e.overtimeHours ?? 0)), 0) ?? 0;

  return (
    <HRLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Back */}
        <Link href="/hr/timesheets" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Timesheets
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <StatusBadge status={ts.status} />
              <span className="text-xs text-muted-foreground">#{ts.id}</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">Timesheet Detail</h1>
          </div>
          {ts.status === "submitted" && !showReview && (
            <Button onClick={() => setShowReview(true)} size="sm">
              Review Timesheet
            </Button>
          )}
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: Calendar, label: "Work Date", value: ts.workDate instanceof Date ? ts.workDate.toLocaleDateString() : String(ts.workDate) },
            { icon: Clock, label: "Total Hours", value: `${totalHours.toFixed(1)}h` },
            { icon: Clock, label: "Overtime", value: `${totalOvertime.toFixed(1)}h` },
            { icon: Users, label: "Employees", value: ts.entries?.length ?? 0 },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className="text-lg font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {/* Notes */}
        {ts.notes && (
          <div className="bg-muted/50 rounded-xl p-4 mb-6">
            <p className="text-xs font-medium text-muted-foreground mb-1">Manager Notes</p>
            <p className="text-sm text-foreground">{ts.notes}</p>
          </div>
        )}

        {/* Review Notes */}
        {ts.reviewNotes && (
          <div className={`rounded-xl p-4 mb-6 border ${ts.status === "approved" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            <p className={`text-xs font-medium mb-1 ${ts.status === "approved" ? "text-emerald-700" : "text-red-700"}`}>
              HR Review Notes
            </p>
            <p className="text-sm text-foreground">{ts.reviewNotes}</p>
          </div>
        )}

        {/* Review Form */}
        {showReview && (
          <div className="bg-card rounded-xl border border-border p-5 mb-6">
            <h3 className="font-semibold text-foreground mb-4">Submit Review</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Decision</Label>
                <Select value={reviewStatus} onValueChange={(v: any) => setReviewStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approve</SelectItem>
                    <SelectItem value="flagged">Flag for Correction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Notes {reviewStatus === "flagged" && "*"}</Label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={reviewStatus === "flagged" ? "Describe what needs correction…" : "Optional notes…"}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (reviewStatus === "flagged" && !reviewNotes.trim()) {
                      return toast.error("Please provide correction notes");
                    }
                    reviewMutation.mutate({
                      timesheetId: ts.id,
                      status: reviewStatus,
                      reviewNotes: reviewNotes || undefined,
                    });
                  }}
                  disabled={reviewMutation.isPending}
                  className={reviewStatus === "flagged" ? "bg-destructive hover:bg-destructive/90" : ""}
                >
                  {reviewStatus === "approved" ? "Approve Timesheet" : "Flag for Correction"}
                </Button>
                <Button variant="outline" onClick={() => setShowReview(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}

        {/* Entries Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">Employee Hours</h2>
          </div>
          {!ts.entries || ts.entries.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No entries recorded.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employee</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Job Title</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Work Type</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hours</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Overtime</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ts.entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary text-xs font-bold">
                              {(entry.firstName ?? "?").charAt(0)}{(entry.lastName ?? "?").charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-xs">{entry.firstName} {entry.lastName}</p>
                            <p className="text-muted-foreground text-xs font-mono">{entry.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{entry.jobTitle ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded capitalize">
                          {WORK_TYPES.find((w) => w.value === entry.workType)?.label ?? entry.workType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">
                        {parseFloat(String(entry.hoursWorked)).toFixed(1)}h
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {parseFloat(String(entry.overtimeHours ?? 0)) > 0
                          ? `${parseFloat(String(entry.overtimeHours)).toFixed(1)}h`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                        {entry.notes ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30">
                    <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Totals</td>
                    <td className="px-4 py-3 text-right font-bold text-foreground">{totalHours.toFixed(1)}h</td>
                    <td className="px-4 py-3 text-right font-bold text-muted-foreground">{totalOvertime.toFixed(1)}h</td>
                    <td className="hidden md:table-cell" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </HRLayout>
  );
}
