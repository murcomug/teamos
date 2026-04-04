import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { LayoutGrid, List, Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import TaskCard from "../components/tasks/TaskCard";
import TaskListRow from "../components/tasks/TaskListRow";
import TaskEditModal from "../components/shared/TaskEditModal";
import ConfirmDialog from "../components/shared/ConfirmDialog";

const columns = ["pending", "ongoing", "stopped", "completed"];
const columnLabels = { pending: "Pending", ongoing: "Ongoing", stopped: "Stopped", completed: "Completed" };
const columnDots = { pending: "bg-slate-400", ongoing: "bg-primary", stopped: "bg-red-400", completed: "bg-emerald-400" };

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [search, setSearch] = useState("");
  const [sortPriority, setSortPriority] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadData = () => {
    Promise.all([
      base44.entities.Task.list(),
      base44.entities.TeamMember.list(),
      base44.entities.Department.list(),
    ]).then(([t, m, d]) => {
      setTasks(t);
      setMembers(m);
      setDepartments(d);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
    const unsubscribe = base44.entities.Task.subscribe((event) => {
      if (event.type === "create") {
        setTasks((prev) => [event.data, ...prev]);
      } else if (event.type === "update") {
        setTasks((prev) => prev.map((t) => t.id === event.id ? event.data : t));
      } else if (event.type === "delete") {
        setTasks((prev) => prev.filter((t) => t.id !== event.id));
      }
    });
    return unsubscribe;
  }, []);

  const handleStatusChange = async (id, status) => {
    await base44.entities.Task.update(id, { status });
    setTasks(tasks.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  const handleSave = async (form) => {
    if (editTask?.id) {
      await base44.entities.Task.update(editTask.id, form);
      setTasks(tasks.map((t) => (t.id === editTask.id ? { ...t, ...form } : t)));
      await base44.functions.invoke('logActivity', { action: 'TASK_UPDATED', description: `Task "${form.title}" was updated`, entity_type: 'Task', entity_id: editTask.id });
    } else {
      const created = await base44.entities.Task.create(form);
      setTasks([created, ...tasks]);
      await base44.functions.invoke('logActivity', { action: 'TASK_CREATED', description: `New task "${form.title}" was created`, entity_type: 'Task', entity_id: created.id });
    }
  };

  const handleDelete = async (id) => {
    const task = tasks.find((t) => t.id === id);
    setConfirmDelete({ id, title: task?.title });
  };

  const confirmTaskDelete = async () => {
    if (confirmDelete?.id) {
      await base44.entities.Task.delete(confirmDelete.id);
      setTasks(tasks.filter((t) => t.id !== confirmDelete.id));
      await base44.functions.invoke('logActivity', { action: 'TASK_DELETED', description: `Task "${confirmDelete.title}" was deleted`, entity_type: 'Task', entity_id: confirmDelete.id });
      setConfirmDelete(null);
    }
  };

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newStatus = destination.droppableId;
    await handleStatusChange(draggableId, newStatus);
  };

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const filtered = tasks
    .filter((t) =>
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.assignee?.toLowerCase().includes(search.toLowerCase()) ||
      t.department?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => sortPriority
      ? (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99)
      : 0
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">{tasks.length} tasks across all departments</p>
        </div>
        <Button onClick={() => { setEditTask({}); setShowCreate(true); }}
          className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
          <Plus className="h-4 w-4 mr-2" /> New Task
        </Button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-10 pr-4 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-all"
          />
        </div>
        {view === "list" && (
          <button
            onClick={() => setSortPriority(!sortPriority)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              sortPriority
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-white/[0.04] border-white/[0.06] text-muted-foreground hover:text-foreground"
            }`}>
            Sort by Priority
          </button>
        )}
        <div className="flex items-center bg-white/[0.04] rounded-lg border border-white/[0.06] p-0.5">
          <button onClick={() => setView("list")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === "list" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <List className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setView("kanban")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === "kanban" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Kanban View */}
      {view === "kanban" && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {columns.map((col) => {
              const colTasks = filtered.filter((t) => t.status === col);
              return (
                <Droppable key={col} droppableId={col}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`rounded-lg transition-colors ${
                        snapshot.isDraggingOver ? "bg-primary/10" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3 px-1">
                        <span className={`h-2 w-2 rounded-full ${columnDots[col]}`} />
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">{columnLabels[col]}</span>
                        <span className="text-xs text-muted-foreground font-mono ml-auto">{colTasks.length}</span>
                      </div>
                      <div className="space-y-3">
                        {colTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`transition-all ${
                                  snapshot.isDragging ? "opacity-50" : ""
                                }`}
                              >
                                <TaskCard task={task} members={members} allTasks={tasks}
                                  onStatusChange={handleStatusChange} onEdit={setEditTask} onDelete={handleDelete} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {colTasks.length === 0 && (
                          <div className="glass-card rounded-xl p-6 text-center">
                            <p className="text-xs text-muted-foreground">No tasks</p>
                          </div>
                        )}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="flex items-center gap-4 py-2.5 px-4 border-b border-white/[0.06] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="flex-1 min-w-[200px]">Task</div>
            <div className="w-12">Assignee</div>
            <div className="w-20">Priority</div>
            <div className="w-16">Dept</div>
            <div className="w-16">Due</div>
            <div className="w-24">Status</div>
            <div className="w-12"></div>
          </div>
          {filtered.map((task) => (
            <TaskListRow key={task.id} task={task} members={members} allTasks={tasks}
              onStatusChange={handleStatusChange} onEdit={setEditTask} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <TaskEditModal
        open={!!editTask}
        onClose={() => { setEditTask(null); setShowCreate(false); }}
        task={editTask}
        onSave={handleSave}
        members={members}
        departments={departments}
        allTasks={tasks}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Task"
        message={`Delete task "${confirmDelete?.title}"? This action cannot be undone.`}
        onConfirm={confirmTaskDelete}
        confirmText="Delete"
        dangerAction={true}
      />
    </div>
  );
}