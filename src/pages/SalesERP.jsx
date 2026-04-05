import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CustomerList from "../components/erp/CustomerList";
import CustomerDetail from "../components/erp/CustomerDetail";

export default function SalesERP() {
  const [customers, setCustomers] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", company: "", email: "", phone: "", sales_stage: "lead", assigned_sales_rep: "" });

  useEffect(() => {
    Promise.all([
      base44.entities.CustomerProfile.list("-created_date"),
      base44.entities.TeamMember.list(),
    ]).then(([c, m]) => {
      setCustomers(c || []);
      setMembers(m || []);
      setLoading(false);
    });
  }, []);

  const filteredCustomers = customers.filter(c => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.company?.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === "all" || c.sales_stage === stageFilter;
    return matchSearch && matchStage;
  });

  const stageCounts = ["lead","qualified","proposal","negotiation","closed-won","closed-lost"].reduce((acc, s) => {
    acc[s] = customers.filter(c => c.sales_stage === s).length;
    return acc;
  }, {});

  const handleCreate = async () => {
    if (!newForm.name.trim()) return;
    const created = await base44.entities.CustomerProfile.create(newForm);
    setCustomers(prev => [created, ...prev]);
    setSelected(created);
    setShowCreate(false);
    setNewForm({ name: "", company: "", email: "", phone: "", sales_stage: "lead", assigned_sales_rep: "" });
  };

  const handleCustomerUpdate = (updated) => {
    setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSelected(updated);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sales CRM</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Customer profiles, pipeline and interactions</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2 text-sm">
            <Plus className="h-4 w-4" /> New Customer
          </Button>
        </div>

        {/* Pipeline summary */}
        <div className="flex gap-3 mt-4 flex-wrap">
          {[
            { key: "lead", label: "Leads", color: "text-blue-400 bg-blue-500/10" },
            { key: "qualified", label: "Qualified", color: "text-purple-400 bg-purple-500/10" },
            { key: "proposal", label: "Proposal", color: "text-yellow-400 bg-yellow-500/10" },
            { key: "negotiation", label: "Negotiation", color: "text-orange-400 bg-orange-500/10" },
            { key: "closed-won", label: "Won", color: "text-emerald-400 bg-emerald-500/10" },
            { key: "closed-lost", label: "Lost", color: "text-red-400 bg-red-500/10" },
          ].map(({ key, label, color }) => (
            <button key={key} onClick={() => setStageFilter(stageFilter === key ? "all" : key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${color} ${stageFilter === key ? "ring-1 ring-current" : "opacity-70 hover:opacity-100"}`}>
              {label} · {stageCounts[key] || 0}
            </button>
          ))}
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mx-6 mt-4 glass-card rounded-xl p-5 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">New Customer</h3>
            <button onClick={() => setShowCreate(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            {[["name","Name *"],["company","Company"],["email","Email"],["phone","Phone"]].map(([k,l]) => (
              <div key={k}>
                <label className="text-xs text-muted-foreground">{l}</label>
                <input value={newForm[k] || ""} onChange={e => setNewForm({...newForm,[k]:e.target.value})}
                  className="mt-1 w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-xs focus:outline-none focus:border-primary/40" />
              </div>
            ))}
            <div>
              <label className="text-xs text-muted-foreground">Sales Rep</label>
              <Select value={newForm.assigned_sales_rep} onValueChange={v => setNewForm({...newForm, assigned_sales_rep: v})}>
                <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
                  {members.map(m => <SelectItem key={m.id} value={m.name} className="text-foreground text-xs">{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Stage</label>
              <Select value={newForm.sales_stage} onValueChange={v => setNewForm({...newForm, sales_stage: v})}>
                <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
                  {["lead","qualified","proposal","negotiation","closed-won","closed-lost"].map(s => (
                    <SelectItem key={s} value={s} className="text-foreground text-xs">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)} className="text-xs text-muted-foreground">Cancel</Button>
            <Button size="sm" onClick={handleCreate} className="text-xs">Create</Button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: list */}
        <div className="w-72 flex-shrink-0 border-r border-white/[0.06] flex flex-col">
          <div className="p-3 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-xs focus:outline-none focus:border-primary/40" />
            </div>
            <p className="text-[11px] text-muted-foreground px-1 mt-2">{filteredCustomers.length} customer{filteredCustomers.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <CustomerList customers={filteredCustomers} onSelect={setSelected} selectedId={selected?.id} />
            )}
          </div>
        </div>

        {/* Right: detail */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
          <CustomerDetail customer={selected} salesRep="" onUpdate={handleCustomerUpdate} />
        </div>
      </div>
    </div>
  );
}