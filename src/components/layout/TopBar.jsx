import { Search, Bell, LogOut, Settings } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function TopBar() {
  const { currentUser, logout } = useCurrentUser();
  const [searchValue, setSearchValue] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!currentUser?.email) return;
    base44.entities.Notification.filter({ read: false, target_user: currentUser.email })
      .then((n) => setUnreadCount(n?.length || 0))
      .catch(() => {});
  }, [currentUser?.email]);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initials = currentUser?.name
    ? currentUser.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const handleLogout = () => logout();

  return (
    <header className="hidden md:flex h-16 items-center justify-between px-6 border-b border-white/[0.06]"
      style={{ background: "rgba(10, 10, 18, 0.8)", backdropFilter: "blur(12px)" }}>
      
      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search tasks, people, departments..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full h-9 pl-10 pr-4 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:bg-white/[0.06] transition-all"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4 ml-4">
        <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-white/[0.04] transition-colors">
          <Bell className="h-[18px] w-[18px] text-muted-foreground" />
          {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />}
        </Link>
        
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors cursor-pointer"
          >
            <span className="text-primary text-xs font-semibold">{initials}</span>
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-10 w-52 bg-[#1a1a24] border border-white/[0.08] rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <p className="text-sm font-medium text-foreground truncate">{currentUser?.name || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
              </div>
              <Link to="/settings" onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/[0.08] transition-colors">
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}