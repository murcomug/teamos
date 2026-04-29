import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil } from "lucide-react";
import { PRODUCTS, STAGES, SUB_STAGES, isValidSubStage } from "@/lib/crmConfig";
import NotesSection from "./NotesSection";

export default function CustomerOverviewTab({ customer, members, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...customer });

  const startEdit = () => { setForm({ ...customer }); setEditing(true); };

  const save = async () => {
    await onUpdate(form);
    setEditing(false);
  };

  const subStageOptions = SUB_STAGES[form.stage] || [];

  if (!editing) return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-foreground">Customer Information</h3>
        <Button size="sm" variant="ghost" onClick={startEdit} className="text-muted-foreground hover:text-foreground text-xs gap-1">
          <Pencil className="h-3 w-3" /> Edit
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        {[
          ["Company", customer.company_name],
          ["Point of Contact", customer.point_of_contact],
          ["Email", customer.email],
          ["Phone", customer.phone],
          ["Website", customer.website],
          ["Assigned To", customer.assigned_to],
          ["Created By", customer.created_by],
        ].map(([label, value]) => value ? (
          <div key={label}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-foreground mt-0.5">{value}</p>
          </div>
        ) : null)}
      </div>
      {customer.other_details && (
        <div>
          <p className="text-xs text-muted-foreground">Other Details</p>
          <p className="text-foreground text-sm mt-1 whitespace-pre-wrap">{customer.other_details}</p>
        </div>
      )}
      <NotesSection notes={customer.notes} onSave={async (notes) => { await onUpdate({ notes }); }} />
    </div>
  );

  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Edit Customer</h3>
      <div className="grid grid-cols-2 gap-4">
        {[
          ["company_name", "Company Name"],
          ["point_of_contact", "Point of Contact"],
          ["email", "Email"],
          ["phone", "Phone"],
          ["website", "Website"],
        ].map(([key, label]) => (
          <div key={key}>
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Input value={form[key] || ""} onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
              className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground" />
          </div>
        ))}
        <div>
          <Label className="text-xs text-muted-foreground">Assigned To</Label>
          <Select value={form.assigned_to || ""} onValueChange={v => {
            const m = members.find(m => m.name === v);
            setForm(f => ({...f, assigned_to: v, assigned_to_email: m?.email || ""}));
          }}>
            <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
              {members.map(m => <SelectItem key={m.id} value={m.name} className="text-foreground">{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Products */}
      <div>
        <Label className="text-xs text-muted-foreground">Products</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {PRODUCTS.map(p => (
            <button key={p.value}
              onClick={() => setForm(f => ({ ...f, products: f.products?.includes(p.value) ? f.products.filter(x => x !== p.value) : [...(f.products || []), p.value] }))}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                form.products?.includes(p.value) ? "bg-primary/20 text-primary border-primary/50" : "bg-white/[0.04] border-white/[0.08] text-muted-foreground hover:text-foreground"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {/* Other details */}
      <div>
        <Label className="text-xs text-muted-foreground">Other Details</Label>
        <textarea value={form.other_details || ""} onChange={e => setForm(f => ({...f, other_details: e.target.value}))}
          className="mt-1 w-full h-20 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-sm p-3 focus:outline-none focus:border-primary/40 resize-none" />
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="text-muted-foreground text-xs">Cancel</Button>
        <Button size="sm" onClick={save} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs">Save Changes</Button>
      </div>
    </div>
  );
}