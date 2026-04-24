import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function pythonReprToJson(raw) {
  return raw
    .replace(/datetime\.datetime\((\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)[^)]*\)/g,
      (_, y, mo, d, h, mi, s) =>
        `"${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}T${h.padStart(2,'0')}:${mi.padStart(2,'0')}:${s.padStart(2,'0')}"`)
    .replace(/\bNone\b/g, 'null')
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    .replace(/'(?:[^'\\]|\\.)*'/g, m => '"' + m.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"') + '"');
}

function formatDate(iso) {
  return iso ? iso.slice(0, 10) : '—';
}

function buildContextBlock(user, myOpenTasks, myOverdueTasks, openTickets, teamMembers, departments, recentActivity) {
  const today = new Date().toISOString().slice(0, 10);
  let ctx = `LIVE CONTEXT — LOADED AT SESSION START\nToday's date: ${today}\n\n`;

  ctx += `CURRENT USER\n`;
  ctx += `Name: ${user.full_name || '—'}\nRole: ${user.role || '—'}\nDepartment: ${user.department || '—'}\nEmail: ${user.email || '—'}\n\n`;

  ctx += `MY OPEN TASKS (${myOpenTasks.length} open)\n`;
  if (myOpenTasks.length === 0) {
    ctx += `You have no open tasks assigned to you.\n`;
  } else {
    myOpenTasks.forEach(t => {
      ctx += `- ${t.title} | ${t.priority} priority | Due: ${formatDate(t.due_date)} | Status: ${t.status} | Dept: ${t.department || '—'}\n`;
    });
  }
  ctx += '\n';

  ctx += `MY OVERDUE TASKS (${myOverdueTasks.length} overdue)\n`;
  if (myOverdueTasks.length === 0) {
    ctx += `No overdue tasks.\n`;
  } else {
    myOverdueTasks.forEach(t => {
      ctx += `- ${t.title} | Due: ${formatDate(t.due_date)} | Status: ${t.status} | Dept: ${t.department || '—'}\n`;
    });
  }
  ctx += '\n';

  ctx += `OPEN SUPPORT TICKETS (${openTickets.length} open)\n`;
  if (openTickets.length === 0) {
    ctx += `No open support tickets.\n`;
  } else {
    openTickets.forEach(t => {
      ctx += `- ${t.title} | ${t.priority} priority | Assigned: ${t.assignee || '—'} | Due: ${formatDate(t.due_date)}\n`;
    });
  }
  ctx += '\n';

  ctx += `TEAM MEMBERS (${teamMembers.length} active)\n`;
  teamMembers.forEach(m => {
    ctx += `- ${m.name} | ${m.role} | ${m.department || '—'}\n`;
  });
  ctx += '\n';

  ctx += `DEPARTMENTS\n`;
  departments.forEach(d => {
    ctx += `- ${d.name}${d.head ? ` — Head: ${d.head}` : ''}\n`;
  });
  ctx += '\n';

  ctx += `RECENT ACTIVITY — LAST 48 HOURS\n`;
  if (recentActivity.length === 0) {
    ctx += `No activity in the last 48 hours.\n`;
  } else {
    recentActivity.forEach(a => {
      ctx += `- ${formatDate(a.created_date)} | ${a.description} (by ${a.user_name || '—'})\n`;
    });
  }

  return ctx;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { user_message, conversation_id } = body;

    if (!user_message?.trim()) {
      return Response.json({ error: 'user_message is required' }, { status: 400 });
    }

    const isAdmin = user.role === 'admin';
    const permissions = user.permissions || [];
    const canViewAllTasks = isAdmin || permissions.includes('view_all_tasks');
    const canViewAllReports = isAdmin || permissions.includes('view_reports');
    const canAccessSalesERP = isAdmin || permissions.includes('access_sales_erp');

    let conversation;
    let messageContent = user_message;

    if (conversation_id) {
      // Existing conversation — just pass the message through
      conversation = await base44.agents.getConversation(conversation_id);
    } else {
      // New conversation — fetch live context in parallel, then inject it
      const userName = user.full_name || '';
      const today = new Date().toISOString().slice(0, 10);
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

      const [myOpenTasks, myOverdueTasks, openTickets, teamMembers, departments, recentActivity] = await Promise.all([
        base44.asServiceRole.entities.Task.filter(
          { assignee: userName, status: { $in: ['pending', 'ongoing', 'stopped'] }, is_support_ticket: false },
          'due_date', 10
        ).catch(() => []),
        base44.asServiceRole.entities.Task.filter(
          { assignee: userName, due_date: { $lt: today }, status: { $nin: ['completed'] } },
          'due_date', 5
        ).catch(() => []),
        base44.asServiceRole.entities.Task.filter(
          { is_support_ticket: true, status: { $in: ['pending', 'ongoing', 'stopped'] } },
          '-created_date', 10
        ).catch(() => []),
        base44.asServiceRole.entities.TeamMember.filter({ status: 'active' }, 'name', 50).catch(() => []),
        base44.asServiceRole.entities.Department.list('name', 20).catch(() => []),
        base44.asServiceRole.entities.ActivityLog.filter(
          { created_date: { $gte: cutoff } },
          '-created_date', 20
        ).catch(() => []),
      ]);

      const contextBlock = buildContextBlock(user, myOpenTasks, myOverdueTasks, openTickets, teamMembers, departments, recentActivity);

      // Prepend context to the first user message
      messageContent = `[LIVE CONTEXT — use this for the session, do not repeat it back]\n\n${contextBlock}\n[END CONTEXT]\n\nUser message: ${user_message}`;

      conversation = await base44.agents.createConversation({
        agent_name: 'master_agent',
        metadata: {
          user_id: user.id,
          user_name: user.full_name,
          user_role: user.role,
          user_department: user.department || '',
          can_view_all_tasks: canViewAllTasks,
          can_view_all_reports: canViewAllReports,
          can_access_sales_erp: canAccessSalesERP,
        }
      });
    }

    await base44.agents.addMessage(conversation, {
      role: 'user',
      content: messageContent,
    });

    const updatedConversation = await base44.agents.getConversation(conversation.id);
    const allMessages = updatedConversation.messages || [];
    const newConvId = conversation.id;

    // Apply permission scoping to task/CRM tool results
    const scopedMessages = allMessages.map(msg => {
      if (!msg.tool_calls || msg.tool_calls.length === 0) return msg;

      const scopedToolCalls = msg.tool_calls.map(tc => {
        if (!tc.results) return tc;

        let results;
        try {
          const raw = typeof tc.results === 'string' ? pythonReprToJson(tc.results) : JSON.stringify(tc.results);
          results = JSON.parse(raw);
        } catch {
          return tc;
        }

        const tcName = (tc.name || '').toLowerCase();
        if ((tcName.includes('task') || tcName.includes('_task')) && Array.isArray(results)) {
          if (!canViewAllTasks) {
            results = results.filter(t =>
              t.assignee === user.full_name || t.department === user.department
            );
          }
          return { ...tc, results: JSON.stringify(results) };
        }

        if (!canAccessSalesERP && (
          tcName.includes('customer') || tcName.includes('salesinteraction') || tcName.includes('customerprofile')
        )) {
          return { ...tc, results: JSON.stringify([]) };
        }

        return tc;
      });

      return { ...msg, tool_calls: scopedToolCalls };
    });

    return Response.json({
      conversation_id: newConvId,
      messages: scopedMessages,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});