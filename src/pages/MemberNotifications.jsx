import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMemberSession } from "@/lib/MemberSessionContext";
import { Bell, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import moment from "moment";
import { Button } from "@/components/ui/button";

const typeConfig = {
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-400/10" },
  warning: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  success: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  error: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-400/10" },
};

export default function MemberNotifications() {
  const { memberSession } = useMemberSession();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!memberSession) return;

    const loadData = async () => {
      try {
        const notifs = await base44.entities.Notification.filter({
          target_user: memberSession.email,
        });
        setNotifications(notifs || []);
      } catch (err) {
        console.error("Error loading notifications:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === "create" && event.data?.target_user === memberSession.email) {
        setNotifications(prev => [event.data, ...prev]);
      } else if (event.type === "update") {
        setNotifications(prev =>
          prev.map(n => n.id === event.id ? event.data : n)
        );
      } else if (event.type === "delete") {
        setNotifications(prev => prev.filter(n => n.id !== event.id));
      }
    });

    return unsubscribe;
  }, [memberSession]);

  const handleMarkAsRead = async (id) => {
    try {
      await base44.entities.Notification.update(id, { read: true });
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllAsRead} variant="outline">
            Mark all as read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(notif => {
            const config = typeConfig[notif.type] || typeConfig.info;
            const Icon = config.icon;
            return (
              <div
                key={notif.id}
                className={`glass-card glass-card-hover rounded-xl p-4 transition-all cursor-pointer ${
                  !notif.read ? "border-primary/30 bg-primary/5" : ""
                }`}
                onClick={() => !notif.read && handleMarkAsRead(notif.id)}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${config.bg} flex-shrink-0`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{notif.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{notif.message}</p>
                    <span className="text-[11px] font-mono text-muted-foreground mt-2 block">
                      {moment(notif.created_date).fromNow()}
                    </span>
                  </div>
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}