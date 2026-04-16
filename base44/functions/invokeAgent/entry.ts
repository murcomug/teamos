import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Convert a Python repr string to a valid JSON string.
 * Handles: None→null, True→true, False→false,
 * single-quoted strings→double-quoted, datetime.datetime(...)→ISO string.
 */
function pythonReprToJson(raw) {
  return raw
    // datetime.datetime(2026, 4, 16, 13, 42, 59, 3000) → "2026-04-16T13:42:59"
    .replace(/datetime\.datetime\((\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)[^)]*\)/g,
      (_, y, mo, d, h, mi, s) =>
        `"${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}T${h.padStart(2,'0')}:${mi.padStart(2,'0')}:${s.padStart(2,'0')}"`)
    // None → null, True → true, False → false  (word boundary so we don't break keys)
    .replace(/\bNone\b/g, 'null')
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    // Replace single-quoted strings with double-quoted strings
    // This handles 'value' → "value" (including escaped \' inside)
    .replace(/'(?:[^'\\]|\\.)*'/g, m => '"' + m.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"') + '"');
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

    // Resolve permission flags from user role and permissions array
    const isAdmin = user.role === 'admin';
    const permissions = user.permissions || [];
    const canViewAllTasks = isAdmin || permissions.includes('view_all_tasks');
    const canViewAllReports = isAdmin || permissions.includes('view_reports');
    const canAccessSalesERP = isAdmin || permissions.includes('access_sales_erp');

    let conversation;

    if (conversation_id) {
      // Load existing conversation
      conversation = await base44.agents.getConversation(conversation_id);
    } else {
      // Start a new conversation
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

    // Send the user message and wait for the agent to finish
    await base44.agents.addMessage(conversation, {
      role: 'user',
      content: user_message,
    });

    // Fetch the full conversation after the agent responds
    const updatedConversation = await base44.agents.getConversation(conversation.id);
    const allMessages = updatedConversation.messages || [];

    // Find messages added after the user's message (assistant + tool turns)
    // We return the full message list so the frontend can render it
    const newConvId = conversation.id;

    // Apply permission scoping to any task tool_results
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

        // Scope Task read results
        const tcName = (tc.name || '').toLowerCase();
        if ((tcName.includes('task') || tcName.includes('_task')) && Array.isArray(results)) {
          if (!canViewAllTasks) {
            results = results.filter(t =>
              t.assignee === user.full_name || t.department === user.department
            );
          }
          return { ...tc, results: JSON.stringify(results) };
        }

        // Block CRM data for non-CRM users
        if (!canAccessSalesERP && (
          tcName.includes('customer') || tcName.includes('salesinteraction')
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