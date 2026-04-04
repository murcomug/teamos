import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import BlockingTaskSelector from "../tasks/BlockingTaskSelector";
import { AlertCircle } from "lucide-react";

export default function TaskEditModal({ open, onClose, task, onSave, members = [], departments = [], allTasks = [] }) {
  const [form, setForm] = useState({
    title: "", description: "", status: "pending", priority: "medium",
    assignee: "", department: "", due_date: "", blocking_task_ids: []
  });
  const [blockingError, setBlockingError] = useState("");

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || "",
        description: task.description || "",
        status: task.status || "pending",
        priority: task.priority || "medium",
        assignee: task.assignee || "",
        department: task.department || "",
        due_date: task.due_date || "",
        blocking_task_ids: task.blocking_task_ids || [],
      });
    }
    setBlockingError("");
  }, [task]);

  const handleSave = () => {
    if (form.status === "completed" && form.blocking_task_ids?.length > 0) {
      const blockers = allTasks.filter(t => form.blocking_task_ids.includes(t.id));
      const pendingBlockers = blockers.filter(t => t.status !== "completed");
      if (pendingBlockers.length > 0) {
        setBlockingError(`Cannot complete: ${pendingBlockers.length} blocking task(s) still pending.`);
        return;
      }
    }
    setBlockingError("");
    onSave(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-card border-white/[0.08] bg-[#12121a] text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">{task?.id ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-muted-foreground text-xs">Title</Label>
            <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})}
              className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground" />
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Description</Label>
            <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
              className="mt-1 w-full h-20 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-sm p-3 focus:outline-none focus:border-primary/40 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})}>
                <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
                  {["pending","ongoing","stopped","completed"].map(s => (
                    <SelectItem key={s} value={s} className="text-foreground capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({...form, priority: v})}>
                <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
                  {["critical","high","medium","low"].map(p => (
                    <SelectItem key={p} value={p} className="text-foreground capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">Assignee</Label>
              <Select value={form.assignee} onValueChange={(v) => setForm({...form, assignee: v})}>
                <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.name} className="text-foreground">{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Department</Label>
              <Select value={form.department} onValueChange={(v) => setForm({...form, department: v})}>
                <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.name} className="text-foreground">{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Due Date</Label>
            <Input type="date" value={form.due_date} onChange={(e) => setForm({...form, due_date: e.target.value})}
              className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground" />
          </div>
          <div>
            <BlockingTaskSelector
              allTasks={allTasks}
              currentTaskId={task?.id}
              blockingTaskIds={form.blocking_task_ids}
              onChange={(ids) => setForm({...form, blocking_task_ids: ids})}
            />
          </div>
          {blockingError && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/20 border border-red-500/30">
              <AlertCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
              <span className="text-xs text-red-400">{blockingError}</span>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">Cancel</Button>
            <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {task?.id ? "Save Changes" : "Create Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}