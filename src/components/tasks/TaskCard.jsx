import PriorityBadge from "../shared/PriorityBadge";
import UserAvatar from "../shared/UserAvatar";
import { Calendar, Pencil, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

export default function TaskCard({ task, onStatusChange, onEdit, members, allTasks = [] }) {
  const member = members.find((m) => m.name === task.assignee);
  const blockers = allTasks.filter(t => task.blocking_task_ids?.includes(t.id));
  const pendingBlockers = blockers.filter(t => t.status !== "completed");

  return (
    <div className="glass-card rounded-xl p-4 glass-card-hover transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <PriorityBadge priority={task.priority} />
        <button
          onClick={() => onEdit(task)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-white/[0.06] transition-all"
        >
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      <h4 className="text-sm font-semibold text-foreground mb-1.5 line-clamp-2">{task.title}</h4>
      {pendingBlockers.length > 0 && (
        <div className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-amber-900/20 border border-amber-500/30 mb-2">
          <AlertTriangle className="h-3 w-3 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-300">Blocked by {pendingBlockers.length} task(s)</p>
        </div>
      )}
      {task.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
        <div className="flex items-center gap-2">
          {task.assignee && (
            <UserAvatar name={task.assignee} color={member?.avatar_color} size="xs" />
          )}
          <span className="text-xs text-muted-foreground truncate max-w-[80px]">{task.assignee}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {task.due_date && (
            <span className={`text-[11px] font-mono flex items-center gap-1 ${
              new Date(task.due_date) < new Date() && task.status !== "completed" ? "text-red-400" : "text-muted-foreground"
            }`}>
              <Calendar className="h-3 w-3" />
              {moment(task.due_date).format("MMM D")}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3">
        <Select value={task.status} onValueChange={(v) => onStatusChange(task.id, v)}>
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
    </div>
  );
}