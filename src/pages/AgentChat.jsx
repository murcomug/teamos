import { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import MentionInput from "../components/chat/MentionInput";
import MessageBubble from "../components/chat/MessageBubble";
import TaskEditModal from "../components/shared/TaskEditModal";

const quickPrompts = [
  "Create a support ticket",
  "What's overdue today?",
  "Show me IT's workload",
  "Give me the daily status report",
];

export default function AgentChat() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const scrollRef = useRef(null);

  // Initialize agent conversation on mount
  useEffect(() => {
    const initConversation = async () => {
      try {
        const conv = await base44.agents.createConversation({
          agent_name: "operations_lead",
          metadata: {
            name: "Agent Chat",
            description: "Chat with operations lead AI",
          }
        });
        setConversation(conv);
        setMessages(conv.messages || []);

        // Subscribe to conversation updates
        const unsubscribe = base44.agents.subscribeToConversation(conv.id, (data) => {
          setMessages(data.messages || []);
        });
        return unsubscribe;
      } catch (error) {
        console.error("Failed to initialize conversation:", error);
      }
    };

    const unsubscribePromise = initConversation();
    return () => {
      unsubscribePromise.then(unsub => unsub?.());
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStatusChange = async (id, status) => {
    await base44.entities.Task.update(id, { status });
  };

  const handleEditSave = async (form) => {
    if (editTask?.id) {
      await base44.entities.Task.update(editTask.id, form);
    }
  };

  const sendMessage = async (text) => {
    if (!conversation) return;
    setLoading(true);
    
    try {
      await base44.agents.addMessage(conversation, {
        role: "user",
        content: text
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setLoading(false);
    }
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
          <MessageBubble key={idx} message={msg} />
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
        <MentionInput onSend={sendMessage} members={[]} departments={[]} />
      </div>

      <TaskEditModal
        open={!!editTask}
        onClose={() => setEditTask(null)}
        task={editTask}
        onSave={handleEditSave}
        members={[]}
        departments={[]}
        allTasks={[]}
      />
    </div>
  );
}