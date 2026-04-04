import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMemberSession } from "@/lib/MemberSessionContext";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import moment from "moment";
import PriorityBadge from "../components/shared/PriorityBadge";
import StatusBadge from "../components/shared/StatusBadge";
import TaskEditModal from "../components/shared/TaskEditModal";

export default function MemberTasks() {
  const { memberSession } = useMemberSession();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTask, setEditTask] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState("mine");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!memberSession) return;

    const loadData = async () => {
      try {
        const [t, m, d] = await Promise.all([
          base44.entities.Task.list(),
          base44.entities.TeamMember.list(),
          base44.entities.Department.list(),
        ]);
        setTasks(t || []);
        setMembers(m || []);
        setDepartments(d || []);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [memberSession]);

  const deptTasks = tasks.filter(t => t.department === memberSession?.department && t.status !== "completed");
  const deptRegularTasks = deptTasks.filter(t => !t.is_support_ticket);
  const deptSupportTickets = deptTasks.filter(t => t.is_support_ticket);

  const tasksToFilter = filterAssignee === "mine" 
    ? deptRegularTasks.filter(t => t.assignee === memberSession?.name)
    : deptRegularTasks;

  const ticketsToFilter = filterAssignee === "mine"
    ? deptSupportTickets.filter(t => t.assignee === memberSession?.name)
    : deptSupportTickets;

  const filteredTasks = tasksToFilter.filter(t =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTickets = ticketsToFilter.filter(t =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateTask = async (form) => {
    try {
      const newTask = await base44.entities.Task.create({
        ...form,
        assignee: form.assignee || memberSession?.name,
      });
      setTasks([newTask, ...tasks]);
      setShowCreateForm(false);
    } catch (err) {
      console.error("Error creating task:", err);
    }
  };

  const handleEditSave = async (form) => {
    if (editTask?.id) {
      try {
        await base44.entities.Task.update(editTask.id, form);
        setTasks(tasks.map(t => t.id === editTask.id ? { ...t, ...form } : t));
        setEditTask(null);
      } catch (err) {
        console.error("Error updating task:", err);
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this task?")) {
      try {
        await base44.entities.Task.delete(id);
        setTasks(tasks.filter(t => t.id !== id));
      } catch (err) {
        console.error("Error deleting task:", err);
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">Create and manage tasks</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} className="gap-2">
          <Plus className="h-4 w-4" /> New Task
        </Button>
      </div>

      {showCreateForm && (
        <div className="glass-card rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Create Task</h2>
          <TaskEditModal
            open={true}
            onClose={() => setShowCreateForm(false)}
            task={null}
            onSave={handleCreateTask}
            members={members}
            departments={departments}
            allTasks={tasks}
          />
        </div>
      )}

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 mb-4"
        />
        <div className="flex gap-3">
          <button
            onClick={() => setFilterAssignee("mine")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filterAssignee === "mine"
                ? "bg-primary text-primary-foreground"
                : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]"
            }`}
          >
            My Tasks
          </button>
          <button
            onClick={() => setFilterAssignee("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filterAssignee === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]"
            }`}
          >
            All Dept Tasks
          </button>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">📋 Tasks</h2>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="text-muted-foreground text-sm">No tasks in your department.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => {
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";
            const isOwner = task.assignee === memberSession?.name;
            return (
              <div key={task.id} className="glass-card glass-card-hover rounded-xl p-4 transition-all cursor-pointer" onClick={() => setEditTask(task)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{task.title}</h3>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <PriorityBadge priority={task.priority} />
                      <StatusBadge status={task.status} />
                      {task.assignee && (
                        <span className="text-[11px] text-muted-foreground font-mono px-2 py-0.5 rounded bg-white/[0.04]">
                          {task.assignee}
                        </span>
                      )}
                      {task.department && (
                        <span className="text-[11px] text-muted-foreground font-mono px-2 py-0.5 rounded bg-white/[0.04]">
                          {task.department}
                        </span>
                      )}
                      {task.due_date && (
                        <span className={`text-[11px] font-mono ${isOverdue ? "text-red-400" : "text-muted-foreground"}`}>
                          Due {moment(task.due_date).format("MMM D")}
                          {isOverdue && " (overdue)"}
                        </span>
                      )}
                    </div>
                  </div>
                  {isOwner && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setEditTask(task)}
                        className="p-1.5 rounded-md hover:bg-white/[0.06] transition-all"
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="p-1.5 rounded-md hover:bg-white/[0.06] transition-all"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-400" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
          )}
          </div>

          <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">🎫 Support Tickets</h2>
          {loading ? (
          <div className="flex items-center justify-center py-12">
           <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
          ) : filteredTickets.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center">
           <p className="text-muted-foreground text-sm">No support tickets in your department.</p>
          </div>
          ) : (
          <div className="space-y-3">
           {filteredTickets.map(ticket => {
             const isOverdue = ticket.due_date && new Date(ticket.due_date) < new Date() && ticket.status !== "completed";
             const isOwner = ticket.assignee === memberSession?.name;
             return (
               <div key={ticket.id} className="glass-card glass-card-hover rounded-xl p-4 transition-all border-l-2 border-orange-500/50 cursor-pointer" onClick={() => setEditTask(ticket)}>
                 <div className="flex items-start justify-between gap-4">
                   <div className="flex-1 min-w-0">
                     <h3 className="text-sm font-semibold text-foreground truncate">{ticket.title}</h3>
                     {ticket.description && (
                       <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>
                     )}
                     <div className="flex items-center gap-2 mt-2 flex-wrap">
                       <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">TICKET</span>
                       <PriorityBadge priority={ticket.priority} />
                       <StatusBadge status={ticket.status} />
                       {ticket.customer_name && (
                         <span className="text-[11px] text-muted-foreground font-mono px-2 py-0.5 rounded bg-white/[0.04]">
                           {ticket.customer_name}
                         </span>
                       )}
                       {ticket.assignee && (
                         <span className="text-[11px] text-muted-foreground font-mono px-2 py-0.5 rounded bg-white/[0.04]">
                           {ticket.assignee}
                         </span>
                       )}
                       {ticket.due_date && (
                         <span className={`text-[11px] font-mono ${isOverdue ? "text-red-400" : "text-muted-foreground"}`}>
                           Due {moment(ticket.due_date).format("MMM D")}
                           {isOverdue && " (overdue)"}
                         </span>
                       )}
                     </div>
                   </div>
                   {isOwner && (
                     <div className="flex items-center gap-2 flex-shrink-0">
                       <button
                         onClick={() => setEditTask(ticket)}
                         className="p-1.5 rounded-md hover:bg-white/[0.06] transition-all"
                       >
                         <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                       </button>
                       <button
                         onClick={() => handleDelete(ticket.id)}
                         className="p-1.5 rounded-md hover:bg-white/[0.06] transition-all"
                       >
                         <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-400" />
                       </button>
                     </div>
                   )}
                 </div>
               </div>
             );
           })}
          </div>
          )}
          </div>

      <TaskEditModal
        open={!!editTask}
        onClose={() => setEditTask(null)}
        task={editTask}
        onSave={handleEditSave}
        members={members}
        departments={departments}
        allTasks={tasks.filter(t => t.department === memberSession?.department)}
      />
    </div>
  );
}