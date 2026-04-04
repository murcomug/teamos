import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserAvatar from "../components/shared/UserAvatar";

export default function MemberTeam() {
  const [member, setMember] = useState(null);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = localStorage.getItem("memberSession");
    if (!session) {
      window.location.href = "/member-login";
      return;
    }

    try {
      const parsed = JSON.parse(session);
      setMember(parsed);
      loadTeam();
    } catch (err) {
      localStorage.removeItem("memberSession");
      window.location.href = "/member-login";
    }
  }, []);

  const loadTeam = async () => {
    try {
      const members = await base44.entities.TeamMember.list();
      setTeam(members || []);
    } catch (err) {
      console.error("Error loading team:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0f" }}>
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f" }}>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <a href="/member-portal" className="p-2 hover:bg-white/[0.05] rounded-lg">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </a>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Team Directory</h1>
            <p className="text-muted-foreground text-sm mt-1">View your team members</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {team.map((teamMember) => (
              <div key={teamMember.id} className="glass-card rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <UserAvatar name={teamMember.name} color={teamMember.avatar_color} size="md" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{teamMember.name}</h3>
                    <p className="text-xs text-muted-foreground">{teamMember.department}</p>
                    <p className="text-xs text-primary font-medium mt-1">{teamMember.role}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
                  {teamMember.email && (
                    <a href={`mailto:${teamMember.email}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{teamMember.email}</span>
                    </a>
                  )}
                  {teamMember.whatsapp && (
                    <a href={`https://wa.me/${teamMember.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{teamMember.whatsapp}</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}