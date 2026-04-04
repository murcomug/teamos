import { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from "react-markdown";
import { Loader2 } from "lucide-react";
import MentionInput from "../components/chat/MentionInput";
import ChatTaskCard from "../components/chat/ChatTaskCard";
import TaskEditModal from "../components/shared/TaskEditModal";

const quickPrompts = [
  "Create a support ticket",
  "What's overdue today?",
  "Show me IT's workload",
  "Give me the daily status report",
];

export default function AgentChat() {
  // Read member session for permission-scoped responses
  const memberSession = (() => {
    try { return JSON.parse(localStorage.getItem("memberSession") || "null"); } catch { return null; }
  })();
  const canCompanyWideReports = !memberSession || (memberSession.permissions || []).includes("company_wide_reports");

  const [messages, setMessages] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem("agentChatMessages");
    const storedDate = localStorage.getItem("agentChatDate");
    
    if (stored && storedDate === today) {
      try {
        return JSON.parse(stored);
      } catch {
        return [{ role: "assistant", content: "👋 Welcome to **TeamOS Agent**. I can help you create tasks, check workloads, manage assignments, and generate reports. Try typing a command or use the quick prompts below." }];
      }
    }
    
    return [{ role: "assistant", content: "👋 Welcome to **TeamOS Agent**. I can help you create tasks, check workloads, manage assignments, and generate reports. Try typing a command or use the quick prompts below." }];
  });
  const [members, setMembers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const scrollRef = useRef(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem("agentChatMessages", JSON.stringify(messages));
    localStorage.setItem("agentChatDate", today);
  }, [messages]);

  useEffect(() => {
    Promise.all([
      base44.entities.TeamMember.list(),
      base44.entities.Department.list(),
      base44.entities.Task.list(),
    ]).then(([m, d, t]) => {
      setMembers(m);
      setDepartments(d);
      setTasks(t);
    });
  }, []);

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

    // Scope visible tasks based on permissions
    const visibleTasks = canCompanyWideReports
      ? tasks
      : tasks.filter(t => t.assignee === memberSession?.name || t.department === memberSession?.department);

    const taskSummary = visibleTasks.slice(0, 20).map(t =>
      `ID:${t.id} "${t.title}" status:${t.status} priority:${t.priority} assignee:${t.assignee || 'unassigned'} dept:${t.department || 'none'} due:${t.due_date || 'none'}`
    ).join("\n");

    const memberSummary = members.map(m => `${m.name} (${m.department}, ${m.role})`).join(", ");
    const deptSummary = departments.map(d => d.name).join(", ");

    const scopeNote = canCompanyWideReports
      ? ""
      : `\n⚠️ IMPORTANT: This user does NOT have company-wide report access. Only show data related to their own tasks or their department (${memberSession?.department}). Politely refuse requests for company-wide stats or other departments' data.`;

    const prompt = `You are TeamOS AI assistant that helps manage team operations. You have access to this data:

TASKS:
${taskSummary}

TEAM: ${memberSummary}
DEPARTMENTS: ${deptSummary}

TODAY: ${new Date().toISOString().split("T")[0]}
${scopeNote}

TASK STATUS DEFINITIONS:
- "open" or "active" tasks = status is pending OR ongoing
- "completed" tasks = status is completed
- "stopped" tasks = status is stopped

User request: ${text}

RESPONSE RULES:
1. Determine if the user wants a TASK or SUPPORT TICKET:
   - Use SUPPORT_TICKET_CREATE if the request includes keywords: "ticket", "support", "issue", "problem", "bug", "complaint", or is about customer/client concerns
   - Use TASK_CREATE for operational/internal work items

2. If creating a TASK (operational work): respond with JSON on a new line:
TASK_CREATE:{"title":"...","description":"...","status":"pending","priority":"medium","assignee":"...","department":"...","due_date":"YYYY-MM-DD"}

3. If creating a SUPPORT TICKET (customer support, issue report): respond with JSON on a new line:
SUPPORT_TICKET_CREATE:{"title":"...","description":"...","status":"pending","priority":"medium","assignee":"...","department":"...","due_date":"YYYY-MM-DD"}

4. **IF THE USER IS ASKING TO VIEW/LIST/FILTER TASKS** (keywords: "show", "list", "what are", "get", "open", "pending", "overdue", etc.):
   - Filter the task list based on user criteria
   - MANDATORY: End response with TASK_LIST:[id1,id2,id3] using matching task IDs
   - Do NOT list task details in the text - let the cards display them
   - Example: User: "Show me open tasks" → Your response: "Here are your open tasks:\n\nTASK_LIST:[abc,def,ghi]"

5. Format response in markdown. Be concise and professional.`;

    const response = await base44.integrations.Core.InvokeLLM({ prompt });

    let content = response;
    let createdTask = null;

    if (typeof content === "string" && content.includes("TASK_CREATE:")) {
      const parts = content.split("TASK_CREATE:");
      content = parts[0].trim();
      try {
        // Strip markdown code fences if LLM wrapped JSON in ```json ... ```
        let raw = parts[1].trim();
        raw = raw.replace(/^```[a-z]*\n?/i, "").replace(/```[\s\S]*$/, "").trim();
        // Extract only the first JSON object
        const jsonMatch = raw.match(/\{[\s\S]*?\}/);
        const taskData = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
        createdTask = await base44.entities.Task.create(taskData);
        setTasks((prev) => [createdTask, ...prev]);
        content += "\n\n✅ Task created successfully!";
      } catch (e) {
        content += "\n\n⚠️ Could not auto-create the task. Please create it manually.";
      }
    } else if (typeof content === "string" && content.includes("SUPPORT_TICKET_CREATE:")) {
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
        content += "\n\n⚠️ Could not auto-create the support ticket. Please create it manually.";
      }
    }

    let listedTasks = [];
    if (typeof content === "string" && content.includes("TASK_LIST:")) {
      const parts = content.split("TASK_LIST:");
      content = parts[0].trim();
      try {
        let raw = parts[1].trim();
        raw = raw.replace(/^```[a-z]*\n?/i, "").replace(/```[\s\S]*$/, "").trim();
        // Extract array from text - more permissive regex
        const bracketMatch = raw.match(/\[.*?\]/s);
        if (bracketMatch) {
          // Clean up the array string - remove newlines, extra spaces
          let cleanedArray = bracketMatch[0]
            .replace(/\s+/g, ' ')
            .replace(/,\s*]/g, ']')
            .replace(/\[\s*\]/g, '[]');
          const ids = JSON.parse(cleanedArray);
          if (Array.isArray(ids)) {
            listedTasks = ids.map(id => tasks.find(t => t.id === id)).filter(Boolean);
          }
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
    <div className="flex flex-col h-[calc(100vh-72px)] md:h-[calc(100vh-112px)] max-w-4xl mx-auto">
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