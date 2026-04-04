import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all tasks and members
    const [tasks, members] = await Promise.all([
      base44.asServiceRole.entities.Task.list(),
      base44.asServiceRole.entities.TeamMember.list(),
    ]);

    const now = new Date();
    const overdueTasks = (tasks || []).filter(task => {
      const dueDate = task.due_date ? new Date(task.due_date) : null;
      return dueDate && dueDate < now && task.status !== "completed";
    });

    // Create notifications for each overdue task and its assignee
    for (const task of overdueTasks) {
      const assignee = members.find(m => m.name === task.assignee);
      if (assignee?.email) {
        // Check if notification already exists for this task
        const existingNotifications = await base44.asServiceRole.entities.Notification.filter({
          target_user: assignee.email,
          title: `Overdue: ${task.title}`,
        });

        if (!existingNotifications || existingNotifications.length === 0) {
          await base44.asServiceRole.entities.Notification.create({
            title: `Overdue: ${task.title}`,
            message: `Task "${task.title}" is overdue since ${task.due_date}. Please address it urgently.`,
            type: "error",
            target_user: assignee.email,
            read: false,
          });
        }
      }
    }

    return Response.json({
      success: true,
      overdueTasks: overdueTasks.length,
      notificationsCreated: overdueTasks.length,
    });
  } catch (error) {
    console.error("Error checking overdue tasks:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});