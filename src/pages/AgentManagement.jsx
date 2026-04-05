import { useState } from "react";
import { Bot, Zap, Shield, ChevronDown, ChevronRight, ArrowRight, Users, Briefcase, CheckSquare, Ticket } from "lucide-react";

const MASTER_AGENT = {
  id: "master",
  name: "Master Agent",
  emoji: "🧠",
  role: "Orchestrator",
  description: "The central AI that handles all chat interactions. It interprets user intent, asks clarifying questions when ambiguous, and either resolves requests directly or delegates to the appropriate sub-agent.",
  skills: [
    "Natural language understanding & intent classification",
    "Clarification prompting (asks before acting on ambiguous requests)",
    "Task creation and management",
    "Support ticket creation and management",
    "Team & department information retrieval",
    "Activity reporting and workload analysis",
    "Sub-agent delegation and orchestration",
  ],
  tools: [
    { name: "Task.create / update / list", icon: CheckSquare, color: "text-blue-400" },
    { name: "SupportTicket.create / update / list", icon: Ticket, color: "text-orange-400" },
    { name: "TeamMember.list", icon: Users, color: "text-violet-400" },
    { name: "Department.list", icon: Users, color: "text-violet-400" },
    { name: "CustomerProfile.read", icon: Briefcase, color: "text-emerald-400" },
    { name: "Delegate → Sales Agent", icon: Bot, color: "text-primary" },
  ],
  subAgents: ["sales"],
  color: "border-primary/40 bg-primary/5",
  badge: "bg-primary/15 text-primary",
};

const SUB_AGENTS = [
  {
    id: "sales",
    name: "Sales Agent",
    emoji: "💼",
    role: "Sales & CRM Specialist",
    description: "Handles all sales-related activities. Activated by the Master Agent when a request involves leads, customer profiles, pipeline stages, or sales interactions.",
    skills: [
      "Customer profile creation and updates",
      "Sales pipeline stage management (lead → closed-won)",
      "Sales interaction logging (calls, meetings, demos, emails)",
      "Lead qualification and follow-up tracking",
      "CRM data retrieval and reporting",
    ],
    tools: [
      { name: "CustomerProfile.create / update / list", icon: Briefcase, color: "text-emerald-400" },
      { name: "SalesInteraction.create / list", icon: Zap, color: "text-yellow-400" },
      { name: "TeamMember.list (sales reps)", icon: Users, color: "text-violet-400" },
    ],
    color: "border-emerald-500/30 bg-emerald-500/5",
    badge: "bg-emerald-500/15 text-emerald-400",
  },
];

function AgentCard({ agent, isOpen, onToggle, isMaster }) {
  return (
    <div className={`glass-card rounded-xl border ${agent.color} overflow-hidden`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/[0.02] transition-all"
      >
        <div className="text-3xl">{agent.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-foreground">{agent.name}</h3>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${agent.badge}`}>{agent.role}</span>
            {isMaster && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-muted-foreground">
                Orchestrator
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{agent.description}</p>
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
      </button>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-white/[0.05] pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Skills</p>
            <ul className="space-y-2">
              {agent.skills.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tools & Data Access</p>
            <ul className="space-y-2">
              {agent.tools.map((t, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  <t.icon className={`h-3.5 w-3.5 flex-shrink-0 ${t.color}`} />
                  <span className="text-foreground/80 font-mono">{t.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgentManagement() {
  const [openAgents, setOpenAgents] = useState({ master: true, sales: false });

  const toggle = (id) => setOpenAgents(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Agent Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Overview of the AI agent hierarchy — roles, skills, and tool access.
        </p>
      </div>

      {/* Architecture overview */}
      <div className="glass-card rounded-xl p-5 mb-8 border border-white/[0.06]">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Agent Hierarchy</p>
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/30">
            <span>🧠</span>
            <span className="text-sm font-semibold text-primary">Master Agent (Orchestrator)</span>
          </div>
          <div className="w-px h-5 bg-white/10" />
          <div className="flex flex-wrap justify-center gap-4">
            {SUB_AGENTS.map(a => (
              <div key={a.id} className="flex flex-col items-center gap-1">
                <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${a.color}`}>
                  <span>{a.emoji}</span>
                  <span className="text-sm font-medium text-foreground">{a.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">
          The Master Agent handles all user interactions. For specialised tasks, it delegates to the relevant sub-agent and returns the result.
        </p>
      </div>

      {/* Master Agent */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Master Agent</p>
        <AgentCard agent={MASTER_AGENT} isOpen={openAgents.master} onToggle={() => toggle("master")} isMaster />
      </div>

      {/* Sub Agents */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-6">Sub-Agents</p>
        <div className="space-y-4">
          {SUB_AGENTS.map(agent => (
            <AgentCard key={agent.id} agent={agent} isOpen={openAgents[agent.id]} onToggle={() => toggle(agent.id)} />
          ))}
        </div>
      </div>

      <div className="mt-8 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Security & Permissions</span>
        </div>
        <p className="text-xs text-muted-foreground">
          All agents operate within the authenticated user's permission scope. The Master Agent enforces role-based restrictions (e.g. non-admins cannot create team members). Sub-agents inherit the same constraints and never bypass access controls set by the platform.
        </p>
      </div>
    </div>
  );
}