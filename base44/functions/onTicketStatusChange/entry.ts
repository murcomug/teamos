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
    const assignee = data.assignee || null;
    const ticketId = event?.entity_id;

    // 1. Create a follow-up task linked to the ticket
    await base44.asServiceRole.entities.Task.create({
      title: `Follow up: ${ticketTitle}`,
      description: `Auto-generated follow-up task for support ticket "${ticketTitle}" (ID: ${ticketId}). Please review and action this ticket.`,
      status: "pending",
      priority: "high",
      assignee: assignee || "",
      department: data.department || "",
      due_date: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split("T")[0];
      })(),
      is_support_ticket: false,
      customer_id: data.customer_id || "",
    });

    // 2. Create an in-app notification
    if (assignee) {
      await base44.asServiceRole.entities.Notification.create({
        title: "Support Ticket Needs Attention",
        message: `Ticket "${ticketTitle}" is now pending and requires your follow-up.`,
        type: "warning",
        read: false,
        target_user: assignee,
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