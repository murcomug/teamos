const statusConfig = {
  pending: { bg: "bg-slate-500/15", text: "text-slate-400" },
  ongoing: { bg: "bg-primary/15", text: "text-primary" },
  stopped: { bg: "bg-red-500/15", text: "text-red-400" },
  completed: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${config.bg} ${config.text}`}>
      {status}
    </span>
  );
}