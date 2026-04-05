import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    // Support both direct payload and automation args wrapper
    const { action, description, entity_type, entity_id } = body.args || body;

    const log = await base44.entities.ActivityLog.create({
      action,
      description,
      entity_type,
      entity_id,
      user_name: user.full_name || user.email,
    });

    return Response.json({ success: true, log });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});