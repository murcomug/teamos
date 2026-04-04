import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMemberSession } from "@/lib/MemberSessionContext";
import { CheckSquare, AlertCircle, Clock } from "lucide-react";
import moment from "moment";
import PriorityBadge from "../components/shared/PriorityBadge";
import StatusBadge from "../components/shared/StatusBadge";

export default function MemberDashboard() {
  const { memberSession } = useMemberSession();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!memberSession) return;

    const loadTasks = async () => {
      try {
        const memberTasks = await base44.entities.Task.filter({ assignee: memberSession.name });
        setTasks(memberTasks || []);
      } catch (err) {
        console.error("Error loading tasks:", err);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [memberSession]);

  const openTasks = tasks.filter(t => t.status !== "completed");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed");

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">My Tasks</h1>
        <p className="text-muted-foreground text-sm mt-1">Your assigned tasks and work items</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 md:gap-4 mb-8">
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
        </>
      )}
    </div>
  );
}