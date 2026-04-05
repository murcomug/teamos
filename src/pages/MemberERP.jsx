import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMemberSession } from "@/lib/MemberSessionContext";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CustomerList from "../components/erp/CustomerList";
import CustomerDetail from "../components/erp/CustomerDetail";

export default function MemberERP() {
  const { memberSession } = useMemberSession();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", company: "", email: "", phone: "", sales_stage: "lead", assigned_sales_rep: memberSession?.name || "" });

  useEffect(() => {
    base44.entities.CustomerProfile.list("-created_date").then(c => {
      setCustomers(c || []);
      setLoading(false);
    });
  }, []);

  const filteredCustomers = customers.filter(c => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.company?.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === "all" || c.sales_stage === stageFilter;
    return matchSearch && matchStage;
  });

  const handleCreate = async () => {
    if (!newForm.name.trim()) return;
    const created = await base44.entities.CustomerProfile.create(newForm);
    setCustomers(prev => [created, ...prev]);
    setSelected(created);
    setShowCreate(false);
    setNewForm({ name: "", company: "", email: "", phone: "", sales_stage: "lead", assigned_sales_rep: memberSession?.name || "" });
  };

  const handleCustomerUpdate = (updated) => {
    setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSelected(updated);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-5 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sales CRM</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Customer profiles and sales pipeline</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2 text-sm">
            <Plus className="h-4 w-4" /> New Customer
          </Button>
        </div>
      </div>

      {showCreate && (
        <div className="mx-6 mt-4 glass-card rounded-xl p-5 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">New Customer</h3>
            <button onClick={() => setShowCreate(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            {[["name","Name *"],["company","Company"],["email","Email"],["phone","Phone"],["assigned_sales_rep","Sales Rep"]].map(([k,l]) => (
              <div key={k}>
                <label className="text-xs text-muted-foreground">{l}</label>
                <input value={newForm[k] || ""} onChange={e => setNewForm({...newForm,[k]:e.target.value})}
                  className="mt-1 w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-xs focus:outline-none focus:border-primary/40" />
              </div>
            ))}
            <div>
              <label className="text-xs text-muted-foreground">Stage</label>
              <Select value={newForm.sales_stage} onValueChange={v => setNewForm({...newForm, sales_stage: v})}>
                <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
                  {["lead","qualified","proposal","closed-won","closed-lost"].map(s => (
                    <SelectItem key={s} value={s} className="text-foreground text-xs capitalize">{s}</SelectItem>
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

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Customer List */}
        <div className="w-72 flex-shrink-0 border-r border-white/[0.06] flex flex-col">
          <div className="p-3 space-y-2 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-xs focus:outline-none focus:border-primary/40" />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-foreground h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
                <SelectItem value="all" className="text-foreground text-xs">All Stages</SelectItem>
                {["lead","qualified","proposal","closed-won","closed-lost","onboarding","integrating","testing","launched"].map(s => (
                  <SelectItem key={s} value={s} className="text-foreground text-xs capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground px-1">{filteredCustomers.length} customer{filteredCustomers.length !== 1 ? "s" : ""}</p>
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

        {/* Right: Customer Detail */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
          <CustomerDetail customer={selected} salesRep={memberSession?.name} onUpdate={handleCustomerUpdate} />
        </div>
      </div>
    </div>
  );
}