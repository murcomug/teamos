import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMemberSession } from "@/lib/MemberSessionContext";
import { CheckCircle } from "lucide-react";
import moment from "moment";
import PriorityBadge from "../components/shared/PriorityBadge";

export default function MemberCompletedItems() {
  const { memberSession } = useMemberSession();
  const [completedTasks, setCompletedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!memberSession) return;

    const loadData = async () => {
      try {
        const tasks = await base44.entities.Task.list();
        const completed = (tasks || []).filter(t => 
          t.status === "completed" && 
          (t.assignee === memberSession.name || t.department === memberSession.department)
        );
        setCompletedTasks(completed);
      } catch (err) {
        console.error("Error loading completed tasks:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    const unsubscribe = base44.entities.Task.subscribe((event) => {
      if (event.type === "update" && event.data?.status === "completed") {
        setCompletedTasks(prev => {
          const exists = prev.find(t => t.id === event.id);
          return exists ? prev : [event.data, ...prev];
        });
      } else if (event.type === "delete") {
        setCompletedTasks(prev => prev.filter(t => t.id !== event.id));
      }
    });

    return unsubscribe;
  }, [memberSession]);

  const filteredTasks = completedTasks.filter(t =>
    (t.assignee === memberSession?.name || t.department === memberSession?.department) &&
    (t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Completed Tasks</h1>
        <p className="text-muted-foreground text-sm mt-1">View your finished work</p>
      </div>

      <input
        type="text"
        placeholder="Search completed tasks..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full mb-6 px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <CheckCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No completed tasks yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => (
            <div key={task.id} className="glass-card glass-card-hover rounded-xl p-4 transition-all">
              <div className="flex items-start gap-4">
                <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate line-through opacity-75">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <PriorityBadge priority={task.priority} />
                    {task.assignee && (
                      <span className="text-[11px] text-muted-foreground font-mono px-2 py-0.5 rounded bg-white/[0.04]">
                        {task.assignee}
                      </span>
                    )}
                    {task.updated_date && (
                      <span className="text-[11px] font-mono text-muted-foreground">
                        Completed {moment(task.updated_date).format("MMM D, YYYY")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}