const stageConfig = {
  lead: { bg: "bg-blue-500/15", text: "text-blue-400", label: "Lead" },
  qualified: { bg: "bg-purple-500/15", text: "text-purple-400", label: "Qualified" },
  proposal: { bg: "bg-yellow-500/15", text: "text-yellow-400", label: "Proposal" },
  "closed-won": { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Won" },
  "closed-lost": { bg: "bg-red-500/15", text: "text-red-400", label: "Lost" },
  onboarding: { bg: "bg-cyan-500/15", text: "text-cyan-400", label: "Onboarding" },
  integrating: { bg: "bg-indigo-500/15", text: "text-indigo-400", label: "Integrating" },
  testing: { bg: "bg-teal-500/15", text: "text-teal-400", label: "Testing" },
  launched: { bg: "bg-emerald-500/25", text: "text-emerald-300", label: "Launched" },
};

export default function CustomerList({ customers, onSelect, selectedId }) {
  return (
    <div className="space-y-2">
      {customers.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">No customers found.</div>
      ) : (
        customers.map(c => {
          const stage = stageConfig[c.sales_stage] || stageConfig.lead;
          return (
            <div
              key={c.id}
              onClick={() => onSelect(c)}
              className={`glass-card rounded-xl p-4 cursor-pointer transition-all hover:border-primary/30 ${selectedId === c.id ? "border-primary/40 bg-primary/5" : ""}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                  {c.company && <p className="text-xs text-muted-foreground truncate">{c.company}</p>}
                  {c.assigned_sales_rep && (
                    <p className="text-xs text-muted-foreground mt-1">Rep: {c.assigned_sales_rep}</p>
                  )}
                </div>
                <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${stage.bg} ${stage.text} flex-shrink-0`}>
                {stage.label || c.sales_stage || "lead"}
              </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}