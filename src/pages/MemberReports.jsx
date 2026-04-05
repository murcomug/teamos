import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart3, TrendingUp } from "lucide-react";
import { useMemberSession } from "@/lib/MemberSessionContext";
import { startOfWeek, startOfMonth, subMonths, isAfter } from "date-fns";

function getStartDate(period) {
  const now = new Date();
  if (period === "week") return startOfWeek(now, { weekStartsOn: 1 });
  if (period === "month") return startOfMonth(now);
  if (period === "quarter") return startOfMonth(subMonths(now, 2));
  return null;
}

function computeStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === "completed").length;
  const pending = tasks.filter(t => t.status === "pending").length;
  const ongoing = tasks.filter(t => t.status === "ongoing").length;
  return { total, completed, pending, ongoing, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

export default function MemberReportsContent() {
  const { memberSession } = useMemberSession();
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("mine");
  const [period, setPeriod] = useState("month");

  useEffect(() => {
    if (!memberSession) return;
    base44.entities.Task.list().then(t => {
      setAllTasks(t || []);
      setLoading(false);
    });
  }, [memberSession]);

  const filteredTasks = useMemo(() => {
    const startDate = getStartDate(period);
    return allTasks.filter(t => {
      const inScope = view === "mine"
        ? t.assignee === memberSession?.name
        : t.department === memberSession?.department;
      const inPeriod = startDate ? isAfter(new Date(t.created_date || 0), startDate) : true;
      return inScope && inPeriod;
    });
  }, [allTasks, view, period, memberSession]);

  const stats = useMemo(() => computeStats(filteredTasks), [filteredTasks]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">Task analytics and insights</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex rounded-lg overflow-hidden border border-white/[0.08]">
          {["mine", "department"].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-2 text-sm font-medium transition-all ${
                view === v ? "bg-primary text-primary-foreground" : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]"
              }`}>
              {v === "mine" ? "My Tasks" : "Department"}
            </button>
          ))}
        </div>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-white/[0.08] bg-white/[0.04] text-foreground focus:outline-none focus:border-primary/40 cursor-pointer"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Tasks", value: stats.total, icon: BarChart3, color: "text-blue-400" },
              { label: "Completed", value: stats.completed, icon: TrendingUp, color: "text-emerald-400" },
              { label: "Pending", value: stats.pending, icon: BarChart3, color: "text-yellow-400" },
              { label: "Completion Rate", value: `${stats.completionRate}%`, icon: TrendingUp, color: "text-primary" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="glass-card rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">{label}</p>
                    <p className={`text-3xl font-bold ${color}`}>{value}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${color} opacity-20`} />
                </div>
              </div>
            ))}
          </div>

          <div className="glass-card rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Task Distribution</h3>
            <div className="space-y-3">
              {[
                { status: "Completed", count: stats.completed, color: "bg-emerald-400" },
                { status: "Ongoing", count: stats.ongoing, color: "bg-blue-400" },
                { status: "Pending", count: stats.pending, color: "bg-yellow-400" },
              ].map(({ status, count, color }) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{status}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-white/[0.05] rounded-full overflow-hidden">
                      <div className={`h-full ${color}`} style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-foreground w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}