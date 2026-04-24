import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Must be authenticated via Base44 (admin)
    // For member-session admins we also accept a memberEmail param
    const { approvalId, decision, notes, approverName, approverEmail } = await req.json();

    if (!approvalId || !decision || !["approved", "rejected"].includes(decision)) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const resolverEmail = approverEmail || user?.email;
    const resolverName = approverName || user?.full_name || user?.email;

    if (!resolverEmail) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the pending approval
    const allApprovals = await base44.asServiceRole.entities.PendingApproval.list();
    const approval = allApprovals?.find(a => a.id === approvalId);

    if (!approval) {
      return Response.json({ error: "Approval not found" }, { status: 404 });
    }
    if (approval.status !== "pending") {
      return Response.json({ error: "This approval has already been resolved" }, { status: 409 });
    }
    if (approval.initiated_by_email === resolverEmail) {
      return Response.json({ error: "You cannot approve your own request" }, { status: 403 });
    }

    const resolvedDate = new Date().toISOString();

    if (decision === "approved") {
      // Execute the payload based on action_type
      const { action_type, payload } = approval;

      if (action_type === "ADD_TEAM_MEMBER") {
        const colors = ["#2dd4bf", "#818cf8", "#f472b6", "#fb923c", "#a78bfa", "#34d399"];
        await base44.asServiceRole.entities.TeamMember.create({
          ...payload,
          status: "active",
          avatar_color: payload.avatar_color || colors[Math.floor(Math.random() * colors.length)],
        });
      } else if (action_type === "EDIT_TEAM_MEMBER") {
        const { id, ...updateData } = payload;
        await base44.asServiceRole.entities.TeamMember.update(id, updateData);
      } else if (action_type === "DEACTIVATE_TEAM_MEMBER") {
        await base44.asServiceRole.entities.TeamMember.update(payload.id, { status: "away" });
      } else if (action_type === "ADD_DEPARTMENT") {
        await base44.asServiceRole.entities.Department.create(payload);
      } else if (action_type === "EDIT_DEPARTMENT") {
        const { id, ...updateData } = payload;
        await base44.asServiceRole.entities.Department.update(id, updateData);
      } else if (action_type === "DELETE_DEPARTMENT") {
        await base44.asServiceRole.entities.Department.delete(payload.id);
      }
    }

    // Mark approval as resolved
    await base44.asServiceRole.entities.PendingApproval.update(approvalId, {
      status: decision,
      approved_by_email: resolverEmail,
      approved_by_name: resolverName,
      resolved_date: resolvedDate,
      notes: notes || "",
    });

    return Response.json({ success: true, decision });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});