import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Phone, Mail, MessageSquare, Globe, Users } from "lucide-react";
import moment from "moment";

const TYPES = ["call", "email", "meeting", "demo", "follow-up", "other"];
const TYPE_ICONS = { call: Phone, email: Mail, meeting: Users, demo: Globe, "follow-up": MessageSquare, other: MessageSquare };

export default function CustomerInteractionsTab({ customerId, currentUser, onInteractionLogged }) {
  const [interactions, setInteractions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    interaction_type: "call",
    date: new Date().toISOString().split("T")[0],
    summary: "",
    outcome: "",
    next_action: "",
    customer_id: customerId,
  });

  useEffect(() => {
    base44.entities.SalesInteraction.filter({ customer_id: customerId }, "-date").then(setInteractions);
  }, [customerId]);

  const handleSave = async () => {
    if (!form.summary.trim()) return;
    const created = await base44.entities.SalesInteraction.create({ ...form, sales_rep: currentUser?.name });
    setInteractions(p => [created, ...p]);
    setShowForm(false);
    setForm(f => ({ ...f, summary: "", outcome: "", next_action: "" }));
    onInteractionLogged?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Interactions ({interactions.length})</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="text-xs gap-1 bg-primary/15 text-primary hover:bg-primary/25 border-0">
          <Plus className="h-3 w-3" /> Add Interaction
        </Button>
      </div>

      {showForm && (
        <div className="glass-card rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={form.interaction_type} onValueChange={v => setForm(f => ({...f, interaction_type: v}))}>
                <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
                  {TYPES.map(t => <SelectItem key={t} value={t} className="text-foreground capitalize text-xs">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Date</Label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))}
                className="mt-1 w-full h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-xs focus:outline-none focus:border-primary/40" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Summary <span className="text-red-400">*</span></Label>
            <textarea value={form.summary} onChange={e => setForm(f => ({...f, summary: e.target.value}))}
              placeholder="What happened in this interaction?"
              className="mt-1 w-full h-16 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-xs p-2 focus:outline-none focus:border-primary/40 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Outcome</Label>
              <input value={form.outcome} onChange={e => setForm(f => ({...f, outcome: e.target.value}))}
                placeholder="e.g. Demo booked"
                className="mt-1 w-full h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-xs focus:outline-none focus:border-primary/40" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Next Action</Label>
              <input value={form.next_action} onChange={e => setForm(f => ({...f, next_action: e.target.value}))}
                placeholder="e.g. Send proposal by Friday"
                className="mt-1 w-full h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-xs focus:outline-none focus:border-primary/40" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="text-xs text-muted-foreground">Cancel</Button>
            <Button size="sm" onClick={handleSave} className="text-xs bg-primary text-primary-foreground hover:bg-primary/90">Save</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {interactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No interactions logged yet.</p>
        ) : interactions.map(i => {
          const Icon = TYPE_ICONS[i.interaction_type] || MessageSquare;
          return (
            <div key={i.id} className="glass-card rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-foreground capitalize">{i.interaction_type}</span>
                    <span className="text-[11px] text-muted-foreground">{moment(i.date).format("MMM D, YYYY")}</span>
                  </div>
                  <p className="text-xs text-foreground/80">{i.summary}</p>
                  {i.outcome && <p className="text-[11px] text-muted-foreground mt-1">→ {i.outcome}</p>}
                  {i.next_action && <p className="text-[11px] text-primary/80 mt-0.5">Next: {i.next_action}</p>}
                  {i.sales_rep && <p className="text-[11px] text-muted-foreground mt-1">By {i.sales_rep}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}