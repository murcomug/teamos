import { STAGE_CONFIG, SUB_STAGE_CONFIG, PRODUCT_LABEL } from "@/lib/crmConfig";

export default function ChatCustomerCard({ customer }) {
  if (!customer) return null;

  // Support both new Customer entity (company_name, stage, sub_stage)
  // and legacy CustomerProfile entity (name, company, sales_stage)
  const displayName = customer.company_name || customer.name;
  const displaySub = customer.point_of_contact || customer.company;
  const stageCfg = STAGE_CONFIG[customer.stage];
  const subCfg = SUB_STAGE_CONFIG[customer.sub_stage];

  return (
    <div className="glass-card rounded-xl p-3 mt-2 border border-white/[0.06]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
          {displaySub && <p className="text-xs text-muted-foreground truncate">{displaySub}</p>}
          {customer.email && <p className="text-[11px] text-muted-foreground mt-0.5">✉ {customer.email}</p>}
          {customer.phone && <p className="text-[11px] text-muted-foreground">📞 {customer.phone}</p>}
          {customer.assigned_to && <p className="text-[11px] text-muted-foreground">👤 {customer.assigned_to}</p>}
          {customer.products?.length > 0 && (
            <p className="text-[11px] text-primary/80 mt-0.5">
              {customer.products.map(p => PRODUCT_LABEL[p] || p).join(", ")}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0 items-end">
          {stageCfg && (
            <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${stageCfg.bg} ${stageCfg.text}`}>
              {stageCfg.label}
            </span>
          )}
          {subCfg && (
            <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${subCfg.bg} ${subCfg.text}`}>
              {subCfg.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}