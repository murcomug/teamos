import PriorityBadge from "../shared/PriorityBadge";
import StatusBadge from "../shared/StatusBadge";
import UserAvatar from "../shared/UserAvatar";
import { Calendar, Pencil } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

export default function TaskListRow({ task, onStatusChange, onEdit, members }) {
  const member = members.find((m) => m.name === task.assignee);

  return (
    <div className="flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-white/[0.03] transition-colors group border-b border-white/[0.03] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
        {task.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>
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

      <div className="w-28 flex-shrink-0">
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

      <button
        onClick={() => onEdit(task)}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-white/[0.06] transition-all flex-shrink-0"
      >
        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}