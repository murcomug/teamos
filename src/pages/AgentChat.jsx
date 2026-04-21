import { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from "react-markdown";
import { Loader2, RotateCcw } from "lucide-react";
import MentionInput from "../components/chat/MentionInput";
import ChatTaskCard from "../components/chat/ChatTaskCard";
import ChatCustomerCard from "../components/chat/ChatCustomerCard";
import TaskEditModal from "../components/shared/TaskEditModal";
import { useCurrentUser } from "@/lib/useCurrentUser";

function pythonReprToJson(raw) {
  return raw
    .replace(/datetime\.datetime\((\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)[^)]*\)/g,
      (_, y, mo, d, h, mi, s) =>
        `"${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}T${h.padStart(2,'0')}:${mi.padStart(2,'0')}:${s.padStart(2,'0')}"`)
    .replace(/\bNone\b/g, 'null')
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    .replace(/'(?:[^'\\]|\\.)*'/g, m => '"' + m.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"') + '"');
}

const quickPrompts = [
  "Create a support ticket",
  "What's overdue today?",
  "Show me IT's workload",
  "Give me the daily status report",
];

// Module-level so it can be used both inside useEffect and in sendMessage
function extractCards(msgs, freshTasks) {
  const taskCards = [];
  const customerCards = [];
  for (const msg of msgs) {
    if (!msg.tool_calls) continue;
    for (const tc of msg.tool_calls) {
      if (!tc.results || tc.status === 'error') continue;
      let results;
      try {
        const raw = typeof tc.results === 'string' ? pythonReprToJson(tc.results) : JSON.stringify(tc.results);
        results = JSON.parse(raw);
      } catch { continue; }

      const name = (tc.name || '').toLowerCase();
      const isTaskTool = name.includes('task');
      const isCustomerTool = name.includes('customer') || name.includes('customerprofile');

      if (isTaskTool) {
        const arr = Array.isArray(results) ? results : (results?.id ? [results] : []);
        const merged = arr.map(t => {
          const server = freshTasks?.find(ft => ft.id === t.id);
          return server || t;
        });
        taskCards.push(...merged);
      }
      if (isCustomerTool) {
        const arr = Array.isArray(results) ? results : (results?.id ? [results] : []);
        customerCards.push(...arr);
      }
    }
  }
  const uniqueTasks = [...new Map(taskCards.map(t => [t.id, t])).values()];
  const uniqueCustomers = [...new Map(customerCards.map(c => [c.id, c])).values()];
  return { taskCards: uniqueTasks, customerCards: uniqueCustomers };
}

export default function AgentChat() {
  const { currentUser } = useCurrentUser();
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [sessionRecordId, setSessionRecordId] = useState(null); // AgentConversation entity ID
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [editTask, setEditTask] = useState(null);
  const scrollRef = useRef(null);

  // On mount: load entity data + restore today's conversation session
  // Wait until currentUser is resolved before attempting session lookup
  useEffect(() => {
    if (currentUser === undefined) return; // still loading
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

    Promise.all([
      base44.entities.TeamMember.list(),
      base44.entities.Department.list(),
      base44.entities.Task.list(),
      base44.entities.CustomerProfile.list(),
      // Find today's session for this user
      currentUser?.id
        ? base44.entities.AgentConversation.filter({ user_id: currentUser.id, agent_name: 'master_agent', title: today })
        : Promise.resolve([]),
    ]).then(async ([m, d, t, c, sessions]) => {
      setMembers(m);
      setDepartments(d);
      setTasks(t || []);
      setCustomers(c || []);

      const todaySession = sessions?.[0];
      if (todaySession?.base44_conversation_id) {
        try {
          // Restore the conversation messages from the cloud
          const conv = await base44.agents.getConversation(todaySession.base44_conversation_id);
          const msgs = conv?.messages || [];
          const renderable = msgs
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => {
              if (m.role !== 'assistant') return m;
              const { taskCards: tc, customerCards: cc } = extractCards([m], t || []);
              return { ...m, taskCards: tc, customerCards: cc };
            });
          setMessages(renderable);
          setConversationId(todaySession.base44_conversation_id);
          setSessionRecordId(todaySession.id);
        } catch {
          // If conversation no longer exists, start fresh
        }
      }
      setRestoring(false);
    });
  }, [currentUser?.id]);

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



  const sendMessage = async (text) => {
    const userMsg = { role: "user", content: text, _local: true };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const result = await base44.functions.invoke('invokeAgent', {
      user_message: text,
      conversation_id: conversationId || undefined,
    });

    const { conversation_id: newConvId, messages: agentMessages } = result.data;

    if (!conversationId) {
      setConversationId(newConvId);
      // Persist today's session in the cloud so it can be restored on any device
      const today = new Date().toISOString().slice(0, 10);
      if (currentUser?.id) {
        if (sessionRecordId) {
          await base44.entities.AgentConversation.update(sessionRecordId, { base44_conversation_id: newConvId });
        } else {
          const record = await base44.entities.AgentConversation.create({
            user_id: currentUser.id,
            agent_name: 'master_agent',
            title: today,
            base44_conversation_id: newConvId,
          });
          setSessionRecordId(record.id);
        }
      }
    }

    // Detect if agent touched any tasks (create/update) and refresh from server
    const agentTouchedTasks = agentMessages.some(m =>
      m.tool_calls?.some(tc => {
        const n = (tc.name || '').toLowerCase();
        // Only refresh on writes (create/update), not reads
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

  const startNewConversation = async () => {
    // Delete the cloud session record so next message starts a fresh conversation
    if (sessionRecordId) {
      await base44.entities.AgentConversation.delete(sessionRecordId);
      setSessionRecordId(null);
    }
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
        {restoring && (
          <div className="flex justify-center py-4">
            <span className="text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Restoring your session...
            </span>
          </div>
        )}
        {!restoring && messages.length === 0 && !loading && (
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