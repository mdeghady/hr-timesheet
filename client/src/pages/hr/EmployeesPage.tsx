import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/hooks/useTranslation";
import { HRLayout } from "@/components/HRLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Edit2, Plus, Search, Trash2, UserCheck, Users } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

type EmployeeForm = {
  employeeCode: string;
  firstName: string;
  jobTitle: string;
  phone: string;
  email: string;
  teamId: string;
  employeeStatus?: string;
};

const emptyForm: EmployeeForm = {
  employeeCode: "",
  firstName: "",
  jobTitle: "",
  phone: "",
  email: "",
  teamId: "",
};

export default function EmployeesPage() {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const { data: employees, isLoading } = trpc.employees.all.useQuery();
  const { data: teams } = trpc.teams.all.useQuery();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [filterTeam, setFilterTeam] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Extract unique statuses from employees
  const uniqueStatuses = useMemo(() => {
    if (!employees) return [];
    const statuses = new Set<string>();
    employees.forEach((e) => {
      if (e.employeeStatus) statuses.add(e.employeeStatus);
    });
    return Array.from(statuses).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    if (!employees) return [];
    return employees.filter((e) => {
      if (!e.isActive) return false;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        e.firstName.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        (e.jobTitle ?? "").toLowerCase().includes(q);
      const matchTeam = filterTeam === "all" || (filterTeam === "unassigned" ? !e.teamId : String(e.teamId) === filterTeam);
      const matchStatus = filterStatus === "all" || e.employeeStatus === filterStatus;
      return matchSearch && matchTeam && matchStatus;
    });
  }, [employees, search, filterTeam, filterStatus]);

  const createMutation = trpc.employees.create.useMutation({
    onSuccess: () => {
      utils.employees.all.invalidate();
      setShowForm(false);
      setForm(emptyForm);
      toast.success("Employee added successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.employees.update.useMutation({
    onSuccess: () => {
      utils.employees.all.invalidate();
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.success("Employee updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.employees.delete.useMutation({
    onSuccess: () => {
      utils.employees.all.invalidate();
      setDeleteId(null);
      toast.success("Employee deactivated");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.employeeCode.trim()) return toast.error("Employee code is required");
    if (!form.firstName.trim()) return toast.error("First name is required");

    const payload = {
      employeeCode: form.employeeCode.trim(),
      firstName: form.firstName.trim(),
      jobTitle: form.jobTitle || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      teamId: form.teamId && form.teamId !== "none" ? parseInt(form.teamId) : undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEdit = (emp: any) => {
    setForm({
      employeeCode: emp.employeeCode,
      firstName: emp.firstName,
      jobTitle: emp.jobTitle ?? "",
      phone: emp.phone ?? "",
      email: emp.email ?? "",
      teamId: emp.teamId ? String(emp.teamId) : "",
      employeeStatus: emp.employeeStatus ?? "",
    });
    setEditingId(emp.id);
    setShowForm(true);
  };

  return (
    <HRLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-1 w-8 rounded-full bg-accent" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Management</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Employees</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {employees?.filter((e) => e.isActive).length ?? 0} active employees
            </p>
          </div>
          <Button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Employee
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, code, or job title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterTeam} onValueChange={setFilterTeam}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {teams?.filter((t) => t.isActive).map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {uniqueStatuses.map((status) => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-foreground font-medium text-sm">No employees found</p>
              <p className="text-muted-foreground text-xs mt-1">
                {search || filterTeam !== "all" ? "Try adjusting your filters." : "Add your first employee to get started."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Code</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Job Title</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden xl:table-cell">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Team</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Contact</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((emp) => (
                    <tr key={emp.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                          {emp.employeeCode}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary text-xs font-bold">
                              {emp.firstName.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-foreground">
                            {emp.firstName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {emp.jobTitle ?? <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs hidden xl:table-cell">
                        {emp.employeeStatus ? (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                            {emp.employeeStatus}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {emp.teamName ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                            {emp.teamName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50 text-xs">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                        {emp.email ?? emp.phone ?? <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(emp)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteId(emp.id)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) { setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Employee" : "Add New Employee"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee Code *</Label>
              <Input
                value={form.employeeCode}
                onChange={(e) => setForm((f) => ({ ...f, employeeCode: e.target.value }))}
                placeholder="EMP-001"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Job Title</Label>
              <Input
                value={form.jobTitle}
                onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                placeholder="Carpenter"
              />
            </div>
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                placeholder="John"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Employee Status</Label>
              <div className="px-3 py-2 rounded-md border border-input bg-background text-sm text-muted-foreground flex items-center">
                {form.employeeStatus || <span className="text-muted-foreground/50">—</span>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+1 555 0100"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="john@example.com"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Assign to Team</Label>
              <Select
                value={form.teamId}
                onValueChange={(v) => setForm((f) => ({ ...f, teamId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team</SelectItem>
                  {teams?.filter((t) => t.isActive).map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? "Save Changes" : "Add Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the employee record. Timesheet history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </HRLayout>
  );
}
