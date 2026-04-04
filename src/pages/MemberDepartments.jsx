import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMemberSession } from "@/lib/MemberSessionContext";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MemberDepartments() {
  const navigate = useNavigate();
  const { memberSession } = useMemberSession();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!memberSession) {
      navigate("/member-login");
      return;
    }
    loadDepartments();
  }, [memberSession, navigate]);

  const loadDepartments = async () => {
    try {
      const depts = await base44.entities.Department.list();
      setDepartments(depts || []);
    } catch (err) {
      console.error("Error loading departments:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!memberSession) {
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
            <h1 className="text-3xl font-bold text-foreground">Departments</h1>
            <p className="text-muted-foreground text-sm mt-1">Organization departments</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <div key={dept.id} className="glass-card rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{dept.name}</h3>
                    {dept.head && <p className="text-xs text-muted-foreground mt-1">Head: {dept.head}</p>}
                  </div>
                  {dept.icon && <span className="text-2xl">{dept.icon}</span>}
                </div>
                {dept.description && (
                  <p className="text-sm text-muted-foreground">{dept.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}