import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Users, CheckSquare, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TaskEditModal from "../components/shared/TaskEditModal";

const DEFAULT_DEPARTMENTS = [
  { name: "Finance", icon: "💰", head: "" },
  { name: "Operations", icon: "⚙️", head: "" },
  { name: "Management", icon: "🏢", head: "" },
  { name: "IT", icon: "💻", head: "" },
  { name: "Customer Care", icon: "🎧", head: "" },
  { name: "Marketing", icon: "📣", head: "" },
];

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dupError, setDupError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [quickTask, setQuickTask] = useState(null);
  const [form, setForm] = useState({ name: "", icon: "", head: "" });

  useEffect(() => {
    Promise.all([
      base44.entities.Department.list(),
      base44.entities.Task.list(),
      base44.entities.TeamMember.list(),
    ]).then(async ([d, t, m]) => {
      // Seed default departments if they don't exist
      const existingNames = d.map((x) => x.name.toLowerCase());
      const toCreate = DEFAULT_DEPARTMENTS.filter(
        (def) => !existingNames.includes(def.name.toLowerCase())
      );
      let allDepts = d;
      if (toCreate.length > 0) {
        const created = await base44.entities.Department.bulkCreate(toCreate);
        allDepts = [...d, ...created];
      }
      setDepartments(allDepts);
      setTasks(t);
      setMembers(m);
      setLoading(false);
    });
  }, []);

  const handleAddDept = async () => {
    const isDuplicate = departments.some(
      (d) => d.name.toLowerCase() === form.name.trim().toLowerCase()
    );
    if (isDuplicate) {
      setDupError(`"${form.name}" already exists.`);
      return;
    }
    const created = await base44.entities.Department.create(form);
    setDepartments([created, ...departments]);
    setShowAdd(false);
    setForm({ name: "", icon: "", head: "" });
    setDupError("");
  };

  const handleQuickTask = async (data) => {
    const created = await base44.entities.Task.create(data);
    setTasks([created, ...tasks]);
  };

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
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Departments</h1>
          <p className="text-sm text-muted-foreground mt-1">{departments.length} departments</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
          <Plus className="h-4 w-4 mr-2" /> Add Department
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => {
          const deptMembers = members.filter((m) => m.department === dept.name).length;
          const deptTasks = tasks.filter((t) => t.department === dept.name);
          const openTasks = deptTasks.filter((t) => t.status !== "completed").length;
          const overdue = deptTasks.filter((t) => t.status !== "completed" && t.due_date && new Date(t.due_date) < new Date()).length;

          return (
            <div key={dept.id} className="glass-card rounded-xl p-5 glass-card-hover transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{dept.icon || "📁"}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{dept.name}</h3>
                    <p className="text-xs text-muted-foreground">Head: {dept.head || "—"}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center py-2 rounded-lg bg-white/[0.02]">
                  <Users className="h-3.5 w-3.5 text-violet-400 mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground">{deptMembers}</p>
                  <p className="text-[10px] text-muted-foreground">Members</p>
                </div>
                <div className="text-center py-2 rounded-lg bg-white/[0.02]">
                  <CheckSquare className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground">{openTasks}</p>
                  <p className="text-[10px] text-muted-foreground">Open</p>
                </div>
                <div className="text-center py-2 rounded-lg bg-white/[0.02]">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400 mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground">{overdue}</p>
                  <p className="text-[10px] text-muted-foreground">Overdue</p>
                </div>
              </div>

              <Button
                variant="ghost"
                onClick={() => setQuickTask({ department: dept.name })}
                className="w-full text-xs text-muted-foreground hover:text-primary border border-white/[0.06] hover:border-primary/30"
              >
                <Plus className="h-3 w-3 mr-1" /> Quick Add Task
              </Button>
            </div>
          );
        })}
      </div>

      {/* Add Department Modal */}
      <Dialog open={showAdd} onOpenChange={(v) => { setShowAdd(v); setDupError(""); }}>
        <DialogContent className="glass-card border-white/[0.08] bg-[#12121a] text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-muted-foreground text-xs">Name</Label>
              <Input value={form.name} onChange={(e) => { setForm({...form, name: e.target.value}); setDupError(""); }}
                className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground" />
              {dupError && <p className="text-xs text-red-400 mt-1">{dupError}</p>}
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Icon (emoji)</Label>
              <Input value={form.icon} onChange={(e) => setForm({...form, icon: e.target.value})} placeholder="e.g. 🎯"
                className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground" />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Department Head</Label>
              <Input value={form.head} onChange={(e) => setForm({...form, head: e.target.value})}
                className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowAdd(false)} className="text-muted-foreground">Cancel</Button>
              <Button onClick={handleAddDept} className="bg-primary text-primary-foreground hover:bg-primary/90">Add Department</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Add Task Modal */}
      <TaskEditModal
        open={!!quickTask}
        onClose={() => setQuickTask(null)}
        task={quickTask}
        onSave={handleQuickTask}
        members={members}
        departments={departments}
      />
    </div>
  );
}