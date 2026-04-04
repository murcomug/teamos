import moment from "moment";
import { CheckCircle, Plus, MessageSquare, RefreshCw, UserPlus } from "lucide-react";

const actionIcons = {
  task_created: Plus,
  task_completed: CheckCircle,
  comment_added: MessageSquare,
  status_changed: RefreshCw,
  member_added: UserPlus,
};

const actionColors = {
  task_created: "text-primary",
  task_completed: "text-emerald-400",
  comment_added: "text-blue-400",
  status_changed: "text-amber-400",
  member_added: "text-violet-400",
};

export default function RecentActivity({ activities }) {
  return (
    <div className="glass-card rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Recent Activity</h3>
      <div className="space-y-1">
        {activities.map((activity) => {
          const Icon = actionIcons[activity.action] || Plus;
          const color = actionColors[activity.action] || "text-muted-foreground";
          return (
            <div key={activity.id} className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-white/[0.02] transition-colors">
              <div className={`mt-0.5 h-7 w-7 rounded-full bg-white/[0.04] flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-3.5 w-3.5 ${color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground/90 truncate">{activity.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activity.user_name} · {moment(activity.created_date).fromNow()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}