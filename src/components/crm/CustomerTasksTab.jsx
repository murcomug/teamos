import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import TaskEditModal from "@/components/shared/TaskEditModal";

export default function CustomerTasksTab({ customerId, customerName, currentUser, members }) {
  const [tasks, setTasks] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    base44.entities.Task.filter({ customer_id: customerId }).then(setTasks);
    base44.entities.Department.list().then(setDepartments);
  }, [customerId]);

  const handleSave = async (form) => {
    const created = await base44.entities.Task.create({
      ...form,
      customer_id: customerId,
      customer_name: customerName,
      is_support_ticket: false,
    });
    setTasks(p => [created, ...p]);
    setShowCreate(false);
  };

  const STATUS_COLOR = {
    pending: "bg-slate-400/15 text-slate-400",
    ongoing: "bg-primary/15 text-primary",
    stopped: "bg-red-400/15 text-red-400",
    completed: "bg-emerald-400/15 text-emerald-400",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Tasks ({tasks.length})</h3>
        <Button size="sm" onClick={() => setShowCreate(true)}
          className="text-xs gap-1 bg-primary/15 text-primary hover:bg-primary/25 border-0">
          <Plus className="h-3 w-3" /> Add Task
        </Button>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No tasks linked to this customer.</p>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          {tasks.map(t => (
            <div key={t.id} className="flex items-center gap-3 py-3 px-4 border-b border-white/[0.03] last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${STATUS_COLOR[t.status] || ""}`}>{t.status}</span>
              {t.assignee && <span className="text-xs text-muted-foreground">{t.assignee}</span>}
            </div>
          ))}
        </div>
      )}
      <TaskEditModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        task={{ customer_id: customerId, customer_name: customerName }}
        onSave={handleSave}
        members={members}
        departments={departments}
        allTasks={tasks}
      />
    </div>
  );
}