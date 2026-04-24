import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Pencil } from "lucide-react";
import { PRODUCTS, STAGES, SUB_STAGES, STAGE_CONFIG, SUB_STAGE_CONFIG, PRODUCT_LABEL, isValidSubStage } from "@/lib/crmConfig";
import StageBadge from "@/components/crm/StageBadge";
import SubStageBadge from "@/components/crm/SubStageBadge";
import ProductPills from "@/components/crm/ProductPills";
import CustomerOverviewTab from "@/components/crm/CustomerOverviewTab";
import CustomerInteractionsTab from "@/components/crm/CustomerInteractionsTab";
import CustomerTasksTab from "@/components/crm/CustomerTasksTab";
import MoveStageModal from "@/components/crm/MoveStageModal";
import moment from "moment";

const TABS = ["Overview", "Interactions", "Tasks", "Activity Log"];

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();
  const { toast } = useToast();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Overview");
  const [activityLogs, setActivityLogs] = useState([]);
  const [showMoveStage, setShowMoveStage] = useState(false);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      base44.entities.Customer.filter({ id }, "-created_date", 1),
      base44.entities.TeamMember.list(),
      base44.entities.ActivityLog.filter({ entity_id: id }, "-created_date", 50),
    ]).then(([custs, mems, logs]) => {
      setCustomer(Array.isArray(custs) ? custs[0] : custs || null);
      setMembers(mems || []);
      setActivityLogs(logs || []);
      setLoading(false);
    });
  }, [id]);

  const handleUpdate = async (updated) => {
    await base44.entities.Customer.update(id, updated);
    setCustomer(c => ({ ...c, ...updated }));
    toast({ title: "Customer updated" });
  };

  const handleMoveStage = async ({ stage, sub_stage }) => {
    const old = customer;
    const oldLabel = `${STAGE_CONFIG[old.stage]?.label} → ${SUB_STAGE_CONFIG[old.sub_stage]?.label}`;
    const newLabel = `${STAGE_CONFIG[stage]?.label} → ${SUB_STAGE_CONFIG[sub_stage]?.label}`;
    await base44.entities.Customer.update(id, { stage, sub_stage, last_activity_date: new Date().toISOString() });
    setCustomer(c => ({ ...c, stage, sub_stage }));
    await base44.functions.invoke("logActivity", {
      action: "CUSTOMER_STAGE_MOVED",
      description: `${currentUser?.name} moved ${customer.company_name} from ${oldLabel} to ${newLabel}`,
      entity_type: "Customer",
      entity_id: id,
      user_name: currentUser?.name,
    });
    const newLog = {
      id: Date.now().toString(),
      action: "CUSTOMER_STAGE_MOVED",
      description: `${currentUser?.name} moved ${customer.company_name} from ${oldLabel} to ${newLabel}`,
      created_date: new Date().toISOString(),
      user_name: currentUser?.name,
    };
    setActivityLogs(p => [newLog, ...p]);
    setShowMoveStage(false);
    toast({ title: `Moved to ${newLabel}` });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!customer) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-muted-foreground">Customer not found.</p>
      <Button variant="ghost" onClick={() => navigate("/crm")}>Back to CRM</Button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate("/crm")} className="p-2 rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-foreground transition-colors mt-1 flex-shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{customer.company_name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <StageBadge stage={customer.stage} />
                <SubStageBadge subStage={customer.sub_stage} />
                <ProductPills products={customer.products} max={4} />
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                {customer.assigned_to && <span>👤 {customer.assigned_to}</span>}
                {customer.created_by && <span>Created by {customer.created_by}</span>}
                {customer.created_date && <span>{moment(customer.created_date).format("MMM D, YYYY")}</span>}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={() => setShowMoveStage(true)}
                className="border-white/[0.08] text-muted-foreground hover:text-foreground text-xs">
                Move Stage
              </Button>
              <Button size="sm" onClick={() => setTab("Overview")}
                className="bg-primary/15 text-primary hover:bg-primary/25 border-0 text-xs">
                <Pencil className="h-3 w-3 mr-1" /> Edit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06]">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <CustomerOverviewTab customer={customer} members={members} onUpdate={handleUpdate} />
      )}
      {tab === "Interactions" && (
        <CustomerInteractionsTab customerId={id} currentUser={currentUser} onInteractionLogged={() => {
          base44.entities.Customer.update(id, { last_activity_date: new Date().toISOString() });
        }} />
      )}
      {tab === "Tasks" && (
        <CustomerTasksTab customerId={id} customerName={customer.company_name} currentUser={currentUser} members={members} />
      )}
      {tab === "Activity Log" && (
        <div className="space-y-2">
          {activityLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No activity logged yet.</p>
          ) : activityLogs.map(log => (
            <div key={log.id} className="glass-card rounded-lg p-4 border border-white/[0.04]">
              <p className="text-sm text-foreground">{log.description}</p>
              <div className="flex items-center gap-3 mt-1">
                {log.user_name && <span className="text-xs text-muted-foreground">{log.user_name}</span>}
                <span className="text-xs text-muted-foreground">{moment(log.created_date).fromNow()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <MoveStageModal
        open={showMoveStage}
        onClose={() => setShowMoveStage(false)}
        currentStage={customer.stage}
        currentSubStage={customer.sub_stage}
        onSave={handleMoveStage}
      />
    </div>
  );
}