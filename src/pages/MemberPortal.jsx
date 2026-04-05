import { useEffect, useState } from "react";
import { Outlet, useNavigate, Link } from "react-router-dom";
import { useMemberSession } from "@/lib/MemberSessionContext";
import { CheckSquare, Ticket, MessageSquare, Users, Building2, BarChart2, Menu, X, LogOut, CheckCircle, Bell, Briefcase, ChevronDown } from "lucide-react";
import UserAvatar from "../components/shared/UserAvatar";

export default function MemberPortal() {
  const navigate = useNavigate();
  const { memberSession, logout, loading: sessionLoading } = useMemberSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(["Company"]);

  const toggleGroup = (label) => setExpandedGroups(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);

  useEffect(() => {
    if (!memberSession && !sessionLoading) {
      navigate("/member-login");
    }
  }, [memberSession, sessionLoading, navigate]);

  if (!memberSession) {
    return null;
  }

  const hasPermission = (perm) => memberSession?.permissions?.includes(perm);

  const navLinks = [
    { label: "Dashboard", href: "/member-portal", icon: CheckSquare },
    { label: "Agent Chat", href: "/member-chat", icon: MessageSquare },
    { label: "Tasks", href: "/member-tasks", icon: CheckSquare },
    { label: "Support Tickets", href: "/member-support-tickets", icon: Ticket },
    { label: "Completed", href: "/member-completed", icon: CheckCircle },
    { label: "Notifications", href: "/member-notifications", icon: Bell },
    {
      label: "Company", icon: Building2,
      children: [
        { href: "/member-team", label: "Team", icon: Users },
        { href: "/member-departments", label: "Departments", icon: Building2 },
      ]
    },
    ...(hasPermission("view_reports") || hasPermission("company_wide_reports") || memberSession?.role === "admin" ? [{ label: "Reports", href: "/member-reports", icon: BarChart2 }] : []),
    ...(memberSession?.department === "Sales" || memberSession?.role === "admin" ? [{ label: "Sales CRM", href: "/member-erp", icon: Briefcase }] : []),
  ];

  return (
    <div className="fixed inset-0 flex" style={{ background: "#0a0a0f" }}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-white/[0.06] transition-transform md:relative md:translate-x-0 overflow-hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "rgba(10, 10, 15, 0.95)" }}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/[0.06] flex-shrink-0">
          <span className="text-gradient font-bold text-lg">TeamOS</span>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {navLinks.map((item) => {
            if (item.children) {
              const isExpanded = expandedGroups.includes(item.label);
              return (
                <div key={item.label}>
                  <button onClick={() => toggleGroup(item.label)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-all">
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-white/[0.06] pl-3">
                      {item.children.map(child => (
                        <Link key={child.href} to={child.href} onClick={() => setSidebarOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-all">
                          <child.icon className="h-4 w-4 flex-shrink-0" />
                          <span>{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <Link key={item.label} to={item.href}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-all min-w-0"
                onClick={() => setSidebarOpen(false)}>
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/[0.06] flex-shrink-0"
          style={{ background: "rgba(10, 10, 18, 0.8)", backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 hover:bg-white/[0.05] rounded-lg">
              <Menu className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-foreground">{memberSession.name}</p>
              <p className="text-xs text-muted-foreground">{memberSession.department}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <UserAvatar name={memberSession.name} color={memberSession.avatar_color} size="sm" />
            <button onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.06] border border-white/[0.06] transition-all">
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}