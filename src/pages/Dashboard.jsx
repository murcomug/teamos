import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { CheckSquare, AlertTriangle, TrendingUp, Users, MessageSquare } from "lucide-react";
import StatCard from "../components/shared/StatCard";
import DepartmentHealth from "../components/dashboard/DepartmentHealth";
import RecentActivity from "../components/dashboard/RecentActivity";

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [members, setMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

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