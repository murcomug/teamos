import { PRODUCT_LABEL } from "@/lib/crmConfig";

export default function ProductPills({ products = [], max = 3, small = false }) {
  if (!products || products.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const shown = products.slice(0, max);
  const extra = products.length - max;
  const sz = small ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2 py-0.5";
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map(p => (
        <span key={p} className={`rounded-full bg-primary/10 text-primary font-medium ${sz}`}>
          {PRODUCT_LABEL[p] || p}
        </span>
      ))}
      {extra > 0 && (
        <span className={`rounded-full bg-white/[0.06] text-muted-foreground font-medium ${sz}`}>
          +{extra} more
        </span>
      )}
    </div>
  );
}