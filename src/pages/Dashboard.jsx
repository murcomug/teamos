import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { CheckSquare, AlertTriangle, TrendingUp, Users, MessageSquare } from "lucide-react";
import StatCard from "../components/shared/StatCard";
import DepartmentHealth from "../components/dashboard/DepartmentHealth";
import RecentActivity from "../components/dashboard/RecentActivity";
import { useCurrentUser } from "@/lib/useCurrentUser";
import moment from "moment";
import PriorityBadge from "../components/shared/PriorityBadge";
import StatusBadge from "../components/shared/StatusBadge";

export default function Dashboard() {
  const { currentUser, isAdmin } = useCurrentUser();
  const [tasks, setTasks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [members, setMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    if (isAdmin) {
      Promise.all([
        base44.entities.Task.list(),
        base44.entities.Department.list(),
        base44.entities.TeamMember.list(),
        base44.entities.ActivityLog.list("-created_date", 10),
      ]).then(([t, d, m, a]) => {
        setTasks(t);
        setDepartments(d);
        setMembers(m);
        setActivities(a);
        setLoading(false);
      });
    } else {
      // Operator: load only their own tasks
      Promise.all([
        base44.entities.Task.filter({ assignee: currentUser.name }),
        base44.entities.Department.list(),
        base44.entities.TeamMember.list(),
      ]).then(([t, d, m]) => {
        setTasks(t || []);
        setDepartments(d);
        setMembers(m);
        setActivities([]);
        setLoading(false);
      });
    }
  }, [currentUser?.id, isAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const openTasks = tasks.filter((t) => t.status !== "completed").length;
  const overdue = tasks.filter((t) => t.status !== "completed" && t.due_date && new Date(t.due_date) < new Date()).length;
  const completedThisWeek = tasks.filter((t) => {
    if (t.status !== "completed") return false;
    const d = new Date(t.updated_date);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo;
  }).length;

  // Operator view: personal task list
  if (!isAdmin && !loading) {
    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed");
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">My Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome back, {currentUser?.name}</p>
          </div>
          <Link to="/chat" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors glow-primary">
            <MessageSquare className="h-4 w-4" />
            Agent Chat
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <StatCard label="Open Tasks" value={openTasks} icon={CheckSquare} color="text-primary" />
          <StatCard label="Overdue" value={overdue} icon={AlertTriangle} color="text-red-400" />
          <StatCard label="Completed This Week" value={completedThisWeek} icon={TrendingUp} color="text-emerald-400" />
        </div>
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
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{task.title}</h3>
                    {task.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <PriorityBadge priority={task.priority} />
                      <StatusBadge status={task.status} />
                      {task.department && <span className="text-[11px] text-muted-foreground font-mono px-2 py-0.5 rounded bg-white/[0.04]">{task.department}</span>}
                      {task.due_date && <span className={`text-[11px] font-mono ${isOverdue ? "text-red-400" : "text-muted-foreground"}`}>Due {moment(task.due_date).format("MMM D, YYYY")}{isOverdue && " (overdue)"}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your team's operations</p>
        </div>
        <Link
          to="/chat"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors glow-primary"
        >
          <MessageSquare className="h-4 w-4" />
          New Task via Chat
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Open Tasks" value={openTasks} icon={CheckSquare} color="text-primary" />
        <StatCard label="Overdue" value={overdue} icon={AlertTriangle} color="text-red-400" />
        <StatCard label="Completed This Week" value={completedThisWeek} icon={TrendingUp} color="text-emerald-400" />
        <StatCard label="Team Members" value={members.length} icon={Users} color="text-violet-400" />
      </div>

      {/* Department Health + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DepartmentHealth departments={departments} tasks={tasks} />
        <RecentActivity activities={activities} />
      </div>
    </div>
  );
}