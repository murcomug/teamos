import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data } = payload;

    // Only proceed if there's an assignee
    if (!data?.assignee) {
      return Response.json({ skipped: "no assignee" });
    }

    // On updates, only send if assignee actually changed
    if (event?.type === "update" && old_data?.assignee === data.assignee) {
      return Response.json({ skipped: "assignee unchanged" });
    }

    // Look up the team member's email by name
    const members = await base44.asServiceRole.entities.TeamMember.filter({ name: data.assignee });
    const member = members[0];

    if (!member?.email) {
      return Response.json({ skipped: "member email not found" });
    }

    const isNew = event?.type === "create";
    const subject = isNew
      ? `You've been assigned to a new task: ${data.title}`
      : `You've been assigned to a task: ${data.title}`;

    const body = `
Hi ${member.name},

${isNew ? "A new task has been assigned to you." : "You have been assigned to the following task."}

Task: ${data.title}
${data.description ? `Description: ${data.description}\n` : ""}Priority: ${data.priority || "medium"}
Status: ${data.status || "pending"}
${data.department ? `Department: ${data.department}\n` : ""}${data.due_date ? `Due Date: ${data.due_date}\n` : ""}
Please log in to TeamOS to view and manage this task.

Best regards,
TeamOS
    `.trim();

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TeamOS <onboarding@resend.dev>',
        to: [member.email],
        subject,
        text: body,
      }),
    });
    if (!resendRes.ok) {
      const err = await resendRes.text();
      throw new Error(`Resend error: ${err}`);
    }

    return Response.json({ sent: true, to: member.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});