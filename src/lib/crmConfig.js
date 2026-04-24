// Centralised CRM config — products, stages, sub-stages, colours

export const PRODUCTS = [
  { value: "virtual_accounts", label: "Virtual Accounts" },
  { value: "usd_tt", label: "USD TT" },
  { value: "collections_payouts", label: "Collections & Payouts" },
  { value: "on_off_ramp", label: "On/Off Ramp" },
  { value: "otc", label: "OTC" },
  { value: "whatsapp_agent", label: "WhatsApp Agent" },
];

export const STAGES = [
  { value: "initial", label: "Initial Leads" },
  { value: "after_sales", label: "After Sales" },
];

export const SUB_STAGES = {
  initial: [
    { value: "qualified", label: "Qualified" },
    { value: "proposal", label: "Proposal" },
    { value: "won", label: "Won" },
    { value: "lost", label: "Lost" },
  ],
  after_sales: [
    { value: "onboarding", label: "Onboarding" },
    { value: "integrating", label: "Integrating" },
    { value: "testing", label: "Testing" },
    { value: "launched", label: "Launched" },
  ],
};

export const ALL_SUB_STAGES = [...SUB_STAGES.initial, ...SUB_STAGES.after_sales];

export const STAGE_CONFIG = {
  initial: { bg: "bg-blue-500/15", text: "text-blue-400", label: "Initial Leads" },
  after_sales: { bg: "bg-teal-500/15", text: "text-teal-400", label: "After Sales" },
};

export const SUB_STAGE_CONFIG = {
  qualified: { bg: "bg-slate-500/15", text: "text-slate-400", label: "Qualified" },
  proposal: { bg: "bg-amber-500/15", text: "text-amber-400", label: "Proposal" },
  won: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Won" },
  lost: { bg: "bg-red-500/15", text: "text-red-400", label: "Lost" },
  onboarding: { bg: "bg-blue-500/15", text: "text-blue-400", label: "Onboarding" },
  integrating: { bg: "bg-purple-500/15", text: "text-purple-400", label: "Integrating" },
  testing: { bg: "bg-orange-500/15", text: "text-orange-400", label: "Testing" },
  launched: { bg: "bg-teal-500/15", text: "text-teal-400", label: "Launched" },
};

export const PRODUCT_LABEL = Object.fromEntries(PRODUCTS.map(p => [p.value, p.label]));

export function isValidSubStage(stage, sub_stage) {
  const valid = SUB_STAGES[stage] || [];
  return valid.some(s => s.value === sub_stage);
}