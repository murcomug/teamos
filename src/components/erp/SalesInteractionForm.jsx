import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SalesInteractionForm({ customerId, salesRep, onSave, onCancel }) {
  const [form, setForm] = useState({
    interaction_type: "call",
    summary: "",
    date: new Date().toISOString().split("T")[0],
    outcome: "",
    sales_rep: salesRep || "",
    customer_id: customerId,
  });

  const handleSave = () => {
    if (!form.summary.trim()) return;
    onSave(form);
  };

  return (
    <div className="glass-card rounded-xl p-4 space-y-3">
      <h4 className="text-sm font-semibold text-foreground">Log Interaction</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-muted-foreground text-xs">Type</Label>
          <Select value={form.interaction_type} onValueChange={v => setForm({ ...form, interaction_type: v })}>
            <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
              {["call", "email", "meeting", "demo", "follow-up"].map(t => (
                <SelectItem key={t} value={t} className="text-foreground capitalize text-xs">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">Date</Label>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
            className="mt-1 w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-xs focus:outline-none focus:border-primary/40"
          />
        </div>
      </div>
      <div>
        <Label className="text-muted-foreground text-xs">Summary</Label>
        <textarea
          value={form.summary}
          onChange={e => setForm({ ...form, summary: e.target.value })}
          placeholder="What happened in this interaction?"
          className="mt-1 w-full h-16 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-xs p-2 focus:outline-none focus:border-primary/40 resize-none"
        />
      </div>
      <div>
        <Label className="text-muted-foreground text-xs">Outcome</Label>
        <input
          value={form.outcome}
          onChange={e => setForm({ ...form, outcome: e.target.value })}
          placeholder="e.g., Follow-up scheduled, Demo booked"
          className="mt-1 w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-xs focus:outline-none focus:border-primary/40"
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button size="sm" variant="ghost" onClick={onCancel} className="text-xs text-muted-foreground">Cancel</Button>
        <Button size="sm" onClick={handleSave} className="text-xs">Save</Button>
      </div>
    </div>
  );
}