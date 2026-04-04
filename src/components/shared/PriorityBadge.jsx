const priorityConfig = {
  critical: { bg: "bg-red-500/15", text: "text-red-400", dot: "bg-red-400" },
  high: { bg: "bg-orange-500/15", text: "text-orange-400", dot: "bg-orange-400" },
  medium: { bg: "bg-yellow-500/15", text: "text-yellow-400", dot: "bg-yellow-400" },
  low: { bg: "bg-blue-500/15", text: "text-blue-400", dot: "bg-blue-400" },
};

export default function PriorityBadge({ priority }) {
  const config = priorityConfig[priority] || priorityConfig.medium;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${config.bg} ${config.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {priority}
    </span>
  );
}