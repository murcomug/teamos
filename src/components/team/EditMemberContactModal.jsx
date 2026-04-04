import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";

export default function EditMemberContactModal({ open, onClose, member, onSave }) {
  const [form, setForm] = useState({ email: "", whatsapp: "" });

  useEffect(() => {
    if (member) {
      setForm({
        email: member.email || "",
        whatsapp: member.whatsapp || ""
      });
    }
  }, [member]);

  const handleSave = async () => {
    await onSave(member.id, form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-card border-white/[0.08] bg-[#12121a] text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Contact Details - {member?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-muted-foreground text-xs">Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">WhatsApp Number</Label>
            <Input
              type="tel"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground"
              placeholder="+254712345678"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}