export default function DepartmentHealth({ departments, tasks }) {
  const deptStats = departments.map((dept) => {
    const deptTasks = tasks.filter((t) => t.department === dept.name);
    const open = deptTasks.filter((t) => t.status !== "completed").length;
    const overdue = deptTasks.filter((t) => {
      if (t.status === "completed") return false;
      return t.due_date && new Date(t.due_date) < new Date();
    }).length;
    const health = overdue > 2 ? "red" : overdue > 0 ? "amber" : "green";
    return { ...dept, open, overdue, health };
  });

  const dotColor = {
    green: "bg-emerald-400",
    amber: "bg-amber-400",
    red: "bg-red-400",
  };

  return (
    <div className="glass-card rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Department Health</h3>
      <div className="space-y-3">
        {deptStats.slice(0, 4).map((dept) => (
          <div key={dept.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center gap-3">
              <span className={`h-2.5 w-2.5 rounded-full ${dotColor[dept.health]}`} />
              <span className="text-sm text-foreground">{dept.icon} {dept.name}</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-muted-foreground">{dept.open} open</span>
              {dept.overdue > 0 && (
                <span className="text-red-400">{dept.overdue} overdue</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}