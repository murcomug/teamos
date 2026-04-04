import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { summaryType } = body; // 'daily' or 'weekly'

    const [tasks, members] = await Promise.all([
      base44.entities.Task.list(),
      base44.entities.TeamMember.list()
    ]);

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const todayStr = today.toISOString().split('T')[0];
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    const results = [];

    for (const member of members) {
      if (!member.whatsapp || !member.email) continue;

      const memberTasks = tasks.filter(t => t.assignee === member.name);
      
      let summary = '';
      let subject = '';

      if (summaryType === 'daily') {
        const todayTasks = memberTasks.filter(t => t.due_date === todayStr && t.status !== 'completed');
        summary = `Good morning ${member.name}!\n\n📋 *Today's Tasks (${todayTasks.length})*\n`;
        todayTasks.forEach(t => {
          summary += `\n• ${t.title} [${t.priority}]\n   Status: ${t.status}`;
        });
        subject = `Your Tasks for Today - ${todayStr}`;
      } else if (summaryType === 'weekly') {
        const pendingLastWeek = memberTasks.filter(t => {
          const due = t.due_date;
          return due >= weekAgoStr && due < todayStr && (t.status === 'pending' || t.status === 'ongoing');
        });
        const upcomingWeek = memberTasks.filter(t => {
          const due = t.due_date;
          return due >= todayStr && due <= nextWeekStr && t.status !== 'completed';
        });

        summary = `Weekly Summary for ${member.name}\n\n`;
        
        if (pendingLastWeek.length > 0) {
          summary += `⚠️ *Pending from Last Week (${pendingLastWeek.length})*\n`;
          pendingLastWeek.forEach(t => {
            summary += `\n• ${t.title} [${t.priority}]\n   Due: ${t.due_date} | Status: ${t.status}`;
          });
          summary += '\n\n';
        }

        summary += `📅 *Upcoming This Week (${upcomingWeek.length})*\n`;
        upcomingWeek.forEach(t => {
          summary += `\n• ${t.title} [${t.priority}]\n   Due: ${t.due_date}`;
        });
        
        subject = `Weekly Task Summary - Week of ${todayStr}`;
      }

      if (!summary.trim()) continue;

      // Send email
      await base44.integrations.Core.SendEmail({
        to: member.email,
        subject,
        body: summary.replace(/\n/g, '<br>')
      });

      results.push({
        member: member.name,
        email: member.email,
        whatsapp: member.whatsapp,
        sent: true
      });
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});