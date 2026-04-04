import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import TaskListRow from "../components/tasks/TaskListRow";
import TaskEditModal from "../components/shared/TaskEditModal";
import TicketCloseModal from "../components/shared/TicketCloseModal";
import ConfirmDialog from "../components/shared/ConfirmDialog";

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
  const [customerFilter, setCustomerFilter] = useState("");
  const [editTask, setEditTask] = useState(null);
  const [closeTicket, setCloseTicket] = useState(null);
  const [completedTab, setCompletedTab] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState(null);

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

  const handleDelete = async (id) => {
    const task = tasks.find((t) => t.id === id);
    setConfirmDelete({ id, title: task?.title });
  };

  const confirmTicketDelete = async () => {
    if (confirmDelete?.id) {
      await base44.entities.Task.delete(confirmDelete.id);
      setTasks(tasks.filter((t) => t.id !== confirmDelete.id));
      setConfirmDelete(null);
    }
  };

  const handleCloseTicket = async (data) => {
    if (closeTicket?.id) {
      await base44.entities.Task.update(closeTicket.id, data);
      setTasks(tasks.map((t) => (t.id === closeTicket.id ? { ...t, ...data } : t)));
    }
  };

  // Filter only support tickets
  const supportTickets = tasks.filter((t) => t.is_support_ticket);
  const activeTickets = supportTickets.filter((t) => t.status !== "completed");
  const completedTickets = supportTickets.filter((t) => t.status === "completed");
  const resolvedTickets = completedTickets.filter((t) => t.resolution_status === "resolved");
  const unresolvedTickets = completedTickets.filter((t) => t.resolution_status === "unresolved");
  
  const displayTickets = completedTab === "all" ? completedTickets : completedTab === "resolved" ? resolvedTickets : unresolvedTickets;
  const filtered = (view === "completed" ? displayTickets : activeTickets).filter((t) => {
    const matchesSearch = t.title?.toLowerCase().includes(search.toLowerCase()) || t.assignee?.toLowerCase().includes(search.toLowerCase());
    const matchesCustomer = !customerFilter || t.customer_name?.toLowerCase().includes(customerFilter.toLowerCase());
    return matchesSearch && matchesCustomer;
  });

  const uniqueCustomers = [...new Set(supportTickets.map(t => t.customer_name).filter(Boolean))].sort();

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

      <div className="flex items-center gap-2">
        <button
          onClick={() => setView("active")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            view === "active"
              ? "bg-primary/15 text-primary"
              : "bg-white/[0.04] border border-white/[0.06] text-muted-foreground hover:text-foreground"
          }`}
        >
          Active ({activeTickets.length})
        </button>
        <button
          onClick={() => setView("completed")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            view === "completed"
              ? "bg-primary/15 text-primary"
              : "bg-white/[0.04] border border-white/[0.06] text-muted-foreground hover:text-foreground"
          }`}
        >
          Completed ({completedTickets.length})
        </button>
      </div>

      {view === "completed" && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCompletedTab("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              completedTab === "all"
                ? "bg-primary/15 text-primary"
                : "bg-white/[0.04] border border-white/[0.06] text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({completedTickets.length})
          </button>
          <button
            onClick={() => setCompletedTab("resolved")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              completedTab === "resolved"
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-white/[0.04] border border-white/[0.06] text-muted-foreground hover:text-foreground"
            }`}
          >
            Resolved ({resolvedTickets.length})
          </button>
          <button
            onClick={() => setCompletedTab("unresolved")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              completedTab === "unresolved"
                ? "bg-amber-500/15 text-amber-400"
                : "bg-white/[0.04] border border-white/[0.06] text-muted-foreground hover:text-foreground"
            }`}
          >
            Unresolved ({unresolvedTickets.length})
          </button>
        </div>
      )}

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
        <select
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          className="h-9 px-4 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-foreground focus:outline-none focus:border-primary/40 transition-all"
        >
          <option value="">All Customers</option>
          {uniqueCustomers.map(customer => (
            <option key={customer} value={customer}>{customer}</option>
          ))}
        </select>
      </div>

      {/* List View */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="flex items-center gap-4 py-2.5 px-4 border-b border-white/[0.06] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="flex-1 min-w-[200px]">Ticket</div>
          <div className="w-24">Customer</div>
          <div className="w-12">Assignee</div>
          <div className="w-20">Priority</div>
          <div className="w-16">Due</div>
          <div className="w-24">Status</div>
          <div className="w-12"></div>
        </div>
        {filtered.length > 0 ? (
          filtered.map((task) => {
            const showCloseBtn = view === "active";
            return (
              <div key={task.id} className="flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-white/[0.03] transition-colors group border-b border-white/[0.03] last:border-0">
                <div className="flex-1">
                  <TaskListRow task={task} members={members} allTasks={tasks}
                    onStatusChange={handleStatusChange} onEdit={setEditTask} onDelete={handleDelete} />
                </div>
                <div className="w-24 text-sm text-muted-foreground truncate">
                  {task.customer_name || "—"}
                </div>
                {showCloseBtn && (
                  <Button
                    onClick={() => setCloseTicket(task)}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white ml-2 flex-shrink-0"
                  >
                    Close
                  </Button>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {view === "active" ? "No active tickets" : completedTab === "resolved" ? "No resolved tickets" : completedTab === "unresolved" ? "No unresolved tickets" : "No completed tickets"}
            </p>
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

      {/* Close Ticket Modal */}
      <TicketCloseModal
        open={!!closeTicket}
        onClose={() => setCloseTicket(null)}
        ticket={closeTicket}
        onSave={handleCloseTicket}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Support Ticket"
        message={`Delete ticket "${confirmDelete?.title}"? This action cannot be undone.`}
        onConfirm={confirmTicketDelete}
        confirmText="Delete"
        dangerAction={true}
      />
    </div>
  );
}