import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, LogOut } from "lucide-react";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Profile</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground text-xs">Full Name</Label>
            <Input value={user?.full_name || ""} readOnly
              className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground opacity-60" />
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Email</Label>
            <Input value={user?.email || ""} readOnly
              className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground opacity-60" />
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Role</Label>
            <Input value={user?.role || "user"} readOnly
              className="mt-1 bg-white/[0.04] border-white/[0.08] text-foreground opacity-60" />
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Appearance</h3>
        <p className="text-sm text-muted-foreground">TeamOS uses a dark theme optimized for extended use. Theme customization coming soon.</p>
      </div>

      {/* Actions */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Account</h3>
        <Button variant="ghost" onClick={() => base44.auth.logout()}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  );
}