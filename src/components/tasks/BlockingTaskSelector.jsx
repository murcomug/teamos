import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function BlockingTaskSelector({ allTasks, currentTaskId, blockingTaskIds = [], onChange }) {
  const availableTasks = allTasks.filter(t => t.id !== currentTaskId && t.status !== "completed");
  const selectedTasks = allTasks.filter(t => blockingTaskIds.includes(t.id));

  const handleAdd = (taskId) => {
    if (!blockingTaskIds.includes(taskId)) {
      onChange([...blockingTaskIds, taskId]);
    }
  };

  const handleRemove = (taskId) => {
    onChange(blockingTaskIds.filter(id => id !== taskId));
  };

  return (
    <div>
      <Label className="text-muted-foreground text-xs mb-2 block">Tasks Blocking This One</Label>
      
      <div className="mb-3">
        <Select onValueChange={handleAdd}>
          <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-foreground">
            <SelectValue placeholder="Add blocking task..." />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a24] border-white/[0.08] max-h-60">
            {availableTasks.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">No available tasks</div>
            ) : (
              availableTasks.map(t => (
                <SelectItem key={t.id} value={t.id} className="text-foreground text-xs">
                  {t.title.length > 40 ? t.title.slice(0, 40) + "..." : t.title}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {selectedTasks.length > 0 && (
        <div className="space-y-2">
          {selectedTasks.map(task => (
            <div key={task.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-white/[0.04] border border-white/[0.06]">
              <span className="text-xs text-foreground truncate">{task.title}</span>
              <button
                onClick={() => handleRemove(task.id)}
                className="p-0.5 hover:bg-white/[0.06] rounded transition-colors flex-shrink-0"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}