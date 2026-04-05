import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Phone, Mail, Globe, MessageSquare } from "lucide-react";
import SalesInteractionForm from "./SalesInteractionForm";
import moment from "moment";

const stageConfig = {
  lead: { bg: "bg-blue-500/15", text: "text-blue-400" },
  qualified: { bg: "bg-purple-500/15", text: "text-purple-400" },
  proposal: { bg: "bg-yellow-500/15", text: "text-yellow-400" },
  negotiation: { bg: "bg-orange-500/15", text: "text-orange-400" },
  "closed-won": { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  onboarding: { bg: "bg-cyan-500/15", text: "text-cyan-400" },
  integrating: { bg: "bg-indigo-500/15", text: "text-indigo-400" },
  testing: { bg: "bg-teal-500/15", text: "text-teal-400" },
  "closed-lost": { bg: "bg-red-500/15", text: "text-red-400" },
};

const interactionIcons = { call: Phone, email: Mail, meeting: MessageSquare, demo: Globe, "follow-up": MessageSquare };

export default function CustomerDetail({ customer, salesRep, onUpdate }) {
  const [interactions, setInteractions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [linkedTickets, setLinkedTickets] = useState([]);

  useEffect(() => {
    if (!customer) return;
    setEditForm({ ...customer });
    setShowForm(false);
    setEditing(false);
    base44.entities.SalesInteraction.filter({ customer_id: customer.id }, "-date").then(setInteractions);
    base44.entities.Task.filter({ customer_id: customer.id, is_support_ticket: true }).then(setLinkedTickets);
  }, [customer?.id]);

  const handleSaveInteraction = async (form) => {
    const created = await base44.entities.SalesInteraction.create(form);
    setInteractions(prev => [created, ...prev]);
    setShowForm(false);
  };

  const handleSaveCustomer = async () => {
    await base44.entities.CustomerProfile.update(customer.id, editForm);
    onUpdate({ ...customer, ...editForm });
    setEditing(false);
  };

  if (!customer) return (
    <div className="glass-card rounded-xl p-8 text-center text-muted-foreground text-sm h-full flex items-center justify-center">
      Select a customer to view details
    </div>
  );

  const stage = stageConfig[customer.sales_stage] || stageConfig.lead;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">{customer.name}</h2>
            {customer.company && <p className="text-sm text-muted-foreground">{customer.company}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold uppercase px-3 py-1 rounded-full ${stage.bg} ${stage.text}`}>
              {customer.sales_stage || "lead"}
            </span>
            <button onClick={() => setEditing(!editing)} className="p-1.5 rounded-md hover:bg-white/[0.06]">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {editing ? (
          <div className="space-y-3 border-t border-white/[0.06] pt-3">
            <div className="grid grid-cols-2 gap-3">
              {[["name","Name"],["email","Email"],["phone","Phone"],["company","Company"],["industry","Industry"],["website","Website"],["assigned_sales_rep","Sales Rep"]].map(([k,l]) => (
                <div key={k}>
                  <Label className="text-muted-foreground text-xs">{l}</Label>
                  <input value={editForm[k] || ""} onChange={e => setEditForm({...editForm,[k]:e.target.value})}
                    className="mt-1 w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-xs focus:outline-none focus:border-primary/40" />
                </div>
              ))}
              <div>
                <Label className="text-muted-foreground text-xs">Stage</Label>
                <Select value={editForm.sales_stage} onValueChange={v => setEditForm({...editForm, sales_stage: v})}>
                  <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
                    {["lead","qualified","proposal","negotiation","closed-won","onboarding","integrating","testing","closed-lost"].map(s => (
                      <SelectItem key={s} value={s} className="text-foreground text-xs">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Notes</Label>
              <textarea value={editForm.notes || ""} onChange={e => setEditForm({...editForm, notes: e.target.value})}
                className="mt-1 w-full h-16 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-xs p-2 focus:outline-none focus:border-primary/40 resize-none" />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="text-xs text-muted-foreground">Cancel</Button>
              <Button size="sm" onClick={handleSaveCustomer} className="text-xs">Save</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {customer.email && <p className="text-muted-foreground">✉ {customer.email}</p>}
            {customer.phone && <p className="text-muted-foreground">📞 {customer.phone}</p>}
            {customer.industry && <p className="text-muted-foreground">🏭 {customer.industry}</p>}
            {customer.assigned_sales_rep && <p className="text-muted-foreground">👤 {customer.assigned_sales_rep}</p>}
            {customer.notes && <p className="text-muted-foreground col-span-2 mt-1">{customer.notes}</p>}
          </div>
        )}

        {linkedTickets.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <p className="text-xs text-muted-foreground mb-2">🎟 {linkedTickets.length} linked support ticket{linkedTickets.length > 1 ? "s" : ""}</p>
          </div>
        )}
      </div>

      {/* Interactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Interactions</h3>
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="text-xs gap-1">
            <Plus className="h-3 w-3" /> Log
          </Button>
        </div>
        {showForm && (
          <div className="mb-3">
            <SalesInteractionForm customerId={customer.id} salesRep={salesRep} onSave={handleSaveInteraction} onCancel={() => setShowForm(false)} />
          </div>
        )}
        <div className="space-y-2">
          {interactions.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No interactions logged yet.</p>
          ) : interactions.map(i => {
            const Icon = interactionIcons[i.interaction_type] || MessageSquare;
            return (
              <div key={i.id} className="glass-card rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-md bg-primary/10 flex-shrink-0">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground capitalize">{i.interaction_type}</span>
                      <span className="text-[11px] text-muted-foreground">{moment(i.date).format("MMM D, YYYY")}</span>
                    </div>
                    <p className="text-xs text-foreground/80">{i.summary}</p>
                    {i.outcome && <p className="text-[11px] text-muted-foreground mt-1">→ {i.outcome}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}