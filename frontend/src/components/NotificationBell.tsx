import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  type NotificationItem,
} from "@/api/notifications";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function formatRelativeTime(dateStr: string): string {
  try {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffSec = Math.floor((now - then) / 1000);

    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

function getCategoryIcon(category: string, type: string) {
  switch (category) {
    case "collaboration":
      return { name: "group", color: "text-blue-500 bg-blue-500/10" };
    case "ai":
      return { name: "auto_awesome", color: "text-purple-500 bg-purple-500/10" };
    case "export":
      return { name: "download", color: "text-emerald-500 bg-emerald-500/10" };
    case "account":
    case "system":
      return { name: "shield", color: "text-amber-500 bg-amber-500/10" };
    case "project":
    default:
      return { name: "folder", color: "text-cyan-500 bg-cyan-500/10" };
  }
}

export function NotificationBell({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Load unread count
  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (e) {
      // Silently ignore auth errors when logged out
    }
  }, []);

  // Load notification list
  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getNotifications({
        limit: 20,
        unread_only: filterUnreadOnly,
      });
      setNotifications(data.items);
      setUnreadCount(data.unread_count);
    } catch (e) {
      console.error("Failed to load notifications", e);
    } finally {
      setIsLoading(false);
    }
  }, [filterUnreadOnly]);

  // Initial count & periodic check
  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  // Fetch items when popover opens or filter changes
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  // Real-time WebSocket connection for notifications
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) return;

    let isMounted = true;
    let reconnectTimeout: any = null;

    const connectWs = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        // In dev, API is typically on port 8000 or proxied
        const wsUrl = `${protocol}//${host}/api/v1/ws/notifications?token=${token}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "new_notification" && data.notification) {
              const newNotif = data.notification as NotificationItem;
              setUnreadCount((prev) => prev + 1);
              setNotifications((prev) => [newNotif, ...prev]);

              // Toast alert
              toast(newNotif.title, {
                description: newNotif.message,
              });
            }
          } catch (err) {
            // ignore invalid JSON
          }
        };

        ws.onclose = () => {
          if (isMounted) {
            reconnectTimeout = setTimeout(connectWs, 5000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        // Fallback gracefully to polling
      }
    };

    connectWs();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      toast.success("All notifications marked as read");
    } catch (e) {
      toast.error("Could not mark all as read");
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      try {
        await markAsRead(notif.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      } catch (e) {
        console.error("Failed to mark notification read", e);
      }
    }

    if (notif.link) {
      setIsOpen(false);
      navigate({ to: notif.link as any }).catch(() => {
        window.location.href = notif.link!;
      });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
          className={cn(
            "relative p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors focus:outline-none",
            className
          )}
        >
          <Icon name="notifications" className="text-[20px]" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-on-primary text-xs font-semibold px-1.5 rounded-full flex items-center justify-center ring-2 ring-surface shadow-sm animate-in fade-in zoom-in"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[360px] sm:w-[400px] p-0 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-level-3 text-on-surface overflow-hidden z-50"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20 bg-surface-container-low/50">
          <div className="flex items-center gap-2">
            <h3 className="text-title-sm font-semibold text-on-surface">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:underline font-medium transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-outline-variant/10 text-label-sm bg-surface-container-lowest">
          <button
            onClick={() => setFilterUnreadOnly(false)}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              !filterUnreadOnly
                ? "bg-surface-container text-on-surface"
                : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilterUnreadOnly(true)}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              filterUnreadOnly
                ? "bg-surface-container text-on-surface"
                : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* List of Notifications */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-outline-variant/10">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-surface-container shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-surface-container rounded w-3/4" />
                    <div className="h-3 bg-surface-container rounded w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant/60 mb-3">
                <Icon name="check_circle" size="lg" />
              </div>
              <p className="text-body-sm font-semibold text-on-surface">You're all caught up</p>
              <p className="text-label-sm text-on-surface-variant mt-1">
                {filterUnreadOnly
                  ? "No unread notifications at the moment."
                  : "No notifications yet."}
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const iconMeta = getCategoryIcon(notif.category, notif.type);
              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={cn(
                    "flex items-start gap-3 p-3.5 transition-colors cursor-pointer group text-left",
                    notif.is_read
                      ? "hover:bg-surface-container-low opacity-80"
                      : "bg-primary/5 hover:bg-primary/10"
                  )}
                >
                  {/* Category Icon */}
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                      iconMeta.color
                    )}
                  >
                    <Icon name={iconMeta.name} size="sm" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "text-ui font-semibold truncate",
                          notif.is_read ? "text-on-surface" : "text-on-surface font-bold"
                        )}
                      >
                        {notif.title}
                      </p>
                      <span className="text-xs text-on-surface-variant/70 shrink-0">
                        {formatRelativeTime(notif.created_at)}
                      </span>
                    </div>

                    <p className="text-sm text-on-surface-variant line-clamp-2 mt-0.5">
                      {notif.message}
                    </p>
                  </div>

                  {/* Unread indicator dot */}
                  {!notif.is_read && (
                    <div
                      className="w-2 h-2 rounded-full bg-primary shrink-0 self-center"
                      title="Unread"
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 border-t border-outline-variant/20 bg-surface-container-low/50 flex items-center justify-between text-xs text-on-surface-variant">
          <button
            onClick={() => {
              setIsOpen(false);
              navigate({ to: "/settings" as any });
            }}
            className="hover:text-primary transition-colors flex items-center gap-1 font-medium px-2 py-1 rounded"
          >
            <Icon name="settings" className="text-[14px]" />
            Settings
          </button>
          <span className="text-xs text-on-surface-variant/60">MindVault Notifications</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
