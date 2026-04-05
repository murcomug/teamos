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

    const prompt = `You are TeamOS AI assistant that helps manage team operations and support requests. You handle two distinct types of work items.

**WORK ITEM TYPES:**
- **Tasks**: Operational work, internal projects, assignments, or general work items representing proactive work
- **Support Tickets**: Customer issues, bug reports, problem reports, complaints, or support requests representing reactive work
  (Note: Both are stored as Task entities, but tickets have is_support_ticket: true)

You have access to this data:

TASKS:
${taskSummary}

TEAM: ${memberSummary}
DEPARTMENTS: ${deptSummary}

CUSTOMERS (CRM):
${customerSummary || 'No customers yet.'}

TODAY: ${new Date().toISOString().split("T")[0]}
${scopeNote}

TASK STATUS DEFINITIONS:
- "open" or "active" tasks = status is pending OR ongoing
- "completed" tasks = status is completed
- "stopped" tasks = status is stopped

CONVERSATION HISTORY (use this for context and to understand what the user has been working on):
${conversationHistory || 'No prior conversation.'}

User request: ${text}

RESPONSE RULES:
1. **CATEGORIZATION - Determine if the user wants a TASK or SUPPORT TICKET:**
   - Use SUPPORT_TICKET_CREATE for: "ticket", "support", "issue", "problem", "bug", "complaint", "error", "defect", or customer/client concerns
   - Use TASK_CREATE for: "task", "work item", "project", "assignment", "create", or operational/internal work
   - When in doubt, prioritize based on keywords and context of the request

2. **If creating a TASK (operational work)**: respond with JSON on a new line:
TASK_CREATE:{"title":"...","description":"...","status":"pending","priority":"medium","assignee":"...","department":"...","due_date":"YYYY-MM-DD"}

3. **If creating a SUPPORT TICKET (issue/problem report)**: respond with JSON on a new line:
SUPPORT_TICKET_CREATE:{"title":"...","description":"...","status":"pending","priority":"medium","assignee":"...","department":"...","due_date":"YYYY-MM-DD"}

4. **IF THE USER IS ASKING TO VIEW/LIST/FILTER** (keywords: "show", "list", "what are", "get", "open", "pending", "overdue", "tickets", "issues", etc.):
   - **For general task requests**: Filter all tasks and return matching IDs with TASK_LIST:[id1,id2,id3]
   - **For ticket-specific requests** (keywords: "ticket", "issue", "support", "problem"): Filter only support tickets (is_support_ticket: true)
   - **For task-specific requests** (keywords: "task", "work", "assignment"): Filter only regular tasks (is_support_ticket: false or not set)
   - MANDATORY: End response with TASK_LIST:[id1,id2,id3] using matching IDs
   - Do NOT list task details in the text - let the cards display them
   - Example: User: "Show me open tasks" → "Here are your open tasks:\n\nTASK_LIST:[abc,def,ghi]"
   - Example: User: "List support tickets" → "Here are your open support tickets:\n\nTASK_LIST:[xyz,uvw]"

5. **If creating a CUSTOMER PROFILE** (keywords: "add customer", "new customer", "add lead", "new lead", "register customer"): respond with JSON on a new line:
CUSTOMER_CREATE:{"name":"...","company":"...","email":"...","phone":"...","sales_stage":"lead","assigned_sales_rep":"..."}

6. **If listing/viewing customers** (keywords: "show customers", "list leads", "view pipeline"): end response with CUSTOMER_LIST:[id1,id2,...]

7. **AMBIGUITY RULE — use SPARINGLY**: Only ask for clarification if the message contains NO recognizable action keywords (not "task", "ticket", "issue", "show", "list", "create", "add", "customer", "report", "problem", "bug", "assign", "update", "fix", "follow", "overdue", "status") AND you genuinely cannot infer intent from the conversation history. If the user replies with a number (1, 2, 3) or a follow-up after you asked, treat it as a direct selection of the previous options. NEVER ask for clarification twice in a row or for messages that clearly imply an action.

8. Format response in markdown. Be concise and professional.`;

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