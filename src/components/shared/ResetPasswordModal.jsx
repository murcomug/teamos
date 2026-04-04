import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

export default function ResetPasswordModal({ open, onClose, member, tempPassword, loading }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-card border-white/[0.08] bg-[#12121a] text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Password Reset — {member?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
            <p className="text-xs text-emerald-400 font-semibold mb-1">✓ Password Reset Successful</p>
            <p className="text-xs text-muted-foreground">Share this temporary password with {member?.name}. They will be required to change it on their first login.</p>
          </div>

          <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-3 font-mono text-center">
            <p className="text-sm text-foreground tracking-wider break-all">{tempPassword}</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              onClick={copyToClipboard}
              variant="outline"
              className="gap-2 border-white/[0.08] text-muted-foreground hover:text-foreground"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy Password
                </>
              )}
            </Button>
            <Button onClick={onClose} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}