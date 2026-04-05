import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const entity_id = payload.event?.entity_id || payload.entity_id;
    const data = payload.data || payload;

    // Only act when stage becomes closed-won
    if (data?.sales_stage !== "closed-won") {
      return Response.json({ skipped: true });
    }

    // Transition to onboarding
    await base44.asServiceRole.entities.CustomerProfile.update(entity_id, {
      sales_stage: "onboarding"
    });

    // Create a notification for the team
    await base44.asServiceRole.entities.Notification.create({
      title: "Customer moved to After-Sales",
      message: `${data.name || "A customer"} has been won and moved to Onboarding.`,
      type: "success",
    });

    return Response.json({ success: true, customer_id: entity_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});