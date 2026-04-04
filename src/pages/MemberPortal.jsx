import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { LogOut, CheckSquare, Clock, AlertCircle, Users, Building2, BarChart2, MessageSquare, Edit3 } from "lucide-react";
import moment from "moment";
import ChangePasswordModal from "../components/shared/ChangePasswordModal";
import EditMemberContactModal from "../components/shared/EditMemberContactModal";
import { Button } from "@/components/ui/button";
import PriorityBadge from "../components/shared/PriorityBadge";
import StatusBadge from "../components/shared/StatusBadge";
import UserAvatar from "../components/shared/UserAvatar";

export default function MemberPortal() {
  const [member, setMember] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [editContact, setEditContact] = useState(false);

  const isAdmin = member?.role === "admin";
  const isOperator = member?.role === "operator";

  useEffect(() => {
    const loadPortal = async () => {
      try {
        const session = localStorage.getItem("memberSession");
        if (!session) {
          window.location.href = "/member-login";
          return;
        }

        let parsed;
        try {
          parsed = JSON.parse(session);
        } catch (parseErr) {
          // Session is corrupted, clear and redirect
          localStorage.removeItem("memberSession");
          window.location.href = "/member-login";
          return;
        }

        setMember(parsed);

        if (parsed.must_change_password) {
          setShowChangePassword(true);
        }

        // Fetch tasks assigned to this member (don't fail login if this fails)
        try {
          const tasks = await base44.entities.Task.filter({ assignee: parsed.name });
          setTasks(tasks || []);
        } catch (taskErr) {
          console.error("Error loading tasks:", taskErr);
          setTasks([]); // Show empty list instead of logging out
        }
      } finally {
        setLoading(false);
      }
    };

    loadPortal();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("memberSession");
    window.location.href = "/member-login";
  };

  const handleSaveContact = async (contactData) => {
    await base44.entities.TeamMember.update(member.id, contactData);
    const updated = { ...member, ...contactData };
    setMember(updated);
    localStorage.setItem("memberSession", JSON.stringify(updated));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0f" }}>
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0f" }}>
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  const openTasks = tasks.filter(t => t.status !== "completed");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed");

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f" }}>
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-white/[0.06]"
        style={{ background: "rgba(10, 10, 18, 0.8)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-3">
          <span className="text-gradient font-bold text-xl tracking-tight">TeamOS</span>
          <span className="text-muted-foreground text-sm">/ Member Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <UserAvatar name={member.name} color={member.avatar_color} size="sm" />
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground">{member.name}</p>
            <p className="text-xs text-muted-foreground">{member.department}</p>
          </div>
          <button onClick={() => setEditContact(true)}
            className="ml-2 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.06] border border-white/[0.06] transition-all">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.06] border border-white/[0.06] transition-all">
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">My Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">Welcome back, {member.name}!</p>
        </div>

        {/* Quick nav based on role */}
        <div className="flex flex-wrap gap-3 mb-8">
          <a href="#tasks" className="flex items-center gap-2 px-4 py-2 rounded-lg glass-card text-sm text-foreground hover:bg-white/[0.06] transition-all">
            <CheckSquare className="h-4 w-4 text-primary" /> My Tasks
          </a>
          {isAdmin && (
            <>
              <a href="/team" className="flex items-center gap-2 px-4 py-2 rounded-lg glass-card text-sm text-foreground hover:bg-white/[0.06] transition-all">
                <Users className="h-4 w-4 text-primary" /> Team
              </a>
              <a href="/departments" className="flex items-center gap-2 px-4 py-2 rounded-lg glass-card text-sm text-foreground hover:bg-white/[0.06] transition-all">
                <Building2 className="h-4 w-4 text-primary" /> Departments
              </a>
              <a href="/reports" className="flex items-center gap-2 px-4 py-2 rounded-lg glass-card text-sm text-foreground hover:bg-white/[0.06] transition-all">
                <BarChart2 className="h-4 w-4 text-primary" /> Reports
              </a>
            </>
          )}
          <a href="/chat" className="flex items-center gap-2 px-4 py-2 rounded-lg glass-card text-sm text-foreground hover:bg-white/[0.06] transition-all">
            <MessageSquare className="h-4 w-4 text-primary" /> Agent Chat
          </a>
        </div>

        {/* Stats */}
        <div id="tasks" className="grid grid-cols-3 sm:grid-cols-3 gap-3 md:gap-4 mb-8">
          {[
            { label: "Open Tasks", value: openTasks.length, icon: CheckSquare, color: "text-primary" },
            { label: "Overdue", value: overdueTasks.length, icon: AlertCircle, color: "text-red-400" },
            { label: "Completed", value: completedTasks.length, icon: Clock, color: "text-emerald-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Task List */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <CheckSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No tasks assigned to you yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";
              return (
                <div key={task.id} className="glass-card glass-card-hover rounded-xl p-4 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">{task.title}</h3>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <PriorityBadge priority={task.priority} />
                        <StatusBadge status={task.status} />
                        {task.department && (
                          <span className="text-[11px] text-muted-foreground font-mono px-2 py-0.5 rounded bg-white/[0.04]">{task.department}</span>
                        )}
                        {task.due_date && (
                          <span className={`text-[11px] font-mono ${isOverdue ? "text-red-400" : "text-muted-foreground"}`}>
                            Due {moment(task.due_date).format("MMM D, YYYY")}
                            {isOverdue && " (overdue)"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <ChangePasswordModal
        open={showChangePassword}
        memberId={member.id}
        onSuccess={() => setShowChangePassword(false)}
      />

      <EditMemberContactModal
        open={editContact}
        onClose={() => setEditContact(false)}
        member={member}
        onSave={handleSaveContact}
      />
    </div>
  );
}