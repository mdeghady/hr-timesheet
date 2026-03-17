import { trpc } from "@/lib/trpc";
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
import { Building2, Edit2, MapPin, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type TeamForm = {
  name: string;
  description: string;
  projectSite: string;
  managerId: string;
};

const emptyForm: TeamForm = { name: "", description: "", projectSite: "", managerId: "" };

export default function TeamsPage() {
  const utils = trpc.useUtils();
  const { data: teams, isLoading } = trpc.teams.all.useQuery();
  const { data: managers } = trpc.users.managers.useQuery();
  const { data: employees } = trpc.employees.all.useQuery();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<TeamForm>(emptyForm);

  const createMutation = trpc.teams.create.useMutation({
    onSuccess: () => {
      utils.teams.all.invalidate();
      setShowForm(false);
      setForm(emptyForm);
      toast.success("Team created successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.teams.update.useMutation({
    onSuccess: () => {
      utils.teams.all.invalidate();
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.success("Team updated successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.teams.delete.useMutation({
    onSuccess: () => {
      utils.teams.all.invalidate();
      setDeleteId(null);
      toast.success("Team deactivated");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error("Team name is required");
    const payload = {
      name: form.name.trim(),
      description: form.description || undefined,
      projectSite: form.projectSite || undefined,
      managerId: form.managerId ? parseInt(form.managerId) : undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEdit = (team: any) => {
    setForm({
      name: team.name,
      description: team.description ?? "",
      projectSite: team.projectSite ?? "",
      managerId: team.managerId ? String(team.managerId) : "",
    });
    setEditingId(team.id);
    setShowForm(true);
  };

  const getTeamEmployeeCount = (teamId: number) =>
    employees?.filter((e) => e.teamId === teamId && e.isActive).length ?? 0;

  return (
    <HRLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-1 w-8 rounded-full bg-accent" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Management</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Teams</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {teams?.filter((t) => t.isActive).length ?? 0} active teams
            </p>
          </div>
          <Button
            onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Team
          </Button>
        </div>

        {/* Teams Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-5 animate-pulse">
                <div className="h-4 bg-muted rounded w-32 mb-3" />
                <div className="h-3 bg-muted rounded w-24 mb-4" />
                <div className="h-3 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        ) : teams?.filter((t) => t.isActive).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium">No teams yet</p>
            <p className="text-muted-foreground text-sm mt-1">Create your first team to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams?.filter((t) => t.isActive).map((team) => (
              <div
                key={team.id}
                className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(team)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(team.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-foreground mb-1">{team.name}</h3>
                {team.description && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{team.description}</p>
                )}

                <div className="space-y-1.5 mt-3 pt-3 border-t border-border">
                  {team.projectSite && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{team.projectSite}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{getTeamEmployeeCount(team.id)} employees</span>
                  </div>
                  {team.managerName && (
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3.5 h-3.5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary text-[8px] font-bold">M</span>
                      </div>
                      <span className="text-foreground font-medium">{team.managerName}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) { setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Team" : "Create New Team"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Team Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Foundation Crew A"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site">Project Site</Label>
              <Input
                id="site"
                value={form.projectSite}
                onChange={(e) => setForm((f) => ({ ...f, projectSite: e.target.value }))}
                placeholder="e.g. Downtown Tower Block 3"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Description</Label>
              <Input
                id="desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Assign Manager</Label>
              <Select
                value={form.managerId}
                onValueChange={(v) => setForm((f) => ({ ...f, managerId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No manager</SelectItem>
                  {managers?.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name ?? m.email ?? `User #${m.id}`}
                    </SelectItem>
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
              {editingId ? "Save Changes" : "Create Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Team?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the team. Existing timesheet data will be preserved.
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
