import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

function actionTypeLabel(action_type) {
  const labels = {
    ADD_TEAM_MEMBER: "Add Team Member",
    EDIT_TEAM_MEMBER: "Edit Team Member",
    DEACTIVATE_TEAM_MEMBER: "Deactivate Team Member",
    ADD_DEPARTMENT: "Add Department",
    EDIT_DEPARTMENT: "Edit Department",
    DELETE_DEPARTMENT: "Delete Department",
  };
  return labels[action_type] || action_type;
}

function payloadSummary(action_type, payload) {
  if (!payload) return "No details available.";
  switch (action_type) {
    case "ADD_TEAM_MEMBER":
      return `Add new team member: ${payload.name || "Unknown"} (${payload.email || ""}) — ${payload.department || ""} Department, Role: ${payload.role || "operator"}`;
    case "EDIT_TEAM_MEMBER":
      return `Edit team member: ${payload.name || payload.id || "Unknown"} — Updated fields: ${Object.keys(payload).filter(k => k !== "id").join(", ")}`;
    case "DEACTIVATE_TEAM_MEMBER":
      return `Deactivate team member: ${payload.name || payload.id || "Unknown"}`;
    case "ADD_DEPARTMENT":
      return `Add new department: ${payload.name || "Unknown"} ${payload.icon || ""}`;
    case "EDIT_DEPARTMENT":
      return `Edit department: ${payload.name || payload.id || "Unknown"}`;
    case "DELETE_DEPARTMENT":
      return `Delete department: ${payload.name || payload.id || "Unknown"}`;
    default:
      return JSON.stringify(payload).slice(0, 200);
  }
}

async function sendEmail(to, subject, body) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "TeamOS <noreply@updates.base44.com>",
      to,
      subject,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:8px;">
        <h2 style="color:#111827;margin-bottom:16px;">TeamOS — Action Pending Your Approval</h2>
        <div style="background:#fff;border-radius:6px;padding:20px;border:1px solid #e5e7eb;white-space:pre-line;color:#374151;font-size:14px;line-height:1.6;">
${body}
        </div>
        <p style="color:#6b7280;font-size:12px;margin-top:16px;">Please log in to TeamOS and navigate to Approvals to review this request.</p>
      </div>`,
    }),
  });
  return res.ok;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const reqBody = await req.json();

    // Support both direct invocation { approval } and entity automation payload { data }
    const approval = reqBody.approval || reqBody.data;

    if (!approval) {
      return Response.json({ error: "Missing approval data" }, { status: 400 });
    }

    // Get all admins except the initiator
    const allMembers = await base44.asServiceRole.entities.TeamMember.filter({ role: "admin" });
    const targets = allMembers.filter(m => m.email !== approval.initiated_by_email && m.email);

    if (targets.length === 0) {
      return Response.json({ sent: 0, message: "No other admins to notify" });
    }

    const actionLabel = actionTypeLabel(approval.action_type);
    const summary = payloadSummary(approval.action_type, approval.payload);

    const emailBody = `${approval.initiated_by_name} has initiated the following action that requires your approval:

Action: ${actionLabel}
Details: ${summary}

Please log in to TeamOS and navigate to Approvals to review this request.

This action will not be executed until approved by another admin.`;

    const results = await Promise.allSettled(
      targets.map(admin => sendEmail(admin.email, "TeamOS — Action Pending Your Approval", emailBody))
    );

    const sent = results.filter(r => r.status === "fulfilled" && r.value).length;
    return Response.json({ sent, total: targets.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});