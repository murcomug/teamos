import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function MemberLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await base44.functions.invoke("teamMemberAuth", { action: "login", email, password });
    const data = res.data;

    if (data?.success) {
      localStorage.setItem("memberSession", JSON.stringify(data.member));
      window.location.href = "/member-portal";
    } else {
      setError(data?.error || "Login failed. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0a0a0f" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">TeamOS Member Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in with your credentials</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label className="text-muted-foreground text-xs mb-1 block">Email Address</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="bg-white/[0.04] border-white/[0.08] text-foreground"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs mb-1 block">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="bg-white/[0.04] border-white/[0.08] text-foreground"
              />
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Admin?{" "}
          <a href="/" className="text-primary hover:underline">Go to admin dashboard</a>
        </p>
      </div>
    </div>
  );
}