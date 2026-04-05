import { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from "react-markdown";
import { Loader2 } from "lucide-react";
import MentionInput from "../components/chat/MentionInput";
import ChatTaskCard from "../components/chat/ChatTaskCard";
import ChatCustomerCard from "../components/chat/ChatCustomerCard";
import TaskEditModal from "../components/shared/TaskEditModal";
import { useMemberSession } from "@/lib/MemberSessionContext";

const quickPrompts = [
  "Create a task",
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
  const [customers, setCustomers] = useState([]);
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
      base44.entities.CustomerProfile.list(),
    ]).then(([m, d, t, c]) => {
      setMembers(m);
      setDepartments(d);
      setTasks(t || []);
      setCustomers(c || []);
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

    const mentionMatches = text.match(/@([^@,\.]+)/g) || [];
    const mentionedName = mentionMatches.length > 0 ? mentionMatches[0].substring(1).trim() : null;

    const isAdmin = memberSession?.role === 'admin';
    const deptTasks = tasks.filter(t => t.department === memberSession?.department);

    const taskSummary = deptTasks.slice(0, 30).map(t =>
      `ID:${t.id} "${t.title}" status:${t.status} priority:${t.priority} assignee:${t.assignee || 'unassigned'} dept:${t.department || 'none'} due:${t.due_date || 'none'} type:${t.is_support_ticket ? 'ticket' : 'task'}`
    ).join("\n");

    const customerSummary = customers.slice(0, 30).map(c =>
      `ID:${c.id} "${c.name}" company:${c.company || 'N/A'} stage:${c.sales_stage || 'lead'} rep:${c.assigned_sales_rep || 'unassigned'} email:${c.email || 'N/A'}`
    ).join("\n");

    const memberSummary = members.map(m => `${m.name} (${m.department}, ${m.role})`).join(", ");
    const deptSummary = departments.map(d => d.name).join(", ");

    const historyMessages = messages.slice(-10)
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const restrictionNote = !isAdmin
      ? `RESTRICTIONS: You CANNOT create, add, or invite team members or departments. Politely decline if asked.`
      : '';

    const prompt = `You are TeamOS AI assistant helping a team member.
ROLE: ${memberSession?.role?.toUpperCase()}
${restrictionNote}

TASKS (${memberSession?.department} dept):
${taskSummary || 'No tasks.'}

TEAM: ${memberSummary}
DEPARTMENTS: ${deptSummary}

CUSTOMERS:
${customerSummary || 'No customers.'}

TODAY: ${new Date().toISOString().split('T')[0]}
${mentionedName ? `MENTION: The user mentioned "@${mentionedName}" — use this as the assignee for any created task/ticket.` : ''}

CONVERSATION HISTORY:
${historyMessages || 'None.'}

User (${memberSession?.name}, ${memberSession?.department}): ${text}

Respond ONLY with a JSON object. Rules:
- "text": your natural language reply (markdown ok, concise)
- "intent": one of: list_tasks | create_task | create_ticket | create_customer | update_customer | list_customers | log_interaction | general
- "task_ids": array of task IDs to display as cards (for list_tasks). ONLY include IDs — do NOT describe tasks in "text".
- "customer_ids": array of customer IDs to display as cards (for list_customers)
- "create_task": task object if intent is create_task {title, description, status, priority, assignee, department, due_date}
- "create_ticket": ticket object if intent is create_ticket {title, description, status, priority, assignee, department}
- "create_customer": customer object if intent is create_customer {name, company, email, phone, sales_stage, assigned_sales_rep}
- "update_customer": object with id + fields to update
- "log_interaction": object if logging a sales interaction {customer_id, interaction_type, summary, date, sales_rep}

For list intent: choose ALL matching task IDs from the TASKS list. For create intent: do NOT include task_ids.`;

    const responseSchema = {
      type: "object",
      properties: {
        text: { type: "string" },
        intent: { type: "string" },
        task_ids: { type: "array", items: { type: "string" } },
        customer_ids: { type: "array", items: { type: "string" } },
        create_task: { type: "object" },
        create_ticket: { type: "object" },
        create_customer: { type: "object" },
        update_customer: { type: "object" },
        log_interaction: { type: "object" },
      },
      required: ["text", "intent"]
    };

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: responseSchema
    });

    let displayText = response.text || "";
    let createdTask = null;
    let createdCustomer = null;

    if (response.create_task) {
      const data = { ...response.create_task, ...(mentionedName ? { assignee: mentionedName } : {}) };
      createdTask = await base44.entities.Task.create(data);
      setTasks(prev => [createdTask, ...prev]);
      displayText += "\n\n✅ Task created successfully!";
    } else if (response.create_ticket) {
      const data = { ...response.create_ticket, is_support_ticket: true, ...(mentionedName ? { assignee: mentionedName } : {}) };
      createdTask = await base44.entities.Task.create(data);
      setTasks(prev => [createdTask, ...prev]);
      displayText += "\n\n✅ Support ticket created successfully!";
    }

    if (response.create_customer) {
      createdCustomer = await base44.entities.CustomerProfile.create(response.create_customer);
      setCustomers(prev => [createdCustomer, ...prev]);
      displayText += "\n\n✅ Customer profile created!";
    }

    if (response.update_customer) {
      const { id, ...updates } = response.update_customer;
      if (id) {
        await base44.entities.CustomerProfile.update(id, updates);
        setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
        displayText += "\n\n✅ Customer updated!";
      }
    }

    if (response.log_interaction) {
      await base44.entities.SalesInteraction.create(response.log_interaction);
      displayText += "\n\n✅ Interaction logged!";
    }

    const listedTasks = (response.task_ids || []).map(id => tasks.find(t => t.id === id)).filter(Boolean);
    const listedCustomers = (response.customer_ids || []).map(id => customers.find(c => c.id === id)).filter(Boolean);

    const taskCards = createdTask ? [createdTask, ...listedTasks] : listedTasks;
    const customerCards = createdCustomer ? [createdCustomer, ...listedCustomers] : listedCustomers;

    if (listedTasks.length === 0 && response.intent === 'list_tasks' && !createdTask) {
      displayText += "\n\n*No tasks match that request.*";
    }
    if (listedCustomers.length === 0 && response.intent === 'list_customers' && !createdCustomer) {
      displayText += "\n\n*No customers match that request.*";
    }

    setMessages(prev => [
      ...prev,
      {
        role: "assistant",
        content: displayText.trim(),
        tasks: taskCards.length > 0 ? taskCards : undefined,
        customerCards: customerCards.length > 0 ? customerCards : undefined,
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