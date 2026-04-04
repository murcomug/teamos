import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Filter } from "lucide-react";
import moment from "moment";

const actionIcons = {
  TASK_STATUS_CHANGED: { label: "Task Status Changed", color: "text-blue-400", bg: "bg-blue-500/15" },
  TASK_DELETED: { label: "Task Deleted", color: "text-red-400", bg: "bg-red-500/15" },
  TASK_CREATED: { label: "Task Created", color: "text-emerald-400", bg: "bg-emerald-500/15" },
  TEAM_MEMBER_ADDED: { label: "Team Member Added", color: "text-violet-400", bg: "bg-violet-500/15" },
  TEAM_MEMBER_DELETED: { label: "Team Member Deleted", color: "text-red-400", bg: "bg-red-500/15" },
};

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");

  useEffect(() => {
    base44.entities.ActivityLog.list('-created_date', 100).then((data) => {
      setLogs(data);
      setLoading(false);
    });

    const unsubscribe = base44.entities.ActivityLog.subscribe((event) => {
      if (event.type === "create") {
        setLogs((prev) => [event.data, ...prev]);
      }
    });

    return unsubscribe;
  }, []);

  const filtered = logs.filter((log) => {
    const matchesSearch = log.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.description?.toLowerCase().includes(search.toLowerCase()) ||
      log.action?.toLowerCase().includes(search.toLowerCase());
    const matchesAction = filterAction === "all" || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const uniqueActions = [...new Set(logs.map((l) => l.action).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Activity Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Track operational events and changes</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-10 pr-4 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-all"
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-foreground focus:outline-none focus:border-primary/40 transition-all"
        >
          <option value="all">All Actions</option>
          {uniqueActions.map((action) => (
            <option key={action} value={action}>
              {actionIcons[action]?.label || action}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {filtered.length > 0 ? (
          filtered.map((log) => {
            const actionConfig = actionIcons[log.action] || { label: log.action, color: "text-gray-400", bg: "bg-gray-500/15" };
            return (
              <div
                key={log.id}
                className="glass-card rounded-lg p-4 hover:bg-white/[0.03] transition-colors border border-white/[0.04]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`px-2.5 py-1.5 rounded-lg ${actionConfig.bg} flex-shrink-0 mt-0.5`}>
                      <span className={`text-xs font-semibold ${actionConfig.color}`}>
                        {log.action?.split('_')[0]}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{actionConfig.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{log.description}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {log.user_name && (
                          <span className="text-xs px-2 py-0.5 rounded bg-white/[0.04] text-muted-foreground">
                            By: {log.user_name}
                          </span>
                        )}
                        {log.entity_type && (
                          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                            {log.entity_type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-muted-foreground font-mono">
                      {moment(log.created_date).fromNow()}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {moment(log.created_date).format("MMM D, YYYY HH:mm")}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="glass-card rounded-lg p-8 text-center">
            <p className="text-sm text-muted-foreground">No activity logs found</p>
          </div>
        )}
      </div>
    </div>
  );
}