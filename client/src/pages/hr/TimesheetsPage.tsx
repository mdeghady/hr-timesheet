import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/hooks/useTranslation";
import { HRLayout } from "@/components/HRLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  ClipboardList,
  Eye,
  Filter,
  Flag,
  X,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function TimesheetsPage() {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const { data: teams } = trpc.teams.all.useQuery();
  const [filters, setFilters] = useState({
    teamId: "all",
    status: "all",
    startDate: "",
    endDate: "",
  });

  const queryFilters = useMemo(() => ({
    teamId: filters.teamId !== "all" ? parseInt(filters.teamId) : undefined,
    status: filters.status !== "all" ? filters.status : undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  }), [filters]);

  const { data: timesheets, isLoading } = trpc.timesheets.all.useQuery(queryFilters);

  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"approved" | "flagged">("approved");
  const [reviewNotes, setReviewNotes] = useState("");

  const reviewMutation = trpc.timesheets.review.useMutation({
    onSuccess: () => {
      utils.timesheets.all.invalidate();
      utils.timesheets.dashboardStats.invalidate();
      setReviewingId(null);
      setReviewNotes("");
      toast.success(reviewStatus === "approved" ? "Timesheet approved" : "Timesheet flagged for correction");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <HRLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1 w-8 rounded-full bg-accent" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Review</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Timesheets</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {timesheets?.length ?? 0} records found
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Filters</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Team</Label>
              <Select value={filters.teamId} onValueChange={(v) => setFilters((f) => ({ ...f, teamId: v }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams?.filter((t) => t.isActive).map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From Date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To Date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
          </div>
          {(filters.teamId !== "all" || filters.status !== "all" || filters.startDate || filters.endDate) && (
            <button
              onClick={() => setFilters({ teamId: "all", status: "all", startDate: "", endDate: "" })}
              className="mt-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : !timesheets || timesheets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <ClipboardList className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No timesheets found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Team</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Manager</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Submitted</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {timesheets.map((ts) => (
                    <tr key={ts.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {ts.workDate instanceof Date
                          ? ts.workDate.toLocaleDateString()
                          : String(ts.workDate)}
                      </td>
                      <td className="px-4 py-3 text-foreground">{ts.teamName ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{ts.managerName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={ts.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                        {ts.submittedAt ? new Date(ts.submittedAt).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/hr/timesheets/${ts.id}`}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="View details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          {ts.status === "submitted" && (
                            <>
                              <button
                                onClick={() => { setReviewingId(ts.id); setReviewStatus("approved"); setReviewNotes(""); }}
                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-muted-foreground hover:text-emerald-700 transition-colors"
                                title="Approve"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => { setReviewingId(ts.id); setReviewStatus("flagged"); setReviewNotes(""); }}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                                title="Flag for correction"
                              >
                                <Flag className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!reviewingId} onOpenChange={(open) => !open && setReviewingId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewStatus === "approved" ? "Approve Timesheet" : "Flag for Correction"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="space-y-1.5">
              <Label>Action</Label>
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
              <Label>Notes {reviewStatus === "flagged" && "(required)"}</Label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={reviewStatus === "flagged" ? "Explain what needs to be corrected…" : "Optional notes…"}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewingId(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (reviewStatus === "flagged" && !reviewNotes.trim()) {
                  return toast.error("Please provide correction notes");
                }
                reviewMutation.mutate({
                  timesheetId: reviewingId!,
                  status: reviewStatus,
                  reviewNotes: reviewNotes || undefined,
                });
              }}
              disabled={reviewMutation.isPending}
              className={reviewStatus === "flagged" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {reviewStatus === "approved" ? "Approve" : "Flag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HRLayout>
  );
}
