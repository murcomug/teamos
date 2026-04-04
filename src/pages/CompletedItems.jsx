import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Search } from "lucide-react";

export default function CompletedItems() {
  const [completedTasks, setCompletedTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");

  const loadData = () => {
    Promise.all([
      base44.entities.Task.list(),
      base44.entities.TeamMember.list(),
    ]).then(([tasks, m]) => {
      setCompletedTasks(tasks.filter((t) => t.status === "completed"));
      setMembers(m);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
    const unsubscribe = base44.entities.Task.subscribe((event) => {
      if (event.type === "update" && event.data?.status === "completed") {
        setCompletedTasks((prev) => [event.data, ...prev.filter((t) => t.id !== event.id)]);
      } else if (event.type === "update" && event.data?.status !== "completed") {
        setCompletedTasks((prev) => prev.filter((t) => t.id !== event.id));
      } else if (event.type === "delete") {
        setCompletedTasks((prev) => prev.filter((t) => t.id !== event.id));
      }
    });
    return unsubscribe;
  }, []);

  const filtered = completedTasks.filter((t) => {
    const matchesSearch = t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase());
    const matchesAssignee = !filterAssignee || t.assignee === filterAssignee;
    return matchesSearch && matchesAssignee;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Completed Items</h1>
          <p className="text-sm text-muted-foreground mt-1">{completedTasks.length} completed tasks & tickets</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-10 pr-4 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-all"
          />
        </div>

        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-foreground focus:outline-none focus:border-primary/40 transition-all"
        >
          <option value="">All assignees</option>
          {members.map((m) => (
            <option key={m.id} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="flex items-center gap-4 py-3 px-4 border-b border-white/[0.06] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="flex-1">Title</div>
          <div className="w-24">Type</div>
          <div className="w-32">Assignee</div>
          <div className="w-24">Completed</div>
        </div>

        {filtered.length > 0 ? (
          filtered.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 py-3 px-4 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                {item.description && (
                  <p className="text-xs text-muted-foreground truncate mt-1">{item.description}</p>
                )}
              </div>

              <div className="w-24 flex-shrink-0">
                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                  item.is_support_ticket
                    ? "bg-orange-500/15 text-orange-300"
                    : "bg-primary/15 text-primary"
                }`}>
                  {item.is_support_ticket ? "Ticket" : "Task"}
                </span>
              </div>

              <div className="w-32 flex-shrink-0 text-sm text-foreground">
                {item.assignee || "Unassigned"}
              </div>

              <div className="w-24 flex-shrink-0 text-xs text-muted-foreground font-mono">
                {new Date(item.updated_date).toLocaleDateString()}
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No completed items</p>
          </div>
        )}
      </div>
    </div>
  );
}