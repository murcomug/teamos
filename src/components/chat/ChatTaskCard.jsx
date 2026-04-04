import PriorityBadge from "../shared/PriorityBadge";
import UserAvatar from "../shared/UserAvatar";
import { Calendar, Pencil } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

export default function ChatTaskCard({ task, onStatusChange, onEdit, members }) {
  const member = members.find((m) => m.name === task.assignee);

  return (
    <div className="glass-card rounded-xl p-4 my-2 glass-card-hover transition-all duration-200">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-foreground truncate flex-1">{task.title}</h4>
        <button onClick={() => onEdit(task)} className="p-1.5 rounded-md hover:bg-white/[0.06] transition-all ml-2">
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <PriorityBadge priority={task.priority} />
        {task.assignee && (
          <div className="flex items-center gap-1.5">
            <UserAvatar name={task.assignee} color={member?.avatar_color} size="xs" />
            <span className="text-xs text-muted-foreground">{task.assignee}</span>
          </div>
        )}
        {task.department && (
          <span className="text-[11px] text-muted-foreground font-mono px-2 py-0.5 rounded bg-white/[0.04]">{task.department}</span>
        )}
        {task.due_date && (
          <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {moment(task.due_date).format("MMM D")}
          </span>
        )}
        <Select value={task.status} onValueChange={(v) => onStatusChange(task.id, v)}>
          <SelectTrigger className="h-6 w-24 text-[11px] bg-white/[0.03] border-white/[0.06] text-foreground">
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