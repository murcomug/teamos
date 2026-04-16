import { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from "react-markdown";
import { Loader2, RotateCcw } from "lucide-react";
import MentionInput from "../components/chat/MentionInput";
import ChatTaskCard from "../components/chat/ChatTaskCard";
import ChatCustomerCard from "../components/chat/ChatCustomerCard";
import TaskEditModal from "../components/shared/TaskEditModal";
import { useCurrentUser } from "@/lib/useCurrentUser";

const quickPrompts = [
  "Create a support ticket",
  "What's overdue today?",
  "Show me IT's workload",
  "Give me the daily status report",
];

export default function AgentChat() {
  const { currentUser } = useCurrentUser();
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    Promise.all([
      base44.entities.TeamMember.list(),
      base44.entities.Department.list(),
      base44.entities.Task.list(),
      base44.entities.CustomerProfile.list(),
    ]).then(([m, d, t, c]) => {
      setMembers(m);
      setDepartments(d);
      setTasks(t || []);
      setCustomers(c || []);
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStatusChange = async (id, status) => {
    await base44.entities.Task.update(id, { status });
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const handleEditSave = async (form) => {
    if (editTask?.id) {
      await base44.entities.Task.update(editTask.id, form);
      setTasks(prev => prev.map(t => t.id === editTask.id ? { ...t, ...form } : t));
    }
  };

  // Refresh task list from server (ensures Tasks page + chat cards stay in sync)
  const refreshTasks = async () => {
    const fresh = await base44.entities.Task.list();
    setTasks(fresh || []);
    return fresh || [];
  };

  // Extract task/customer cards from agent tool_calls across all messages
  const extractCards = (msgs, freshTasks) => {
    const taskCards = [];
    const customerCards = [];
    for (const msg of msgs) {
      if (!msg.tool_calls) continue;
      for (const tc of msg.tool_calls) {
        if (!tc.results || tc.status === 'error') continue;
        let results;
        try {
          // tool results may be single-quoted Python-style — normalise
          const raw = typeof tc.results === 'string'
            ? tc.results.replace(/'/g, '"').replace(/None/g, 'null').replace(/True/g, 'true').replace(/False/g, 'false')
            : tc.results;
          results = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch { continue; }

        const name = (tc.name || '').toLowerCase();
        if (name.includes('task')) {
          const arr = Array.isArray(results) ? results : (results?.id ? [results] : []);
          // Merge with freshTasks so we always show the latest server state
          const merged = arr.map(t => {
            const server = freshTasks?.find(ft => ft.id === t.id);
            return server || t;
          });
          taskCards.push(...merged);
        }
        if (name.includes('customer') || name.includes('customerprofile')) {
          const arr = Array.isArray(results) ? results : (results?.id ? [results] : []);
          customerCards.push(...arr);
        }
      }
    }
    // Deduplicate by id
    const uniqueTasks = [...new Map(taskCards.map(t => [t.id, t])).values()];
    const uniqueCustomers = [...new Map(customerCards.map(c => [c.id, c])).values()];
    return { taskCards: uniqueTasks, customerCards: uniqueCustomers };
  };

  const sendMessage = async (text) => {
    const userMsg = { role: "user", content: text, _local: true };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const result = await base44.functions.invoke('invokeAgent', {
      user_message: text,
      conversation_id: conversationId || undefined,
    });

    const { conversation_id: newConvId, messages: agentMessages } = result.data;

    if (!conversationId) setConversationId(newConvId);

    // Detect if agent touched any tasks (create/update) and refresh from server
    const agentTouchedTasks = agentMessages.some(m =>
      m.tool_calls?.some(tc => {
        const n = (tc.name || '').toLowerCase();
        return (n.includes('create_task') || n.includes('update_task')) && tc.status === 'success';
      })
    );

    const freshTasks = agentTouchedTasks ? await refreshTasks() : tasks;

    // Sync customer cards
    const { customerCards } = extractCards(agentMessages, freshTasks);
    if (customerCards.length > 0) {
      setCustomers(prev => {
        const map = new Map(prev.map(c => [c.id, c]));
        customerCards.forEach(c => map.set(c.id, c));
        return [...map.values()];
      });
    }

    // Build renderable message list from the full conversation
    const renderable = agentMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => {
        if (m.role !== 'assistant') return m;
        const { taskCards: tc, customerCards: cc } = extractCards([m], freshTasks);
        return { ...m, taskCards: tc, customerCards: cc };
      });

    setMessages(renderable);
    setLoading(false);
  };

  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-72px)] md:h-[calc(100vh-112px)] max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Agent Chat</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered task management</p>
        </div>
        {conversationId && (
          <button
            onClick={startNewConversation}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] border border-white/[0.06] text-muted-foreground hover:text-foreground transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" /> New Chat
          </button>
        )}
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
        {messages.length === 0 && !loading && (
          <div className="flex justify-start">
            <div className="glass-card rounded-2xl px-4 py-3 max-w-[85%]">
              <p className="text-sm text-foreground/90">
                👋 Welcome to <strong>TeamOS Agent</strong>. I can help you create tasks, check workloads, manage assignments, and generate reports. Try typing a command or use the quick prompts above.
              </p>
            </div>
          </div>
        )}

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
                    {msg.content || ""}
                  </ReactMarkdown>
                )}
              </div>

              {/* Task cards from tool results */}
              {msg.taskCards && msg.taskCards.length > 0 && msg.taskCards.map((task, i) => task && (
                <div key={task.id} className="flex items-start gap-2 mt-2">
                  <span className="text-xs font-mono text-muted-foreground mt-4 w-5 text-right flex-shrink-0">{i + 1}.</span>
                  <div className="flex-1">
                    <ChatTaskCard task={task} members={members}
                      onStatusChange={handleStatusChange} onEdit={setEditTask} />
                  </div>
                </div>
              ))}

              {/* Customer cards from tool results */}
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