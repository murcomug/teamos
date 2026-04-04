import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useMemberSession } from "@/lib/MemberSessionContext";
import { CheckSquare, AlertCircle, Clock, MessageSquare, Users, Building2, BarChart2, Menu, X, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import UserAvatar from "../components/shared/UserAvatar";
import { useState } from "react";

export default function MemberPortal() {
  const navigate = useNavigate();
  const { memberSession, logout, loading: sessionLoading } = useMemberSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    { label: "Agent Chat", href: "/member-chat", icon: MessageSquare },
    ...(hasPermission("view_team") || hasPermission("add_team") ? [{ label: "Team", href: "/member-team", icon: Users }] : []),
    ...(hasPermission("view_departments") || hasPermission("add_departments") ? [{ label: "Departments", href: "/member-departments", icon: Building2 }] : []),
    ...(hasPermission("view_reports") || hasPermission("company_wide_reports") ? [{ label: "Reports", href: "/member-reports", icon: BarChart2 }] : []),
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
        
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
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