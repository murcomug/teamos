import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Building2 } from "lucide-react";

export default function TicketCreateModal({ open, onClose, onSave, members = [], departments = [] }) {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    assignee: "",
    department: "",
    due_date: "",
    customer_id: "",
    customer_name: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      base44.entities.Customer.list("company_name", 100).then(setCustomers).catch(() => setCustomers([]));
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setForm({
        title: "",
        description: "",
        priority: "medium",
        assignee: "",
        department: "",
        due_date: tomorrow,
        customer_id: "",
        customer_name: "",
      });
      setError("");
    }
  }, [open]);

  const handleCustomerChange = (customerId) => {
    const customer = customers.find((c) => c.id === customerId);
    setForm((f) => ({
      ...f,
      customer_id: customerId,
      customer_name: customer?.company_name || "",
    }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (!form.customer_id) { setError("Please attach a customer to this ticket."); return; }
    setSaving(true);
    setError("");
    await onSave({ ...form, is_support_ticket: true });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-card border-white/[0.08] bg-[#12121a] text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">New Support Ticket</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Customer — required */}
          <div>
            <Label className="text-muted-foreground text-xs">
              Customer <span className="text-red-400">*</span>
            </Label>
            <Select value={form.customer_id} onValueChange={handleCustomerChange}>
              <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground">
                <SelectValue placeholder="Select a customer..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
                {customers.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">No customers found</div>
                )}
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-foreground">
                    <span className="flex items-center gap-2">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      {c.company_name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div>
            <Label className="text-muted-foreground text-xs">
              Issue Title <span className="text-red-400">*</span>
            </Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Brief description of the issue"
              className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-muted-foreground text-xs">Details</Label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Full description of the issue..."
              className="mt-1 w-full h-24 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-sm p-3 focus:outline-none focus:border-primary/40 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <Label className="text-muted-foreground text-xs">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
                  {["critical", "high", "medium", "low"].map((p) => (
                    <SelectItem key={p} value={p} className="text-foreground capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div>
              <Label className="text-muted-foreground text-xs">Due Date</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Assignee */}
            <div>
              <Label className="text-muted-foreground text-xs">Assignee</Label>
              <Select value={form.assignee} onValueChange={(v) => setForm((f) => ({ ...f, assignee: v }))}>
                <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.name} className="text-foreground">{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department */}
            <div>
              <Label className="text-muted-foreground text-xs">Department</Label>
              <Select value={form.department} onValueChange={(v) => setForm((f) => ({ ...f, department: v }))}>
                <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.name} className="text-foreground">{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/20 border border-red-500/30">
              <AlertCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
              <span className="text-xs text-red-400">{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {saving ? "Creating..." : "Create Ticket"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}