import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

const COLORS = ["#2dd4bf", "#818cf8", "#f472b6", "#fb923c", "#34d399"];

export default function Reports() {
  const { currentUser, isAdmin, canViewCompanyReports } = useCurrentUser();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [velocityPeriod, setVelocityPeriod] = useState("month");

  useEffect(() => {
    if (!currentUser) return;
    const taskFetch = canViewCompanyReports
      ? base44.entities.Task.list()
      : base44.entities.Task.filter({ department: currentUser.department });
    Promise.all([
      taskFetch,
      base44.entities.TeamMember.list(),
      base44.entities.Department.list(),
    ]).then(([t, m, d]) => {
      setTasks(t || []);
      setMembers(m);
      setDepartments(d);
      setLoading(false);
    });
  }, [currentUser?.id, canViewCompanyReports]);

  // Calculate velocity by period
  const getVelocityData = () => {
    let startDate;
    let groupBy;

    if (velocityPeriod === "week") {
      startDate = moment().subtract(4, "weeks");
      groupBy = (d) => moment(d).format("YYYY-WW");
    } else if (velocityPeriod === "month") {
      startDate = moment().subtract(12, "months");
      groupBy = (d) => moment(d).format("YYYY-MM");
    } else {
      startDate = moment().subtract(4, "quarters");
      groupBy = (d) => moment(d).format("YYYY[Q]Q");
    }

    const completedTasks = tasks.filter((t) => t.status === "completed" && moment(t.updated_date) >= startDate);
    const periodGroups = {};

    completedTasks.forEach((task) => {
      const period = groupBy(task.updated_date);
      if (!periodGroups[period]) periodGroups[period] = { period, tasks: 0, tickets: 0 };
      if (task.is_support_ticket) periodGroups[period].tickets++;
      else periodGroups[period].tasks++;
    });

    return Object.values(periodGroups).sort((a, b) => a.period.localeCompare(b.period));
  };

  // Velocity by team member
  const getMemberVelocity = () => {
    let startDate;
    if (velocityPeriod === "week") startDate = moment().subtract(1, "weeks");
    else if (velocityPeriod === "month") startDate = moment().subtract(1, "months");
    else startDate = moment().subtract(3, "months");

    const memberStats = {};
    tasks.filter((t) => t.status === "completed" && moment(t.updated_date) >= startDate).forEach((task) => {
      if (!task.assignee) return;
      if (!memberStats[task.assignee]) memberStats[task.assignee] = 0;
      memberStats[task.assignee]++;
    });

    return Object.entries(memberStats).map(([name, count]) => ({ name, completed: count })).sort((a, b) => b.completed - a.completed).slice(0, 10);
  };

  // Velocity by department
  const getDepartmentVelocity = () => {
    let startDate;
    if (velocityPeriod === "week") startDate = moment().subtract(1, "weeks");
    else if (velocityPeriod === "month") startDate = moment().subtract(1, "months");
    else startDate = moment().subtract(3, "months");

    const deptStats = {};
    tasks.filter((t) => t.status === "completed" && moment(t.updated_date) >= startDate).forEach((task) => {
      const dept = task.department || "Unassigned";
      if (!deptStats[dept]) deptStats[dept] = 0;
      deptStats[dept]++;
    });

    return Object.entries(deptStats).map(([name, count]) => ({ name, completed: count })).sort((a, b) => b.completed - a.completed);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const velocityData = getVelocityData();
  const memberVelocity = getMemberVelocity();
  const departmentVelocity = getDepartmentVelocity();

  // Data for charts
  const statusData = ["pending", "ongoing", "stopped", "completed"].map((s) => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    count: tasks.filter((t) => t.status === s).length,
  }));

  const deptData = departments.map((d) => ({
    name: d.name.length > 12 ? d.name.slice(0, 12) + "…" : d.name,
    tasks: tasks.filter((t) => t.department === d.name).length,
  }));

  const priorityData = ["critical", "high", "medium", "low"].map((p) => ({
    name: p.charAt(0).toUpperCase() + p.slice(1),
    value: tasks.filter((t) => t.priority === p).length,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div style={{ background: "#1a1a28", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px" }}>
          <p style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{label || payload[0].name}</p>
          <p style={{ color: "#2dd4bf", fontSize: 13, fontFamily: "monospace", fontWeight: 700 }}>{payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  const tickStyle = { fill: "#94a3b8", fontSize: 12, fontWeight: 500 };

  return (
    <div className="space-y-8 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Task analytics and team performance</p>
        </div>
        <div className="w-40">
          <Select value={velocityPeriod} onValueChange={setVelocityPeriod}>
            <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-foreground text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
              <SelectItem value="week" className="text-foreground">Weekly</SelectItem>
              <SelectItem value="month" className="text-foreground">Monthly</SelectItem>
              <SelectItem value="quarter" className="text-foreground">Quarterly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Velocity Section */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-foreground">Task Completion Velocity</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Completion Over Time */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Completion Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={velocityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="period" tick={tickStyle} axisLine={false} tickLine={false} />
                <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="tasks" stroke="#2dd4bf" strokeWidth={2} />
                <Line type="monotone" dataKey="tickets" stroke="#f472b6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Member Velocity */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Top Performers</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={memberVelocity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={120} tick={tickStyle} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="completed" fill="#818cf8" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Velocity */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Completion by Department</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={departmentVelocity}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={tickStyle} axisLine={false} tickLine={false} />
              <YAxis tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="completed" fill="#34d399" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Existing Charts */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-foreground">Overall Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Chart */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Tasks by Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={tickStyle} axisLine={false} tickLine={false} />
              <YAxis tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="hsl(174, 72%, 50%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Distribution */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Priority Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={priorityData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                paddingAngle={4} dataKey="value"
                label={({ name, value, cx, x, y }) => (
                  <text x={x} y={y} fill="#cbd5e1" fontSize={12} fontWeight={500} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central">
                    {`${name}: ${value}`}
                  </text>
                )}
                labelLine={{ stroke: "rgba(255,255,255,0.2)" }}
              >
                {priorityData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Department Workload */}
        <div className="glass-card rounded-xl p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Department Workload</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={deptData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={110} tick={tickStyle} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="tasks" fill="hsl(174, 72%, 50%)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        </div>
      </div>
    </div>
  );
}