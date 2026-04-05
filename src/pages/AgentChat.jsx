import { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from "react-markdown";
import { Loader2 } from "lucide-react";
import MentionInput from "../components/chat/MentionInput";
import ChatTaskCard from "../components/chat/ChatTaskCard";
import ChatCustomerCard from "../components/chat/ChatCustomerCard";
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
  const userId = memberSession?.id || "admin"; // Use member ID or 'admin' for auth users
  const messageCacheKey = `agentChatMessages_${userId}`;
  const dateCacheKey = `agentChatDate_${userId}`;

  const [messages, setMessages] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(messageCacheKey);
    const storedDate = localStorage.getItem(dateCacheKey);
    
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
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const scrollRef = useRef(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(messageCacheKey, JSON.stringify(messages));
    localStorage.setItem(dateCacheKey, today);
  }, [messages, messageCacheKey, dateCacheKey]);

  useEffect(() => {
    Promise.all([
      base44.entities.TeamMember.list(),
      base44.entities.Department.list(),
      base44.entities.Task.list(),
      base44.entities.CustomerProfile.list(),
    ]).then(([m, d, t, c]) => {
      setMembers(m);
      setDepartments(d);
      setTasks(t);
      setCustomers(c || []);
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

    // Extract @ mentions
    const mentionMatches = text.match(/@([\w\s]+?)(?=\s@|\s{2}|$|[,.])/g) || text.match(/@([^@]+)/g) || [];
    const mentionedName = mentionMatches.length > 0 ? mentionMatches[0].substring(1).trim() : null;
    const mentionNote = mentionedName ? `\n\nIMPORTANT: The user mentioned "@${mentionedName}" — use this exact name as the assignee in any task/ticket you create.` : "";

    // Scope visible tasks based on permissions
    const visibleTasks = canCompanyWideReports
      ? tasks
      : tasks.filter(t => t.assignee === memberSession?.name || t.department === memberSession?.department);

    const taskSummary = visibleTasks.slice(0, 20).map(t =>
      `ID:${t.id} "${t.title}" status:${t.status} priority:${t.priority} assignee:${t.assignee || 'unassigned'} dept:${t.department || 'none'} due:${t.due_date || 'none'} type:${t.is_support_ticket ? 'ticket' : 'task'}`
    ).join("\n");

    const memberSummary = members.map(m => `${m.name} (${m.department}, ${m.role})`).join(", ");
    const deptSummary = departments.map(d => d.name).join(", ");
    const customerSummary = customers.slice(0, 20).map(c =>
      `ID:${c.id} name:"${c.name}" company:"${c.company || ''}" email:"${c.email || ''}" stage:${c.sales_stage || 'lead'} rep:"${c.assigned_sales_rep || ''}"`
    ).join("\n");

    const scopeNote = canCompanyWideReports
      ? ""
      : `\n⚠️ IMPORTANT: This user does NOT have company-wide report access. Only show data related to their own tasks or their department (${memberSession?.department}). Politely refuse requests for company-wide stats or other departments' data.`;

    // Build conversation history for context (last 10 messages)
    const historyMessages = messages.slice(-10);
    const conversationHistory = historyMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = `You are TeamOS AI assistant that helps manage team operations. Your PRIMARY job is to TAKE ACTION when asked.

WORK ITEM TYPES:
- Tasks: operational/internal work (proactive)
- Support Tickets: customer issues/bugs/complaints (reactive) — is_support_ticket: true

DATA:
TASKS:
${taskSummary}

TEAM: ${memberSummary}
DEPARTMENTS: ${deptSummary}

CUSTOMERS:
${customerSummary || 'No customers yet.'}

TODAY: ${new Date().toISOString().split("T")[0]}
${scopeNote}${mentionNote}

CONVERSATION HISTORY:
${conversationHistory || 'No prior conversation.'}

User request: ${text}

CRITICAL DECISION RULES — follow in ORDER, stop at first match:

RULE 1 — CREATE INTENT (highest priority): If message contains ANY of: "create", "new", "add", "make", "log", "open", "raise", "submit", "need a", "want a" — this is ALWAYS a CREATE action. NEVER respond with TASK_LIST for a create request. Derive a title from context if none given.
  "ticket", "support", "issue", "problem", "bug", "complaint", "error", "defect" → SUPPORT_TICKET_CREATE:{"title":"...","description":"...","status":"pending","priority":"medium","assignee":"...","department":"...","due_date":null}
  Everything else → TASK_CREATE:{"title":"...","description":"...","status":"pending","priority":"medium","assignee":"...","department":"...","due_date":null}

RULE 2 — VIEW/LIST INTENT: ONLY if NO create keyword present AND message has "show", "list", "what", "get", "view", "find", "overdue", "pending", "open", "my tasks" — respond with TASK_LIST:[id1,id2,...]. CRITICAL: When using TASK_LIST, your ENTIRE text response before the command must be ONE short sentence only (e.g. "Here are your open tasks:"). Do NOT list task titles, IDs, or details in the text — the cards will display them automatically.
  Ticket-specific ("ticket","issue","support") → filter is_support_ticket true only
  Task-specific ("task","work","assignment") → filter is_support_ticket false/null only

RULE 3 — CUSTOMER CREATE: "new customer", "add lead", "new lead" → CUSTOMER_CREATE:{"name":"...","company":"...","email":"...","phone":"...","sales_stage":"lead","assigned_sales_rep":"..."}

RULE 4 — CUSTOMER LIST: "show customers", "view pipeline", "list leads" → CUSTOMER_LIST:[id1,id2,...]

RULE 5 — AMBIGUITY: Only ask for clarification if intent is genuinely impossible to determine after all rules. NEVER ask twice in a row.

Format response in markdown. Be concise and professional.`;

    const response = await base44.integrations.Core.InvokeLLM({ prompt });

    let content = response;
    let createdTask = null;

    if (typeof content === "string" && content.includes("TASK_CREATE:")) {
      const parts = content.split("TASK_CREATE:");
      content = parts[0].replace(/```[\s\S]*?```/g, "").replace(/\{[\s\S]*?\}/g, "").trim();
      try {
        // Strip markdown code fences if LLM wrapped JSON in ```json ... ```
        let raw = parts[1].trim();
        raw = raw.replace(/^```[a-z]*\n?/i, "").replace(/```[\s\S]*$/, "").trim();
        // Extract only the first JSON object
        const jsonMatch = raw.match(/\{[\s\S]*?\}/);
        const taskData = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
        const finalTaskData = { ...taskData, ...(mentionedName ? { assignee: mentionedName } : {}) };
        createdTask = await base44.entities.Task.create(finalTaskData);
        setTasks((prev) => [createdTask, ...prev]);
        content += "\n\n✅ Task created successfully!";
      } catch (e) {
        content += "\n\n⚠️ Could not auto-create the task. Please create it manually.";
      }
    } else if (typeof content === "string" && content.includes("SUPPORT_TICKET_CREATE:")) {
      const parts = content.split("SUPPORT_TICKET_CREATE:");
      content = parts[0].replace(/```[\s\S]*?```/g, "").replace(/\{[\s\S]*?\}/g, "").trim();
      try {
        let raw = parts[1].trim();
        raw = raw.replace(/^```[a-z]*\n?/i, "").replace(/```[\s\S]*$/, "").trim();
        const jsonMatch = raw.match(/\{[\s\S]*?\}/);
        const ticketData = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
        const finalTicketData = { ...ticketData, is_support_ticket: true, ...(mentionedName ? { assignee: mentionedName } : {}) };
        createdTask = await base44.entities.Task.create(finalTicketData);
        setTasks((prev) => [createdTask, ...prev]);
        content += "\n\n✅ Support ticket created successfully!";
      } catch (e) {
        content += "\n\n⚠️ Could not auto-create the support ticket. Please create it manually.";
      }
    }

    // CUSTOMER_CREATE
    let createdCustomer = null;
    if (typeof content === "string" && content.includes("CUSTOMER_CREATE:")) {
      const parts = content.split("CUSTOMER_CREATE:");
      content = parts[0].trim();
      try {
        let raw = parts[1].trim().replace(/^```[a-z]*\n?/i, "").replace(/```[\s\S]*$/, "").trim();
        const jsonMatch = raw.match(/\{[\s\S]*?\}/);
        const data = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
        createdCustomer = await base44.entities.CustomerProfile.create(data);
        setCustomers(prev => [createdCustomer, ...prev]);
        content += "\n\n✅ Customer profile created!";
      } catch { content += "\n\n⚠️ Could not create the customer profile."; }
    }

    // CUSTOMER_LIST
    let listedCustomers = [];
    if (typeof content === "string" && content.includes("CUSTOMER_LIST:")) {
      const parts = content.split("CUSTOMER_LIST:");
      content = parts[0].trim();
      try {
        let raw = parts[1].trim().replace(/^```[a-z]*\n?/i, "").replace(/```[\s\S]*$/, "").trim();
        const bracketMatch = raw.match(/\[(.+)\]/);
        if (bracketMatch) {
          const ids = bracketMatch[1].split(',').map(s => s.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '')).filter(Boolean);
          listedCustomers = ids.map(id => customers.find(c => c.id === id)).filter(Boolean);
        }
      } catch {}
      if (listedCustomers.length === 0) content += "\n\n*No customers match that request.*";
    }

    let listedTasks = [];
    if (typeof content === "string" && content.includes("TASK_LIST:")) {
      const parts = content.split("TASK_LIST:");
      content = parts[0].trim();
      try {
        let raw = parts[1].trim();
        // Strip markdown code fences
        raw = raw.replace(/^```[a-z]*\n?/i, "").replace(/```[\s\S]*$/, "").trim();
        // Extract the array - greedy match to get everything between [ and ]
        const bracketMatch = raw.match(/\[(.+)\]/);
        if (bracketMatch) {
          // Split by comma, extract quoted strings and unquoted IDs
          let arrayContent = bracketMatch[1];
          // Remove trailing brackets if nested
          arrayContent = arrayContent.replace(/\]+$/, '');
          const idStrings = arrayContent
            .split(',')
            .map(s => {
              // Remove quotes if present
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
      
      if (listedTasks.length === 0) {
        content += "\n\n*No open tasks match that request.*";
      }
    }

    const taskCards = createdTask ? [createdTask, ...listedTasks] : listedTasks;
    const customerCards = createdCustomer ? [createdCustomer, ...listedCustomers] : listedCustomers;

    // Final cleanup: strip any remaining JSON blocks or code fences from displayed content
    content = content
      .replace(/```[\s\S]*?```/g, "")
      .replace(/\{[\s\S]*\}/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content,
        tasks: taskCards.length > 0 ? taskCards : undefined,
        customerCards: customerCards.length > 0 ? customerCards : undefined,
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
              {msg.customerCards && msg.customerCards.map(c => c && (
                <ChatCustomerCard key={c.id} customer={c} />
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