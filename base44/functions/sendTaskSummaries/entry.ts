import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendEmail({ to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "TeamOS <noreply@blockchainag.io>",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const summaryType = body.summaryType || "daily";

    const [tasks, members] = await Promise.all([
      base44.asServiceRole.entities.Task.list(),
      base44.asServiceRole.entities.TeamMember.list()
    ]);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    const results = [];
    const errors = [];

    for (const member of members) {
      if (!member.email) continue;

      const memberTasks = tasks.filter(t => t.assignee === member.name && t.status !== 'completed');
      if (memberTasks.length === 0) continue;

      let subject = '';
      let html = '';

      if (summaryType === 'daily') {
        const todayTasks = memberTasks.filter(t => t.due_date === todayStr);
        const overdue = memberTasks.filter(t => t.due_date && t.due_date < todayStr);
        const upcoming = memberTasks.filter(t => !t.due_date || t.due_date > todayStr);

        subject = `📋 Your Task Summary for Today — ${todayStr}`;

        const taskRow = (t) => `
          <tr style="border-bottom:1px solid #2a2a3a;">
            <td style="padding:10px 8px;color:#e2e8f0;">${t.title}</td>
            <td style="padding:10px 8px;text-align:center;">
              <span style="padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:${
                t.priority === 'critical' ? '#7f1d1d' : t.priority === 'high' ? '#7c2d12' : t.priority === 'medium' ? '#713f12' : '#1e3a5f'
              };color:${
                t.priority === 'critical' ? '#fca5a5' : t.priority === 'high' ? '#fdba74' : t.priority === 'medium' ? '#fde047' : '#93c5fd'
              };">${t.priority}</span>
            </td>
            <td style="padding:10px 8px;text-align:center;">
              <span style="padding:2px 8px;border-radius:999px;font-size:11px;background:#1e293b;color:#94a3b8;">${t.status}</span>
            </td>
            <td style="padding:10px 8px;color:#94a3b8;text-align:right;">${t.due_date || '—'}</td>
          </tr>`;

        const section = (title, taskList) => taskList.length === 0 ? '' : `
          <h3 style="color:#94a3b8;font-size:13px;margin:24px 0 8px;">${title}</h3>
          <table style="width:100%;border-collapse:collapse;background:#12121a;border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:#1a1a2e;">
                <th style="padding:8px;text-align:left;color:#64748b;font-size:11px;">Task</th>
                <th style="padding:8px;text-align:center;color:#64748b;font-size:11px;">Priority</th>
                <th style="padding:8px;text-align:center;color:#64748b;font-size:11px;">Status</th>
                <th style="padding:8px;text-align:right;color:#64748b;font-size:11px;">Due</th>
              </tr>
            </thead>
            <tbody>${taskList.map(taskRow).join('')}</tbody>
          </table>`;

        html = `
          <div style="font-family:'Plus Jakarta Sans',sans-serif;background:#0a0a0f;padding:32px;max-width:640px;margin:0 auto;border-radius:12px;">
            <div style="margin-bottom:24px;">
              <h1 style="color:#2dd4bf;font-size:22px;margin:0;">TeamOS</h1>
              <p style="color:#64748b;font-size:13px;margin:4px 0 0;">Daily Task Summary</p>
            </div>
            <p style="color:#e2e8f0;font-size:15px;">Good morning, <strong>${member.name}</strong> 👋</p>
            <p style="color:#94a3b8;font-size:13px;">Here's your task overview for <strong style="color:#e2e8f0;">${todayStr}</strong>.</p>
            ${section('🔴 Overdue', overdue)}
            ${section('📋 Due Today', todayTasks)}
            ${section('📅 Upcoming', upcoming)}
            <p style="color:#334155;font-size:11px;margin-top:32px;border-top:1px solid #1e293b;padding-top:16px;">This is an automated summary from TeamOS.</p>
          </div>`;

      } else {
        const pendingLastWeek = memberTasks.filter(t => t.due_date && t.due_date >= weekAgoStr && t.due_date < todayStr);
        const upcomingWeek = memberTasks.filter(t => t.due_date && t.due_date >= todayStr && t.due_date <= nextWeekStr);

        subject = `📅 Weekly Task Summary — Week of ${todayStr}`;
        html = `<p>Weekly summary for ${member.name}. Pending: ${pendingLastWeek.length}, Upcoming: ${upcomingWeek.length}</p>`;
      }

      try {
        await sendEmail({ to: member.email, subject, html });
        results.push({ member: member.name, email: member.email, sent: true });
      } catch (e) {
        errors.push({ member: member.name, email: member.email, error: e.message });
      }
    }

    return Response.json({ success: true, results, errors, totalMembers: members.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});