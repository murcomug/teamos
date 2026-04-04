import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { LogOut, CheckSquare, Clock, AlertCircle, Users, Building2, BarChart2, MessageSquare, Edit3, Menu, X } from "lucide-react";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  const isAdmin = member?.role === "admin";

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
          localStorage.removeItem("memberSession");
          window.location.href = "/member-login";
          return;
        }

        // Validate session has required fields
        if (!parsed.id || !parsed.email || !parsed.name) {
          localStorage.removeItem("memberSession");
          window.location.href = "/member-login";
          return;
        }

        setMember(parsed);

        if (parsed.must_change_password === true) {
          setShowChangePassword(true);
        }

        // Load tasks (non-blocking)
        try {
          const memberTasks = await base44.entities.Task.filter({ assignee: parsed.name });
          setTasks(memberTasks || []);
        } catch (taskErr) {
          console.error("Error loading tasks:", taskErr);
          setTasks([]);
        }
      } catch (err) {
        console.error("Portal load error:", err);
        setSessionError(true);
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
    try {
      await base44.entities.TeamMember.update(member.id, contactData);
      const updated = { ...member, ...contactData };
      setMember(updated);
      localStorage.setItem("memberSession", JSON.stringify(updated));
      setEditContact(false);
    } catch (err) {
      console.error("Error saving contact:", err);
    }
  };

  const handlePasswordChangeSuccess = () => {
    const updated = { ...member, must_change_password: false };
    setMember(updated);
    localStorage.setItem("memberSession", JSON.stringify(updated));
    setShowChangePassword(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0f" }}>
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (sessionError || !member) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0f" }}>
        <div className="text-center">
          <p className="text-red-400 mb-4">Session expired. Redirecting to login...</p>
          <a href="/member-login" className="text-primary underline">Click here if not redirected</a>
        </div>
      </div>
    );
  }

  const openTasks = tasks.filter(t => t.status !== "completed");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed");

  const navLinks = [
    { label: "My Tasks", href: "#tasks", icon: CheckSquare },
    ...(isAdmin ? [
      { label: "Team", href: "/team", icon: Users },
      { label: "Departments", href: "/departments", icon: Building2 },
      { label: "Reports", href: "/reports", icon: BarChart2 },
    ] : []),
    { label: "Agent Chat", href: "/chat", icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: "#0a0a0f" }}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-white/[0.06] transition-transform md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "rgba(10, 10, 15, 0.95)" }}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/[0.06]">
          <span className="text-gradient font-bold text-lg">TeamOS</span>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        
        <nav className="p-4 space-y-2">
          {navLinks.map(({ label, href, icon: Icon }) => (
            <a key={label} href={href}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-all"
              onClick={() => setSidebarOpen(false)}>
              <Icon className="h-4 w-4" />
              {label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/[0.06]"
          style={{ background: "rgba(10, 10, 18, 0.8)", backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 hover:bg-white/[0.05] rounded-lg">
              <Menu className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-foreground">{member.name}</p>
              <p className="text-xs text-muted-foreground">{member.department}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <UserAvatar name={member.name} color={member.avatar_color} size="sm" />
            <button onClick={() => setEditContact(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all"
              title="Edit profile">
              <Edit3 className="h-4 w-4" />
            </button>
            <button onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.06] border border-white/[0.06] transition-all">
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-foreground">My Portal</h1>
              <p className="text-muted-foreground text-sm mt-1">Welcome back, {member.name}!</p>
            </div>

            {/* Stats */}
            <div id="tasks" className="grid grid-cols-3 gap-3 md:gap-4 mb-8">
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
            {tasks.length === 0 ? (
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
          </div>
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Modals */}
      <ChangePasswordModal
        open={showChangePassword}
        memberId={member.id}
        onSuccess={handlePasswordChangeSuccess}
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