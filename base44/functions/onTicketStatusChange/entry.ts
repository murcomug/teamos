import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { data, old_data, event } = payload;

    // Only act when a support ticket moves to 'pending'
    if (!data?.is_support_ticket) return Response.json({ skipped: "not a support ticket" });
    if (data?.status !== "pending") return Response.json({ skipped: "status not pending" });
    if (old_data?.status === "pending") return Response.json({ skipped: "status unchanged" });

    const ticketTitle = data.title || "Untitled Ticket";
    const assigneeName = data.assignee || null;
    const ticketId = event?.entity_id;

    // Resolve assignee email for consistent notification targeting
    let assigneeEmail = null;
    if (assigneeName) {
      const members = await base44.asServiceRole.entities.TeamMember.list();
      const member = members.find(m => m.name === assigneeName);
      assigneeEmail = member?.email || null;
    }

    if (assigneeEmail) {
      await base44.asServiceRole.entities.Notification.create({
        title: "Support Ticket Needs Attention",
        message: `Ticket "${ticketTitle}" is now pending and requires your follow-up.`,
        type: "warning",
        read: false,
        target_user: assigneeEmail,
      });
    }

    // 3. Log the automation action
    await base44.asServiceRole.entities.ActivityLog.create({
      action: "automation_triggered",
      description: `Master Agent auto-created follow-up task for pending ticket: "${ticketTitle}"`,
      user_name: "Master Agent",
      entity_type: "Task",
      entity_id: ticketId,
    });

    return Response.json({ success: true, ticket: ticketTitle });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});