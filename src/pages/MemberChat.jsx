import { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from "react-markdown";
import { Loader2 } from "lucide-react";
import MentionInput from "../components/chat/MentionInput";
import ChatTaskCard from "../components/chat/ChatTaskCard";
import TaskEditModal from "../components/shared/TaskEditModal";
import { useMemberSession } from "@/lib/MemberSessionContext";

const quickPrompts = [
  "Create a support ticket",
  "What's overdue today?",
  "Show me my workload",
];

export default function MemberChatContent() {
  const { memberSession } = useMemberSession();

  const userId = memberSession?.id || "guest";
  const messageCacheKey = `memberChatMessages_${userId}`;
  const dateCacheKey = `memberChatDate_${userId}`;

  const [messages, setMessages] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(messageCacheKey);
    const storedDate = localStorage.getItem(dateCacheKey);
    
    if (stored && storedDate === today) {
      try {
        return JSON.parse(stored);
      } catch {
        return [{ role: "assistant", content: "👋 Welcome to **TeamOS Agent**. I can help you check your tasks and create support tickets. What would you like to do?" }];
      }
    }
    
    return [{ role: "assistant", content: "👋 Welcome to **TeamOS Agent**. I can help you check your tasks and create support tickets. What would you like to do?" }];
  });

  const [members, setMembers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(messageCacheKey, JSON.stringify(messages));
    localStorage.setItem(dateCacheKey, today);
  }, [messages, messageCacheKey, dateCacheKey]);

  useEffect(() => {
    if (!memberSession) return;
    
    Promise.all([
      base44.entities.TeamMember.list(),
      base44.entities.Department.list(),
      base44.entities.Task.filter({ assignee: memberSession.name }),
    ]).then(([m, d, t]) => {
      setMembers(m);
      setDepartments(d);
      setTasks(t || []);
    });
  }, [memberSession]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStatusChange = async (id, status) => {
    await base44.entities.Task.update(id, { status });
    setTasks(tasks.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  const handleEditSave = async (form) => {
    if (editTask?.id) {
      await base44.entities.Task.update(editTask.id, form);
      setTasks(tasks.map((t) => (t.id === editTask.id ? { ...t, ...form } : t)));
    }
  };

  const sendMessage = async (text) => {
    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const taskSummary = tasks.slice(0, 20).map(t =>
      `ID:${t.id} "${t.title}" status:${t.status} priority:${t.priority} assignee:${t.assignee || 'unassigned'} dept:${t.department || 'none'} due:${t.due_date || 'none'} type:${t.is_support_ticket ? 'ticket' : 'task'}`
    ).join("\n");

    const memberSummary = members.map(m => `${m.name} (${m.department}, ${m.role})`).join(", ");
    const deptSummary = departments.map(d => d.name).join(", ");

    const prompt = `You are TeamOS AI assistant helping a team member. This member can only see their own tasks and create support tickets.

**WORK ITEM TYPES:**
- **Tasks**: Operational work assigned to this member
- **Support Tickets**: Customer issues, bug reports, or support requests

**Member's Data:**

TASKS (only assigned to ${memberSession?.name}):
${taskSummary}

TEAM: ${memberSummary}
DEPARTMENTS: ${deptSummary}

TODAY: ${new Date().toISOString().split("T")[0]}

User (${memberSession?.name}, ${memberSession?.department}): ${text}

RESPONSE RULES:
1. **If creating a SUPPORT TICKET**: respond with JSON on a new line:
SUPPORT_TICKET_CREATE:{"title":"...","description":"...","status":"pending","priority":"medium","assignee":"${memberSession?.name}","department":"${memberSession?.department}","due_date":"YYYY-MM-DD"}

2. **If user asks to view/list their tasks** (keywords: "show", "list", "open", "pending", etc.):
   - Filter their tasks and return matching IDs with TASK_LIST:[id1,id2,id3]
   - Example: "Here are your open tasks:\n\nTASK_LIST:[abc,def]"

3. Format response in markdown. Be concise and helpful.
4. Only show data related to THIS member's tasks and department.
5. Politely refuse requests for company-wide stats or other members' data.`;

    const response = await base44.integrations.Core.InvokeLLM({ prompt });

    let content = response;
    let createdTask = null;

    if (typeof content === "string" && content.includes("SUPPORT_TICKET_CREATE:")) {
      const parts = content.split("SUPPORT_TICKET_CREATE:");
      content = parts[0].trim();
      try {
        let raw = parts[1].trim();
        raw = raw.replace(/^```[a-z]*\n?/i, "").replace(/```[\s\S]*$/, "").trim();
        const jsonMatch = raw.match(/\{[\s\S]*?\}/);
        const ticketData = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
        createdTask = await base44.entities.Task.create({ ...ticketData, is_support_ticket: true });
        setTasks((prev) => [createdTask, ...prev]);
        content += "\n\n✅ Support ticket created successfully!";
      } catch (e) {
        content += "\n\n⚠️ Could not auto-create the ticket. Please try again.";
      }
    }

    let listedTasks = [];
    if (typeof content === "string" && content.includes("TASK_LIST:")) {
      const parts = content.split("TASK_LIST:");
      content = parts[0].trim();
      try {
        let raw = parts[1].trim();
        raw = raw.replace(/^```[a-z]*\n?/i, "").replace(/```[\s\S]*$/, "").trim();
        const bracketMatch = raw.match(/\[(.+)\]/);
        if (bracketMatch) {
          let arrayContent = bracketMatch[1];
          arrayContent = arrayContent.replace(/\]+$/, '');
          const idStrings = arrayContent
            .split(',')
            .map(s => {
              const trimmed = s.trim();
              return trimmed.replace(/^["']|["']$/g, '');
            })
            .filter(s => s.length > 0);
          listedTasks = idStrings
            .map(id => tasks.find(t => t.id === id))
            .filter(Boolean);
        }
      } catch (e) {
        console.error("Failed to parse TASK_LIST:", e);
      }
    }

    const taskCards = createdTask ? [createdTask, ...listedTasks] : listedTasks;

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content,
        tasks: taskCards.length > 0 ? taskCards : undefined,
      },
    ]);
    setLoading(false);
  };


  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Agent Chat</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered task management</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {quickPrompts.map((prompt) => (
          <button key={prompt} onClick={() => sendMessage(prompt)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] border border-white/[0.06] text-muted-foreground hover:text-primary hover:border-primary/30 transition-all">
            {prompt}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-4 pb-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] ${msg.role === "user" ? "ml-auto" : ""}`}>
              <div className={`rounded-2xl px-4 py-3 ${
                msg.role === "user" ? "bg-primary text-primary-foreground" : "glass-card"
              }`}>
                {msg.role === "user" ? (
                  <p className="text-sm">{msg.content}</p>
                ) : (
                  <ReactMarkdown className="text-sm prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-p:text-foreground/90 prose-strong:text-foreground prose-li:text-foreground/90">
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>
              {msg.tasks && msg.tasks.length > 0 && msg.tasks.map((task, i) => task && (
                <div key={task.id} className="flex items-start gap-2 mt-2">
                  <span className="text-xs font-mono text-muted-foreground mt-4 w-5 text-right flex-shrink-0">{i + 1}.</span>
                  <div className="flex-1">
                    <ChatTaskCard task={task} members={members}
                      onStatusChange={handleStatusChange} onEdit={setEditTask} />
                  </div>
                </div>
              ))}

            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="glass-card rounded-2xl px-4 py-3">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="pt-4 border-t border-white/[0.06]">
        <MentionInput onSend={sendMessage} members={members} departments={departments} />
      </div>

      <TaskEditModal
        open={!!editTask}
        onClose={() => setEditTask(null)}
        task={editTask}
        onSave={handleEditSave}
        members={members}
        departments={departments}
        allTasks={tasks}
      />
    </div>
  );
}