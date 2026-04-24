import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { CheckCircle2, XCircle, Clock, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

const ACTION_LABELS = {
  ADD_TEAM_MEMBER: "Add Team Member",
  EDIT_TEAM_MEMBER: "Edit Team Member",
  DEACTIVATE_TEAM_MEMBER: "Deactivate Team Member",
  ADD_DEPARTMENT: "Add Department",
  EDIT_DEPARTMENT: "Edit Department",
  DELETE_DEPARTMENT: "Delete Department",
};

function payloadSummary(action_type, payload) {
  if (!payload) return "No details";
  switch (action_type) {
    case "ADD_TEAM_MEMBER":
      return `New member: ${payload.name || "Unknown"}, ${payload.department || "—"}, ${payload.role || "operator"}`;
    case "EDIT_TEAM_MEMBER":
      return `Edit: ${payload.name || payload.id || "Unknown"} — fields: ${Object.keys(payload).filter(k => k !== "id").join(", ")}`;
    case "DEACTIVATE_TEAM_MEMBER":
      return `Deactivate: ${payload.name || payload.id || "Unknown"}`;
    case "ADD_DEPARTMENT":
      return `New department: ${payload.name || "Unknown"} ${payload.icon || ""}`;
    case "EDIT_DEPARTMENT":
      return `Edit department: ${payload.name || payload.id || "Unknown"}`;
    case "DELETE_DEPARTMENT":
      return `Delete department: ${payload.name || payload.id || "Unknown"}`;
    default:
      return JSON.stringify(payload).slice(0, 120);
  }
}

function ApprovalCard({ approval, currentUser, onResolve }) {
  const isMine = approval.initiated_by_email === currentUser?.email;
  const label = ACTION_LABELS[approval.action_type] || approval.action_type;
  const summary = payloadSummary(approval.action_type, approval.payload);

  return (
    <div className="glass-card rounded-xl p-5 border border-white/[0.06]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{label}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium">Pending</span>
          </div>
          <p className="text-xs text-muted-foreground mb-1">{summary}</p>
          <p className="text-[11px] text-muted-foreground">
            Initiated by <span className="text-foreground">{approval.initiated_by_name}</span> · {moment(approval.created_date).fromNow()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {isMine ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
              <span>You initiated — another admin must approve</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => onResolve(approval, "approve")}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                onClick={() => onResolve(approval, "reject")}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryCard({ approval }) {
  const label = ACTION_LABELS[approval.action_type] || approval.action_type;
  const summary = payloadSummary(approval.action_type, approval.payload);
  const approved = approval.status === "approved";

  return (
    <div className="glass-card rounded-xl p-5 border border-white/[0.04] opacity-80">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{label}</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
              approved ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
            }`}>
              {approved ? "Approved" : "Rejected"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-1">{summary}</p>
          <p className="text-[11px] text-muted-foreground">
            Initiated by <span className="text-foreground">{approval.initiated_by_name}</span> · {moment(approval.created_date).fromNow()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {approved ? "Approved" : "Rejected"} by <span className="text-foreground">{approval.approved_by_name}</span>
            {approval.resolved_date ? ` · ${moment(approval.resolved_date).fromNow()}` : ""}
          </p>
          {!approved && approval.notes && (
            <p className="text-[11px] text-red-400 mt-1">Reason: {approval.notes}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Approvals() {
  const navigate = useNavigate();
  const { currentUser, canViewApprovals, loading } = useCurrentUser();
  const [approvals, setApprovals] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [resolving, setResolving] = useState(null); // { approval, decision }
  const [rejectNotes, setRejectNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (loading) return;
    if (!canViewApprovals) {
      navigate("/", { replace: true });
      return;
    }
    loadApprovals();

    const unsubscribe = base44.entities.PendingApproval.subscribe((event) => {
      if (event.type === "create") setApprovals(prev => [event.data, ...prev]);
      else if (event.type === "update") setApprovals(prev => prev.map(a => a.id === event.id ? event.data : a));
    });
    return unsubscribe;
  }, [loading, canViewApprovals]);

  const loadApprovals = async () => {
    const data = await base44.entities.PendingApproval.list("-created_date", 200);
    setApprovals(data || []);
    setDataLoading(false);
  };

  const pending = approvals.filter(a => a.status === "pending");
  const history = approvals.filter(a => a.status !== "pending").sort((a, b) =>
    new Date(b.resolved_date || b.created_date) - new Date(a.resolved_date || a.created_date)
  );

  const handleResolve = (approval, decision) => {
    setRejectNotes("");
    setResolving({ approval, decision });
  };

  const handleConfirmResolve = async () => {
    if (!resolving) return;
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("resolveApproval", {
        approvalId: resolving.approval.id,
        decision: resolving.decision === "approve" ? "approved" : "rejected",
        notes: rejectNotes || "",
        approverName: currentUser?.name,
        approverEmail: currentUser?.email,
      });

      if (res.data?.error) throw new Error(res.data.error);

      toast({
        title: resolving.decision === "approve" ? "Action approved and executed" : "Request rejected",
        description: resolving.decision === "approve"
          ? "The action has been successfully executed."
          : "The request has been rejected and discarded.",
      });
      setResolving(null);
      await loadApprovals();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || dataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-3">
            Approvals
            {pending.length > 0 && (
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {pending.length} pending
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Review and approve or reject pending admin actions</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "pending" ? "bg-primary/15 text-primary" : "bg-white/[0.04] border border-white/[0.06] text-muted-foreground hover:text-foreground"
          }`}
        >
          Pending ({pending.length})
        </button>
        <button
          onClick={() => setTab("history")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "history" ? "bg-primary/15 text-primary" : "bg-white/[0.04] border border-white/[0.06] text-muted-foreground hover:text-foreground"
          }`}
        >
          History ({history.length})
        </button>
      </div>

      {/* Content */}
      {tab === "pending" && (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <div className="glass-card rounded-xl p-10 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-3 opacity-60" />
              <p className="text-sm text-muted-foreground">No pending approvals</p>
            </div>
          ) : (
            pending.map(a => (
              <ApprovalCard key={a.id} approval={a} currentUser={currentUser} onResolve={handleResolve} />
            ))
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="glass-card rounded-xl p-10 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">No resolved approvals yet</p>
            </div>
          ) : (
            history.map(a => <HistoryCard key={a.id} approval={a} />)
          )}
        </div>
      )}

      {/* Approve Confirmation Modal */}
      <Dialog open={resolving?.decision === "approve"} onOpenChange={() => setResolving(null)}>
        <DialogContent className="glass-card border-white/[0.08] bg-[#12121a] text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Approval</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to approve this action? This will{" "}
              <span className="text-foreground font-medium">
                {ACTION_LABELS[resolving?.approval?.action_type]?.toLowerCase()}
              </span>{" "}
              immediately.
            </p>
            {resolving?.approval && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 text-xs text-muted-foreground">
                {payloadSummary(resolving.approval.action_type, resolving.approval.payload)}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setResolving(null)} className="text-muted-foreground">Cancel</Button>
              <Button
                onClick={handleConfirmResolve}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting ? "Approving..." : "Approve & Execute"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={resolving?.decision === "reject"} onOpenChange={() => setResolving(null)}>
        <DialogContent className="glass-card border-white/[0.08] bg-[#12121a] text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              This will discard the action. Optionally provide a reason.
            </p>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Reason for rejection (optional)"
              className="w-full h-24 rounded-lg bg-white/[0.04] border border-white/[0.08] text-foreground text-sm p-3 focus:outline-none focus:border-primary/40 resize-none"
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setResolving(null)} className="text-muted-foreground">Cancel</Button>
              <Button
                onClick={handleConfirmResolve}
                disabled={submitting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {submitting ? "Rejecting..." : "Reject Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}