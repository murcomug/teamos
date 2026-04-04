import { useEffect, useState } from "react";
import { appParams } from "@/lib/app-params";
import { base44 } from "@/api/base44Client";
import { Loader2, Lock, Eye, EyeOff, Menu, X, Edit3, LogOut, CheckSquare, Clock, AlertCircle, Users, Building2, BarChart2, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import moment from "moment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PriorityBadge from "../components/shared/PriorityBadge";
import StatusBadge from "../components/shared/StatusBadge";
import UserAvatar from "../components/shared/UserAvatar";

export default function MemberLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [member, setMember] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [portalLoading, setPortalLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem("memberSession");
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed.id && parsed.email && parsed.name) {
          setMember(parsed);
          setIsLoggedIn(true);
          loadTasks(parsed);
          setPortalLoading(false);
          return;
        }
      } catch (err) {
        localStorage.removeItem("memberSession");
      }
    }
    setPortalLoading(false);
  }, []);

  const loadTasks = async (memberData, retries = 3, delay = 1000) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const memberTasks = await base44.entities.Task.filter({ assignee: memberData.name });
      setTasks(memberTasks || []);
    } catch (err) {
      console.error("Error loading tasks:", err);
      if (err?.message?.includes('rate limit') && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return loadTasks(memberData, retries - 1, delay * 2);
      }
      setTasks([]);
      if (err?.message?.includes('rate limit')) {
        setError('System is busy. Please try again in a moment.');
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await base44.functions.invoke('teamMemberAuth', {
        action: 'login',
        email: email.toLowerCase().trim(),
        password
      });

      if (res.data?.success && res.data.member) {
        localStorage.setItem("memberSession", JSON.stringify(res.data.member));
        setMember(res.data.member);
        setIsLoggedIn(true);
        await loadTasks(res.data.member);
        setEmail("");
        setPassword("");
      } else {
        setError(res.data?.error || "Login failed. Please try again.");
      }
    } catch (err) {
      setError("Connection error. Check your credentials and try again.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("memberSession");
    setIsLoggedIn(false);
    setMember(null);
    setTasks([]);
  };

  if (portalLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0f" }}>
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (isLoggedIn && member) {
    return <MemberPortalView member={member} tasks={tasks} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0a0a0f" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">TeamOS Member Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in with your credentials</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label className="text-muted-foreground text-xs mb-1 block">Email Address</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="bg-white/[0.04] border-white/[0.08] text-foreground"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs mb-1 block">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="bg-white/[0.04] border-white/[0.08] text-foreground pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors z-10"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Admin?{" "}
          <a href="/" className="text-primary hover:underline">Go to admin dashboard</a>
        </p>
      </div>
    </div>
  );
}

function MemberPortalView({ member, tasks, sidebarOpen, setSidebarOpen, onLogout }) {
  const hasPermission = (perm) => member?.permissions?.includes(perm);
  
  const openTasks = tasks.filter(t => t.status !== "completed");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed");

  const navLinks = [
    { label: "My Tasks", href: "#tasks", icon: CheckSquare },
    { label: "Agent Chat", href: "/member-chat", icon: MessageSquare },
    ...(hasPermission("view_team") || hasPermission("add_team") ? [{ label: "Team", href: "/member-team", icon: Users }] : []),
    ...(hasPermission("view_departments") || hasPermission("add_departments") ? [{ label: "Departments", href: "/member-departments", icon: Building2 }] : []),
    ...(hasPermission("view_reports") || hasPermission("company_wide_reports") ? [{ label: "Reports", href: "/member-reports", icon: BarChart2 }] : []),
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
          {navLinks.map(({ label, href, icon: IconComponent }) => {
            if (href.startsWith('#')) {
              return (
                <a key={label} href={href}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-all min-w-0"
                  onClick={() => setSidebarOpen(false)}>
                  <IconComponent className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{label}</span>
                </a>
              );
            }
            return (
              <Link key={label} to={href}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-all min-w-0"
                onClick={() => setSidebarOpen(false)}>
                <IconComponent className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
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
            <button onClick={onLogout}
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
    </div>
  );
}