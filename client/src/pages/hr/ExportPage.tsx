import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/hooks/useTranslation";
import { HRLayout } from "@/components/HRLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileSpreadsheet, Calendar, BarChart3 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ReportType = "daily" | "weekly" | "monthly";

function getDateRange(type: ReportType): { start: string; end: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  if (type === "daily") {
    return { start: fmt(today), end: fmt(today) };
  }
  if (type === "weekly") {
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: fmt(monday), end: fmt(sunday) };
  }
  // monthly
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { start: fmt(start), end: fmt(end) };
}

export default function ExportPage() {
  const { t } = useTranslation();
  const { data: teams } = trpc.teams.all.useQuery();
  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [teamId, setTeamId] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const exportMutation = trpc.export.timesheet.useMutation({
    onSuccess: (data) => {
      // Decode base64 and trigger download
      const bytes = atob(data.data);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const blob = new Blob([arr], { type: data.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleExport = () => {
    const range = useCustom
      ? { start: customStart, end: customEnd }
      : getDateRange(reportType);

    if (!range.start || !range.end) {
      return toast.error("Please select a date range");
    }
    if (range.start > range.end) {
      return toast.error("Start date must be before end date");
    }

    exportMutation.mutate({
      startDate: range.start,
      endDate: range.end,
      teamId: teamId !== "all" ? parseInt(teamId) : undefined,
      reportType,
    });
  };

  const presets: { type: ReportType; label: string; desc: string; icon: React.ElementType }[] = [
    { type: "daily", label: "Daily Report", desc: "Today's timesheet entries", icon: Calendar },
    { type: "weekly", label: "Weekly Report", desc: "Current week Mon–Sun", icon: BarChart3 },
    { type: "monthly", label: "Monthly Report", desc: "Current calendar month", icon: FileSpreadsheet },
  ];

  return (
    <HRLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1 w-8 rounded-full bg-accent" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Reports</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Export Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Download timesheet data as formatted Excel spreadsheets.
          </p>
        </div>

        {/* Report Type Selector */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {presets.map(({ type, label, desc, icon: Icon }) => (
            <button
              key={type}
              onClick={() => { setReportType(type); setUseCustom(false); }}
              className={`p-4 rounded-xl border text-left transition-all duration-150 ${
                reportType === type && !useCustom
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <Icon className={`w-5 h-5 mb-2 ${reportType === type && !useCustom ? "text-primary" : "text-muted-foreground"}`} />
              <p className={`text-sm font-medium ${reportType === type && !useCustom ? "text-primary" : "text-foreground"}`}>
                {label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </button>
          ))}
        </div>

        {/* Custom Range */}
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="custom"
              checked={useCustom}
              onChange={(e) => setUseCustom(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="custom" className="text-sm font-medium text-foreground cursor-pointer">
              Custom date range
            </label>
          </div>

          {useCustom ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {(() => {
                const range = getDateRange(reportType);
                return `Period: ${range.start} → ${range.end}`;
              })()}
            </div>
          )}
        </div>

        {/* Team Filter */}
        <div className="bg-card rounded-xl border border-border p-5 mb-8">
          <div className="space-y-1.5">
            <Label>Filter by Team (optional)</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger>
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
        </div>

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={exportMutation.isPending}
          size="lg"
          className="w-full gap-2"
        >
          {exportMutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Generating Report…
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download Excel Report
            </>
          )}
        </Button>

        {/* Info */}
        <div className="mt-6 bg-muted/50 rounded-xl p-4">
          <p className="text-xs font-medium text-foreground mb-2">What's included in the export:</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• All timesheet entries for the selected period</li>
            <li>• Employee names, codes, and job titles</li>
            <li>• Hours worked, overtime, and work type per employee</li>
            <li>• Team, project site, and manager information</li>
            <li>• Timesheet approval status</li>
            <li>• Summary sheet with team-level totals</li>
          </ul>
        </div>
      </div>
    </HRLayout>
  );
}
