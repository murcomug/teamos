import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMemberSession } from "@/lib/MemberSessionContext";
import { Trash2, Pencil, CheckCircle } from "lucide-react";
import moment from "moment";
import PriorityBadge from "../components/shared/PriorityBadge";
import StatusBadge from "../components/shared/StatusBadge";
import TaskEditModal from "../components/shared/TaskEditModal";

export default function MemberSupportTickets() {
  const { memberSession } = useMemberSession();
  const [tickets, setTickets] = useState([]);
  const [members, setMembers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTask, setEditTask] = useState(null);
  const [activeTab, setActiveTab] = useState("open");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!memberSession) return;

    const loadData = async () => {
      try {
        const [allTasks, m, d] = await Promise.all([
          base44.entities.Task.list(),
          base44.entities.TeamMember.list(),
          base44.entities.Department.list(),
        ]);
        const supportTickets = (allTasks || []).filter(t => t.is_support_ticket);
        setTickets(supportTickets);
        setMembers(m || []);
        setDepartments(d || []);
      } catch (err) {
        console.error("Error loading support tickets:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    const unsubscribe = base44.entities.Task.subscribe((event) => {
      if (event.type === "create" && event.data?.is_support_ticket) {
        setTickets(prev => [event.data, ...prev]);
      } else if (event.type === "update" && event.data?.is_support_ticket) {
        setTickets(prev =>
          prev.map(t => t.id === event.id ? event.data : t).filter(t => t.is_support_ticket)
        );
      } else if (event.type === "delete") {
        setTickets(prev => prev.filter(t => t.id !== event.id));
      }
    });

    return unsubscribe;
  }, [memberSession]);

  const openTickets = tickets.filter(t => t.status !== "completed");
  const closedTickets = tickets.filter(t => t.status === "completed");

  const filteredTickets = (activeTab === "open" ? openTickets : closedTickets).filter(t =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.assignee?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditSave = async (form) => {
    if (editTask?.id) {
      try {
        await base44.entities.Task.update(editTask.id, form);
        setTickets(tickets.map(t => t.id === editTask.id ? { ...t, ...form } : t));
        setEditTask(null);
      } catch (err) {
        console.error("Error updating ticket:", err);
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this support ticket?")) {
      try {
        await base44.entities.Task.delete(id);
        setTickets(tickets.filter(t => t.id !== id));
      } catch (err) {
        console.error("Error deleting ticket:", err);
      }
    }
  };

  const handleCloseTicket = async (id, resolution) => {
    try {
      await base44.entities.Task.update(id, {
        status: "completed",
        resolution_status: resolution,
      });
      setTickets(tickets.map(t => t.id === id ? { ...t, status: "completed", resolution_status: resolution } : t));
    } catch (err) {
      console.error("Error closing ticket:", err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Support Tickets</h1>
        <p className="text-muted-foreground text-sm mt-1">Report and track issues</p>
      </div>

      <input
        type="text"
        placeholder="Search tickets by title, description, or assignee..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full mb-6 px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
      />

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("open")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "open"
              ? "bg-primary text-primary-foreground"
              : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]"
          }`}
        >
          Open ({openTickets.length})
        </button>
        <button
          onClick={() => setActiveTab("closed")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "closed"
              ? "bg-primary text-primary-foreground"
              : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]"
          }`}
        >
          Closed ({closedTickets.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <p className="text-muted-foreground">No {activeTab === "open" ? "open" : "closed"} support tickets found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map(ticket => {
            const isOverdue = ticket.due_date && new Date(ticket.due_date) < new Date() && ticket.status !== "completed";
            const isOwner = ticket.assignee === memberSession?.name;
            return (
              <div key={ticket.id} className="glass-card glass-card-hover rounded-xl p-4 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {ticket.status === "completed" && (
                        <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      )}
                      <h3 className="text-sm font-semibold text-foreground truncate">{ticket.title}</h3>
                    </div>
                    {ticket.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <PriorityBadge priority={ticket.priority} />
                      <StatusBadge status={ticket.status} />
                      {ticket.assignee && (
                        <span className="text-[11px] text-muted-foreground font-mono px-2 py-0.5 rounded bg-white/[0.04]">
                          {ticket.assignee}
                        </span>
                      )}
                      {ticket.department && (
                        <span className="text-[11px] text-muted-foreground font-mono px-2 py-0.5 rounded bg-white/[0.04]">
                          {ticket.department}
                        </span>
                      )}
                      {ticket.due_date && (
                        <span className={`text-[11px] font-mono ${isOverdue ? "text-red-400" : "text-muted-foreground"}`}>
                          Due {moment(ticket.due_date).format("MMM D")}
                          {isOverdue && " (overdue)"}
                        </span>
                      )}
                      {ticket.status === "completed" && ticket.resolution_status && (
                        <span className={`text-[11px] px-2 py-0.5 rounded font-mono ${
                          ticket.resolution_status === "resolved"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}>
                          {ticket.resolution_status}
                        </span>
                      )}
                    </div>
                  </div>
                  {isOwner && activeTab === "open" && (
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
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleCloseTicket(ticket.id, e.target.value);
                            e.target.value = "";
                          }
                        }}
                        className="px-2 py-1 text-xs rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 focus:outline-none cursor-pointer"
                      >
                        <option value="">Close as...</option>
                        <option value="resolved">Resolved</option>
                        <option value="unresolved">Unresolved</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TaskEditModal
        open={!!editTask}
        onClose={() => setEditTask(null)}
        task={editTask}
        onSave={handleEditSave}
        members={members}
        departments={departments}
        allTasks={tickets}
      />
    </div>
  );
}