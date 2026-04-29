import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";

export default function MentionInput({ onSend, members = [], departments = [] }) {
  const [value, setValue] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const inputRef = useRef(null);

  const suggestions = [
    ...members.map((m) => ({ type: "user", label: m.name, icon: "👤" })),
    ...departments.map((d) => ({ type: "dept", label: d.name, icon: d.icon || "🏢" })),
  ].filter((s) => s.label.toLowerCase().includes(mentionQuery.toLowerCase()));

  const handleChange = (e) => {
    const val = e.target.value;
    setValue(val);
    const lastAt = val.lastIndexOf("@");
    if (lastAt >= 0 && (lastAt === 0 || val[lastAt - 1] === " ")) {
      const query = val.slice(lastAt + 1);
      setMentionQuery(query);
      setMentionStart(lastAt);
      setShowMentions(true);
      return;
    }
    setShowMentions(false);
  };

  const selectMention = (suggestion) => {
    const before = value.slice(0, mentionStart);
    const after = value.slice(mentionStart + mentionQuery.length + 1);
    setValue(`${before}@${suggestion.label} ${after}`);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleSend = () => {
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (showMentions && suggestions.length > 0) {
        selectMention(suggestions[0]);
      } else {
        setShowMentions(false);
        handleSend();
      }
    }
  };

  return (
    <div className="relative">
      {showMentions && suggestions.length > 0 && (
        <div className="absolute bottom-full mb-2 left-0 w-72 glass-card rounded-xl border border-white/[0.08] overflow-hidden z-10 max-h-48 overflow-y-auto scrollbar-thin">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => selectMention(s)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-white/[0.06] transition-colors text-left">
              <span>{s.icon}</span>
              <span>{s.label}</span>
              <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-mono ${s.type === "user" ? "bg-primary/15 text-primary" : "bg-violet-500/15 text-violet-400"}`}>
                {s.type === "user" ? "person" : "dept"}
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask the AI to create tasks, check workloads, or manage operations... Use @ to mention"
            rows={1}
            className="w-full min-h-[44px] max-h-32 py-3 px-4 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 resize-none transition-all"
          />
        </div>
        <button onClick={handleSend}
          className="h-[44px] w-[44px] rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors flex-shrink-0 glow-primary">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}