import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { Loader2, ShieldCheck } from "lucide-react";

export default function ChangePasswordModal({ open, memberId, onSuccess }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const res = await base44.functions.invoke("teamMemberAuth", { action: "changePassword", memberId, newPassword });

    if (res.data?.success) {
      // Update localStorage session
      const session = JSON.parse(localStorage.getItem("memberSession") || "{}");
      session.must_change_password = false;
      localStorage.setItem("memberSession", JSON.stringify(session));
      onSuccess();
    } else {
      setError(res.data?.error || "Failed to update password.");
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="glass-card border-white/[0.08] bg-[#12121a] text-foreground max-w-md" hideClose>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-foreground">Update Your Password</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Your temporary password must be changed before continuing.</p>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleChange} className="space-y-4 mt-2">
          <div>
            <Label className="text-muted-foreground text-xs">New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground"
            />
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Confirm Password</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              required
              className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
          )}
          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-2" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? "Saving..." : "Set New Password"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}