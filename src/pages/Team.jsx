import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Plus, Search, Mail, Lock, Edit3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import UserAvatar from "../components/shared/UserAvatar";
import PhoneInput from "../components/shared/PhoneInput";
import EditMemberContactModal from "../components/shared/EditMemberContactModal";
import ResetPasswordModal from "../components/shared/ResetPasswordModal";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import { useToast } from "@/components/ui/use-toast";

export default function Team() {
  const { currentUser, isAdmin, canManageTeam } = useCurrentUser();
  const { toast } = useToast();
  const [members, setMembers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editContact, setEditContact] = useState(null);
  const [resetPassword, setResetPassword] = useState(null);
  const [tempPassword, setTempPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [confirmReset, setConfirmReset] = useState(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", whatsapp: "", department: "", role: "operator" });

  useEffect(() => {
    Promise.all([
      base44.entities.TeamMember.list(),
      base44.entities.Department.list(),
    ]).then(([m, d]) => {
      setMembers(m);
      setDepartments(d);
      setLoading(false);
    });
  }, []);

  // Submit protected action as PendingApproval (maker-checker)
  const submitApproval = async (action_type, payload) => {
    const approval = await base44.entities.PendingApproval.create({
      action_type,
      initiated_by_email: currentUser.email,
      initiated_by_name: currentUser.name,
      payload,
      status: "pending",
    });
    // Notify other admins
    await base44.functions.invoke("sendApprovalRequest", { approval });
    return approval;
  };

  const handleAdd = async () => {
    setSubmitting(true);
    try {
      await submitApproval("ADD_TEAM_MEMBER", { ...form });
      setShowAdd(false);
      setForm({ name: "", email: "", whatsapp: "", department: "", role: "operator" });
      toast({
        title: "Request submitted",
        description: "All other admins have been notified to approve this request.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditContact = async (contactData) => {
    const member = editContact;
    await submitApproval("EDIT_TEAM_MEMBER", { id: member.id, name: member.name, ...contactData });
    toast({
      title: "Edit request submitted",
      description: "Another admin must approve before changes take effect.",
    });
  };

  const handleDeactivate = async () => {
    const member = confirmDeactivate;
    setSubmitting(true);
    try {
      await submitApproval("DEACTIVATE_TEAM_MEMBER", { id: member.id, name: member.name });
      setConfirmDeactivate(null);
      toast({
        title: "Deactivation request submitted",
        description: "Another admin must approve before this member is deactivated.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (member) => {
    setResettingPassword(true);
    try {
      const response = await base44.functions.invoke("resetTeamMemberPassword", { memberId: member.id });
      setResetPassword(member);
      setTempPassword(response.data.tempPassword);
      setConfirmReset(null);
    } catch {
      toast({ title: "Error", description: "Failed to reset password", variant: "destructive" });
    } finally {
      setResettingPassword(false);
    }
  };

  const filtered = members
    .filter((m) => deptFilter === "all" || m.department === deptFilter)
    .filter((m) => m.name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase()));

  const uniqueDepts = [...new Set(members.map((m) => m.department).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">{members.length} members across {uniqueDepts.length} departments</p>
        </div>
        {canManageTeam && (
          <Button onClick={() => { setForm({ name: "", email: "", whatsapp: "", department: "", role: "operator" }); setShowAdd(true); }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
            <Plus className="h-4 w-4 mr-2" /> Add Member
          </Button>
        )}
      </div>

      {!canManageTeam && (
        <div className="text-xs text-muted-foreground bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3">
          Contact an admin to make changes to team members.
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-10 pr-4 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-all" />
        </div>
        <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg border border-white/[0.06] p-0.5">
          <button onClick={() => setDeptFilter("all")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${deptFilter === "all" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            All
          </button>
          {uniqueDepts.map((d) => (
            <button key={d} onClick={() => setDeptFilter(d)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${deptFilter === d ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Table — desktop */}
      <div className="glass-card rounded-xl overflow-hidden hidden md:block">
        <div className={`grid gap-3 py-2.5 px-5 border-b border-white/[0.06] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider ${canManageTeam ? "grid-cols-[1fr_100px_120px_120px_70px_120px]" : "grid-cols-[1fr_100px_120px_120px_70px]"}`}>
          <span>Name</span><span>Role</span><span>Department</span><span>WhatsApp</span><span>Status</span>
          {canManageTeam && <span>Actions</span>}
        </div>
        {filtered.map((member) => (
          <div key={member.id} className={`grid gap-3 items-center py-3 px-5 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors ${canManageTeam ? "grid-cols-[1fr_100px_120px_120px_70px_120px]" : "grid-cols-[1fr_100px_120px_120px_70px]"}`}>
            <div className="flex items-center gap-3 min-w-0">
              <UserAvatar name={member.name} color={member.avatar_color} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                <p className="text-xs text-muted-foreground truncate">{member.email}</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground capitalize">{member.role}</span>
            <span className="text-xs text-muted-foreground">{member.department}</span>
            <span className="text-xs text-muted-foreground font-mono">{member.whatsapp || "—"}</span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${member.status === "active" ? "text-emerald-400" : "text-amber-400"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${member.status === "active" ? "bg-emerald-400" : "bg-amber-400"}`} />
              {member.status === "active" ? "Active" : "Away"}
            </span>
            {canManageTeam && (
              <div className="flex items-center gap-1">
                <button onClick={() => setEditContact(member)} className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors" title="Edit Contact Info">
                  <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => setConfirmReset(member)} className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors" title="Reset Password">
                  <Lock className="h-3.5 w-3.5 text-amber-400" />
                </button>
                <a href={`mailto:${member.email}`} className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
                <button onClick={() => setConfirmDeactivate(member)} className="p-1.5 rounded-md hover:bg-amber-500/10 transition-colors" title="Deactivate Member">
                  <Trash2 className="h-3.5 w-3.5 text-amber-400" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Cards — mobile */}
      <div className="md:hidden space-y-3">
        {filtered.map((member) => (
          <div key={member.id} className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <UserAvatar name={member.name} color={member.avatar_color} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>
              </div>
              {canManageTeam && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setEditContact(member)} className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors">
                    <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => setConfirmReset(member)} className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors">
                    <Lock className="h-3.5 w-3.5 text-amber-400" />
                  </button>
                  <a href={`mailto:${member.email}`} className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                  <button onClick={() => setConfirmDeactivate(member)} className="p-1.5 rounded-md hover:bg-amber-500/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5 text-amber-400" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {member.role && <span className="text-[11px] px-2 py-0.5 rounded bg-white/[0.04] text-muted-foreground capitalize">{member.role}</span>}
              {member.department && <span className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary">{member.department}</span>}
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${member.status === "active" ? "text-emerald-400" : "text-amber-400"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${member.status === "active" ? "bg-emerald-400" : "bg-amber-400"}`} />
                {member.status === "active" ? "Active" : "Away"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Member Modal — admin only */}
      {canManageTeam && (
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="glass-card border-white/[0.08] bg-[#12121a] text-foreground max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">Add Team Member</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mt-1">
              This will create a pending approval request. Another admin must approve before the member is added.
            </p>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-muted-foreground text-xs">Name</Label>
                <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                  className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground" />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Email</Label>
                <Input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}
                  className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground" />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">WhatsApp</Label>
                <div className="mt-1">
                  <PhoneInput value={form.whatsapp} onChange={(v) => setForm({...form, whatsapp: v})} />
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Department</Label>
                <Select value={form.department} onValueChange={(v) => setForm({...form, department: v})}>
                  <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground">
                    <SelectValue placeholder="Select department..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.name} className="text-foreground">{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({...form, role: v})}>
                  <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
                    <SelectItem value="admin" className="text-foreground">Admin — Full Access</SelectItem>
                    <SelectItem value="operator" className="text-foreground">Operator — Limited Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setShowAdd(false)} className="text-muted-foreground">Cancel</Button>
                <Button onClick={handleAdd} disabled={submitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {submitting ? "Submitting..." : "Submit for Approval"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Contact Modal */}
      <EditMemberContactModal
        open={!!editContact}
        onClose={() => setEditContact(null)}
        member={editContact}
        onSave={handleEditContact}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        open={!!resetPassword}
        onClose={() => { setResetPassword(null); setTempPassword(""); }}
        member={resetPassword}
        tempPassword={tempPassword}
        loading={resettingPassword}
      />

      <ConfirmDialog
        open={!!confirmReset}
        onClose={() => setConfirmReset(null)}
        title="Reset Password"
        message={`Reset password for ${confirmReset?.name}? They will be required to change it on their first login.`}
        onConfirm={() => handleResetPassword(confirmReset)}
        dangerAction={false}
        confirmText="Reset Password"
        loading={resettingPassword}
      />

      <ConfirmDialog
        open={!!confirmDeactivate}
        onClose={() => setConfirmDeactivate(null)}
        title="Deactivate Team Member"
        message={`Submit a request to deactivate ${confirmDeactivate?.name}? Another admin must approve before this takes effect.`}
        onConfirm={handleDeactivate}
        confirmText="Submit Request"
        dangerAction={false}
        loading={submitting}
      />
    </div>
  );
}