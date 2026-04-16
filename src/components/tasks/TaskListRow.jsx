import PriorityBadge from "../shared/PriorityBadge";
import StatusBadge from "../shared/StatusBadge";
import UserAvatar from "../shared/UserAvatar";
import { Calendar, Pencil, AlertTriangle, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

export default function TaskListRow({ task, onStatusChange, onEdit, onDelete, members, allTasks = [], isTableRow = false }) {
  const member = members.find((m) => m.name === task.assignee);
  const blockers = allTasks.filter(t => task.blocking_task_ids?.includes(t.id));
  const pendingBlockers = blockers.filter(t => t.status !== "completed");

  const handleStatusChange = (newStatus) => {
    if (newStatus === "completed" && pendingBlockers.length > 0) {
      alert(`Cannot complete: ${pendingBlockers.length} blocking task(s) still pending.`);
      return;
    }
    onStatusChange(task.id, newStatus);
  };

  if (isTableRow) {
    return (
      <div className="flex items-center gap-3 py-3 px-4 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
        <div className="flex-1 min-w-[250px] min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
            {pendingBlockers.length > 0 && (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
            )}
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>
          )}
        </div>
        <div className="w-16 flex-shrink-0">
          {task.assignee && <UserAvatar name={task.assignee} color={member?.avatar_color} size="xs" />}
        </div>
        <div className="w-20 flex-shrink-0">
          <PriorityBadge priority={task.priority} />
        </div>
        <div className="w-16 flex-shrink-0 text-xs text-muted-foreground font-mono truncate">
          {task.department || "—"}
        </div>
        <div className="w-16 flex-shrink-0 text-xs text-muted-foreground whitespace-nowrap">
          {task.due_date ? moment(task.due_date).format("MMM D") : "—"}
        </div>
        <div className="w-20 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <Select value={task.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-7 text-[11px] bg-white/[0.03] border-white/[0.06] text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
              {["pending","ongoing","stopped","completed"].map(s => (
                <SelectItem key={s} value={s} className="text-foreground text-xs capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-12 flex-shrink-0 flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="p-1 rounded-md hover:bg-white/[0.06] transition-all"
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            className="p-1 rounded-md hover:bg-red-500/10 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-400" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-white/[0.03] transition-colors group border-b border-white/[0.03] last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
          {pendingBlockers.length > 0 && (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
          )}
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>
        )}
        {pendingBlockers.length > 0 && (
          <p className="text-[11px] text-amber-300 mt-0.5">Blocked by {pendingBlockers.length} task(s)</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {task.assignee && <UserAvatar name={task.assignee} color={member?.avatar_color} size="xs" />}
      </div>

      <div className="w-24 flex-shrink-0">
        <PriorityBadge priority={task.priority} />
      </div>

      <div className="w-20 flex-shrink-0 text-xs text-muted-foreground font-mono">
        {task.department}
      </div>

      <div className="w-20 flex-shrink-0">
        {task.due_date && (
          <span className={`text-[11px] font-mono flex items-center gap-1 ${
            new Date(task.due_date) < new Date() && task.status !== "completed" ? "text-red-400" : "text-muted-foreground"
          }`}>
            <Calendar className="h-3 w-3" />
            {moment(task.due_date).format("MMM D")}
          </span>
        )}
      </div>

      <div className="w-28 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <Select value={task.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-7 text-[11px] bg-white/[0.03] border-white/[0.06] text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
              {["pending","ongoing","stopped","completed"].map(s => (
                <SelectItem key={s} value={s} className="text-foreground text-xs capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          className="p-1.5 rounded-md hover:bg-white/[0.06] transition-all flex-shrink-0"
        >
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          className="p-1.5 rounded-md hover:bg-red-500/10 transition-all flex-shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5 text-red-400" />
        </button>
      </div>
    </div>
  );
}