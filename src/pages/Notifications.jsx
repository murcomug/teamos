import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Bell, AlertTriangle, CheckCircle, Info, AlertCircle } from "lucide-react";
import moment from "moment";

function getNotificationLink(notif) {
  const text = `${notif.title} ${notif.message}`.toLowerCase();
  if (text.includes("support ticket") || text.includes("ticket")) return "/support-tickets";
  if (text.includes("sales follow") || text.includes("sales agent") || text.includes("crm") || text.includes("customer") || text.includes("interaction")) return "/sales-erp";
  if (text.includes("task") || text.includes("follow-up") || text.includes("follow up")) return "/tasks";
  return null;
}

const typeConfig = {
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10" },
  warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
  success: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  error: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10" },
};

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Notification.list("-created_date").then((n) => {
      setNotifications(n);
      setLoading(false);
    });
  }, []);

  const markRead = async (id) => {
    await base44.entities.Notification.update(id, { read: true });
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => base44.entities.Notification.update(n.id, { read: true })));
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map((notif) => {
          const config = typeConfig[notif.type] || typeConfig.info;
          const Icon = config.icon;
          return (
            <button key={notif.id} onClick={async () => { await markRead(notif.id); const link = getNotificationLink(notif); if (link) navigate(link); }}
              className={`w-full text-left glass-card rounded-xl p-4 transition-all duration-200 hover:bg-white/[0.04] ${!notif.read ? "border-l-2 border-l-primary" : "opacity-60"}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 h-8 w-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-4 w-4 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{notif.title}</p>
                    <span className="text-[11px] text-muted-foreground font-mono ml-2 flex-shrink-0">
                      {moment(notif.created_date).fromNow()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                </div>
              </div>
            </button>
          );
        })}
        {notifications.length === 0 && (
          <div className="glass-card rounded-xl p-12 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  );
}