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
import { Badge } from "@/components/ui/badge";
import { HardHat, Edit2, UserCheck, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { USER_ROLE_LABELS } from "@/lib/constants";

export default function ManagersPage() {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const { data: allUsers, isLoading } = trpc.users.all.useQuery();
  const { data: teams } = trpc.teams.all.useQuery();

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [newRole, setNewRole] = useState("");
  const [assignTeamUserId, setAssignTeamUserId] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      utils.users.all.invalidate();
      utils.users.managers.invalidate();
      setEditingUser(null);
      toast.success("Role updated successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateTeamMutation = trpc.teams.update.useMutation({
    onSuccess: () => {
      utils.teams.all.invalidate();
      setAssignTeamUserId(null);
      setSelectedTeamId("");
      toast.success("Manager assigned to team");
    },
    onError: (e) => toast.error(e.message),
  });

  const managers = allUsers?.filter((u) => u.role === "manager" || u.role === "hr_admin" || u.role === "admin") ?? [];

  const getManagerTeams = (managerId: number) =>
    teams?.filter((t) => t.managerId === managerId && t.isActive) ?? [];

  return (
    <HRLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1 w-8 rounded-full bg-accent" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Management</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Managers & Admins</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage user roles and team assignments. Users sign in via Manus OAuth.
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 flex items-start gap-3">
          <UserCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Role Assignment</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Users sign in via Manus OAuth. Assign them the "Team Manager" or "HR Admin" role here to grant access to their respective portals.
            </p>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">All System Users</h2>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : !allUsers || allUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Users className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No users have signed in yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Assigned Teams</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Last Sign In</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allUsers.map((user) => {
                    const userTeams = getManagerTeams(user.id);
                    return (
                      <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-primary text-xs font-bold">
                                {(user.name ?? user.email ?? "U").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{user.name ?? "—"}</p>
                              <p className="text-xs text-muted-foreground">{user.email ?? "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.role === "hr_admin" || user.role === "admin"
                              ? "bg-primary/10 text-primary"
                              : user.role === "manager"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {USER_ROLE_LABELS[user.role] ?? user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {userTeams.length === 0 ? (
                              <span className="text-xs text-muted-foreground/50">No teams</span>
                            ) : (
                              userTeams.map((t) => (
                                <span key={t.id} className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                                  {t.name}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                          {user.lastSignedIn
                            ? new Date(user.lastSignedIn).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setEditingUser(user); setNewRole(user.role); }}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs flex items-center gap-1"
                              title="Change role"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {user.role === "manager" && (
                              <button
                                onClick={() => { setAssignTeamUserId(user.id); setSelectedTeamId(""); }}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Assign to team"
                              >
                                <HardHat className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              User: <span className="font-medium text-foreground">{editingUser?.name ?? editingUser?.email}</span>
            </p>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User (No access)</SelectItem>
                  <SelectItem value="manager">Team Manager</SelectItem>
                  <SelectItem value="hr_admin">HR Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button
              onClick={() => updateRoleMutation.mutate({ userId: editingUser.id, role: newRole as any })}
              disabled={updateRoleMutation.isPending}
            >
              Save Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Team Dialog */}
      <Dialog open={!!assignTeamUserId} onOpenChange={(open) => !open && setAssignTeamUserId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Manager to Team</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="space-y-1.5">
              <Label>Select Team</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams?.filter((t) => t.isActive).map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTeamUserId(null)}>Cancel</Button>
            <Button
              disabled={!selectedTeamId || updateTeamMutation.isPending}
              onClick={() =>
                selectedTeamId &&
                updateTeamMutation.mutate({
                  id: parseInt(selectedTeamId),
                  managerId: assignTeamUserId!,
                })
              }
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HRLayout>
  );
}
