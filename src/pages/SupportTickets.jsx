import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import TaskCard from "../components/tasks/TaskCard";
import TaskListRow from "../components/tasks/TaskListRow";
import TaskEditModal from "../components/shared/TaskEditModal";

const columns = ["pending", "ongoing", "stopped", "completed"];
const columnLabels = { pending: "Pending", ongoing: "Ongoing", stopped: "Stopped", completed: "Completed" };
const columnDots = { pending: "bg-slate-400", ongoing: "bg-primary", stopped: "bg-red-400", completed: "bg-emerald-400" };

export default function SupportTickets() {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [search, setSearch] = useState("");
  const [editTask, setEditTask] = useState(null);

  const loadData = () => {
    Promise.all([
      base44.entities.Task.list(),
      base44.entities.TeamMember.list(),
      base44.entities.Department.list(),
    ]).then(([t, m, d]) => {
      setTasks(t);
      setMembers(m);
      setDepartments(d);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
    const unsubscribe = base44.entities.Task.subscribe((event) => {
      if (event.type === "create") {
        setTasks((prev) => [event.data, ...prev]);
      } else if (event.type === "update") {
        setTasks((prev) => prev.map((t) => t.id === event.id ? event.data : t));
      } else if (event.type === "delete") {
        setTasks((prev) => prev.filter((t) => t.id !== event.id));
      }
    });
    return unsubscribe;
  }, []);

  const handleStatusChange = async (id, status) => {
    await base44.entities.Task.update(id, { status });
    setTasks(tasks.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  const handleSave = async (form) => {
    if (editTask?.id) {
      await base44.entities.Task.update(editTask.id, { ...form, is_support_ticket: true });
      setTasks(tasks.map((t) => (t.id === editTask.id ? { ...t, ...form, is_support_ticket: true } : t)));
    } else {
      const created = await base44.entities.Task.create({ ...form, is_support_ticket: true });
      setTasks([created, ...tasks]);
    }
  };

  // Filter only support tickets
  const supportTickets = tasks.filter((t) => t.is_support_ticket);
  const filtered = supportTickets.filter((t) =>
    t.title?.toLowerCase().includes(search.toLowerCase()) ||
    t.assignee?.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Support Tickets</h1>
          <p className="text-sm text-muted-foreground mt-1">{supportTickets.length} tickets</p>
        </div>
        <Button onClick={() => { setEditTask({}); }}
          className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
          <Plus className="h-4 w-4 mr-2" /> New Ticket
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-10 pr-4 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-all"
          />
        </div>
      </div>

      {/* List View */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="flex items-center gap-4 py-2.5 px-4 border-b border-white/[0.06] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="flex-1">Ticket</div>
          <div className="w-8">Assignee</div>
          <div className="w-24">Priority</div>
          <div className="w-20">Due</div>
          <div className="w-28">Status</div>
          <div className="w-8"></div>
        </div>
        {filtered.length > 0 ? (
          filtered.map((task) => (
            <TaskListRow key={task.id} task={task} members={members} allTasks={tasks}
              onStatusChange={handleStatusChange} onEdit={setEditTask} />
          ))
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No support tickets</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <TaskEditModal
        open={!!editTask}
        onClose={() => setEditTask(null)}
        task={editTask}
        onSave={handleSave}
        members={members}
        departments={departments}
        allTasks={tasks}
      />
    </div>
  );
}