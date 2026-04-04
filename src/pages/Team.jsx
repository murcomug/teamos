import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Mail, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import UserAvatar from "../components/shared/UserAvatar";
import PhoneInput from "../components/shared/PhoneInput";
import PermissionsEditor from "../components/shared/PermissionsEditor";

export default function Team() {
  const [members, setMembers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", whatsapp: "", department: "", role: "operator" });
  const [formPerms, setFormPerms] = useState([]);

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

  const handleAdd = async () => {
    const colors = ["#2dd4bf", "#818cf8", "#f472b6", "#fb923c", "#a78bfa", "#34d399"];
    const created = await base44.entities.TeamMember.create({
      ...form,
      status: "active",
      avatar_color: colors[Math.floor(Math.random() * colors.length)],
      permissions: formPerms,
    });
    setMembers([created, ...members]);
    setShowAdd(false);
    setForm({ name: "", email: "", whatsapp: "", department: "", role: "" });
    setFormPerms([]);
  };

  const handleSavePermissions = async () => {
    const updated = await base44.entities.TeamMember.update(editMember.id, { permissions: formPerms });
    setMembers(members.map((m) => (m.id === editMember.id ? { ...m, permissions: formPerms } : m)));
    setEditMember(null);
  };

  const openPermissions = (member) => {
    setEditMember(member);
    setFormPerms(member.permissions || []);
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
        <Button onClick={() => { setForm({ name: "", email: "", whatsapp: "", department: "", role: "" }); setFormPerms([]); setShowAdd(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
          <Plus className="h-4 w-4 mr-2" /> Add Member
        </Button>
      </div>

      {/* Controls */}
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
        <div className="grid grid-cols-[1fr_120px_140px_130px_80px_100px] gap-4 py-2.5 px-5 border-b border-white/[0.06] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Name</span><span>Role</span><span>Department</span><span>WhatsApp</span><span>Status</span><span>Actions</span>
        </div>
        {filtered.map((member) => (
          <div key={member.id} className="grid grid-cols-[1fr_120px_140px_130px_80px_100px] gap-4 items-center py-3 px-5 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <UserAvatar name={member.name} color={member.avatar_color} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                <p className="text-xs text-muted-foreground truncate">{member.email}</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{member.role}</span>
            <span className="text-xs text-muted-foreground">{member.department}</span>
            <span className="text-xs text-muted-foreground font-mono">{member.whatsapp}</span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${member.status === "active" ? "text-emerald-400" : "text-amber-400"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${member.status === "active" ? "bg-emerald-400" : "bg-amber-400"}`} />
              {member.status === "active" ? "Active" : "Away"}
            </span>
            <div className="flex items-center gap-1">
              <a href={`mailto:${member.email}`} className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
              <button onClick={() => openPermissions(member)} className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors" title="Edit Permissions">
                <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
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
              <div className="flex items-center gap-1 flex-shrink-0">
                <a href={`mailto:${member.email}`} className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
                <button onClick={() => openPermissions(member)} className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors">
                  <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {member.role && <span className="text-[11px] px-2 py-0.5 rounded bg-white/[0.04] text-muted-foreground">{member.role}</span>}
              {member.department && <span className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary">{member.department}</span>}
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${member.status === "active" ? "text-emerald-400" : "text-amber-400"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${member.status === "active" ? "bg-emerald-400" : "bg-amber-400"}`} />
                {member.status === "active" ? "Active" : "Away"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="glass-card border-white/[0.08] bg-[#12121a] text-foreground max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Team Member</DialogTitle>
          </DialogHeader>
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
                  <SelectItem value="admin" className="text-foreground">Admin - Full Access</SelectItem>
                  <SelectItem value="operator" className="text-foreground">Operator - Limited Access</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-2">
                {form.role === "admin" ? "✓ Can view all data, add members, add departments" : "✓ Limited to own department, cannot manage members or departments"}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs mb-2 block">Permissions</Label>
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
                <PermissionsEditor permissions={formPerms} onChange={setFormPerms} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowAdd(false)} className="text-muted-foreground">Cancel</Button>
              <Button onClick={handleAdd} className="bg-primary text-primary-foreground hover:bg-primary/90">Add Member</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permissions Modal */}
      <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
        <DialogContent className="glass-card border-white/[0.08] bg-[#12121a] text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Permissions — {editMember?.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-3">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
              <PermissionsEditor permissions={formPerms} onChange={setFormPerms} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setEditMember(null)} className="text-muted-foreground">Cancel</Button>
            <Button onClick={handleSavePermissions} className="bg-primary text-primary-foreground hover:bg-primary/90">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}