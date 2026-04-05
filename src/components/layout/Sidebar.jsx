import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, MessageSquare, CheckSquare, Users, Building2, 
  BarChart3, Bell, Settings, ChevronLeft, ChevronRight, ChevronDown, Menu, X, Headset, CheckCircle2, History, Briefcase, Bot
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/chat", icon: MessageSquare, label: "Agent Chat" },
  { path: "/tasks", icon: CheckSquare, label: "Tasks" },
  { path: "/support-tickets", icon: Headset, label: "Support Tickets" },
  { path: "/completed-items", icon: CheckCircle2, label: "Completed" },
  {
    label: "Company", icon: Building2,
    children: [
      { path: "/team", icon: Users, label: "Team" },
      { path: "/departments", icon: Building2, label: "Departments" },
    ]
  },
  { path: "/reports", icon: BarChart3, label: "Reports" },
  { path: "/sales-erp", icon: Briefcase, label: "Sales CRM" },
  { path: "/notifications", icon: Bell, label: "Notifications" },
  { path: "/agent-management", icon: Bot, label: "Agents" },
  { path: "/settings", icon: Settings, label: "Settings" },
  { path: "/activity-log", icon: History, label: "Activity Log" },
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(["Company"]);

  const toggleGroup = (label) => {
    setExpandedGroups(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);
  };

  const isGroupActive = (children) => children.some(c => location.pathname === c.path);

  const NavLink = ({ item }) => {
    const isActive = location.pathname === item.path;
    return (
      <Link
        to={item.path}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
          ${isActive 
            ? "bg-primary/10 text-primary" 
            : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
          }`}
      >
        <item.icon className={`h-[18px] w-[18px] flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile top bar trigger */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 z-50 flex items-center justify-between px-4 border-b border-white/[0.06]"
        style={{ background: "rgba(10,10,18,0.95)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold text-xs">T</span>
          </div>
          <span className="font-semibold text-foreground text-base tracking-tight">
            Team<span className="text-primary">OS</span>
          </span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-foreground transition-colors">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 flex flex-col h-full z-10"
            style={{ background: "rgba(10,10,18,0.98)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="h-14 flex items-center justify-between px-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-bold text-xs">T</span>
                </div>
                <span className="font-semibold text-foreground text-base">Team<span className="text-primary">OS</span></span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                if (item.children) {
                  const isActive = isGroupActive(item.children);
                  const isExpanded = expandedGroups.includes(item.label);
                  return (
                    <div key={item.label}>
                      <button onClick={() => toggleGroup(item.label)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                          ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"}`}>
                        <item.icon className={`h-[18px] w-[18px] flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                      {isExpanded && (
                        <div className="ml-4 mt-1 space-y-1 border-l border-white/[0.06] pl-3">
                          {item.children.map(child => {
                            const childActive = location.pathname === child.path;
                            return (
                              <Link key={child.path} to={child.path} onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
                                  ${childActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"}`}>
                                <child.icon className={`h-[16px] w-[16px] flex-shrink-0 ${childActive ? "text-primary" : ""}`} />
                                <span>{child.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }
                return <NavLink key={item.path} item={item} />;
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={`hidden md:flex fixed left-0 top-0 h-screen z-40 flex-col transition-all duration-300 ${collapsed ? "w-[68px]" : "w-[240px]"}`}
        style={{ background: "rgba(10, 10, 18, 0.95)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        
        <div className="h-16 flex items-center px-4 border-b border-white/[0.06]">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold text-sm">T</span>
          </div>
          {!collapsed && (
            <span className="ml-3 font-semibold text-foreground text-lg tracking-tight">
              Team<span className="text-primary">OS</span>
            </span>
          )}
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            if (item.children) {
              const isActive = isGroupActive(item.children);
              const isExpanded = expandedGroups.includes(item.label);
              return (
                <div key={item.label}>
                  <button
                    onClick={() => !collapsed && toggleGroup(item.label)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                      ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"}`}
                  >
                    <item.icon className={`h-[18px] w-[18px] flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </>
                    )}
                  </button>
                  {isExpanded && !collapsed && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-white/[0.06] pl-3">
                      {item.children.map(child => {
                        const childActive = location.pathname === child.path;
                        return (
                          <Link key={child.path} to={child.path}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                              ${childActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"}`}>
                            <child.icon className={`h-[16px] w-[16px] flex-shrink-0 ${childActive ? "text-primary" : ""}`} />
                            <span>{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                  }`}
              >
                <item.icon className={`h-[18px] w-[18px] flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/[0.06]">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>
    </>
  );
}