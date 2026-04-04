import { Search, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";

export default function TopBar() {
  const [user, setUser] = useState(null);
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-white/[0.06]"
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
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
        </Link>
        
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-primary text-xs font-semibold">{initials}</span>
        </div>
      </div>
    </header>
  );
}