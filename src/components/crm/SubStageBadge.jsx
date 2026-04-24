import { SUB_STAGE_CONFIG } from "@/lib/crmConfig";

export default function SubStageBadge({ subStage }) {
  const cfg = SUB_STAGE_CONFIG[subStage];
  if (!cfg) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}