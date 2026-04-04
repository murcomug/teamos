import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";

export default function TicketCloseModal({ open, onClose, ticket, onSave }) {
  const [resolutionStatus, setResolutionStatus] = useState("resolved");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (ticket) {
      setResolutionStatus(ticket.resolution_status || "resolved");
      setReason(ticket.unresolved_reason || "");
    }
  }, [ticket]);

  const handleSave = () => {
    if (resolutionStatus === "unresolved" && !reason.trim()) {
      alert("Please provide a reason for closing this ticket as unresolved.");
      return;
    }
    onSave({
      status: "completed",
      resolution_status: resolutionStatus,
      unresolved_reason: resolutionStatus === "resolved" ? "" : reason,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-card border-white/[0.08] bg-[#12121a] text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Close Ticket</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-muted-foreground text-xs">Resolution Status</Label>
            <Select value={resolutionStatus} onValueChange={setResolutionStatus}>
              <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
                <SelectItem value="resolved" className="text-foreground">Resolved</SelectItem>
                <SelectItem value="unresolved" className="text-foreground">Unresolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {resolutionStatus === "unresolved" && (
            <div>
              <Label className="text-muted-foreground text-xs">Reason for Unresolved</Label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this ticket is being closed as unresolved..."
                className="mt-1 w-full h-24 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-sm p-3 focus:outline-none focus:border-primary/40 resize-none"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Close Ticket
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}