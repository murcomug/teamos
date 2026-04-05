const stageConfig = {
  lead: { bg: "bg-blue-500/15", text: "text-blue-400" },
  qualified: { bg: "bg-purple-500/15", text: "text-purple-400" },
  proposal: { bg: "bg-yellow-500/15", text: "text-yellow-400" },
  negotiation: { bg: "bg-orange-500/15", text: "text-orange-400" },
  "closed-won": { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  "closed-lost": { bg: "bg-red-500/15", text: "text-red-400" },
};

export default function ChatCustomerCard({ customer }) {
  if (!customer) return null;
  const stage = stageConfig[customer.sales_stage] || stageConfig.lead;
  return (
    <div className="glass-card rounded-xl p-3 mt-2 border border-white/[0.06]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{customer.name}</p>
          {customer.company && <p className="text-xs text-muted-foreground">{customer.company}</p>}
          {customer.email && <p className="text-[11px] text-muted-foreground mt-0.5">✉ {customer.email}</p>}
          {customer.phone && <p className="text-[11px] text-muted-foreground">📞 {customer.phone}</p>}
          {customer.assigned_sales_rep && <p className="text-[11px] text-muted-foreground">👤 {customer.assigned_sales_rep}</p>}
        </div>
        <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${stage.bg} ${stage.text}`}>
          {customer.sales_stage || "lead"}
        </span>
      </div>
    </div>
  );
}