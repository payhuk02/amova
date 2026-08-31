import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const NOTIFICATION_ICONS: Record<string, string> = {
  match: "💘",
  like: "❤️",
  message: "💬",
  call: "📞",
  super_like: "⭐",
};

function getNotificationTitle(type: string, fallback: string): string {
  const prefix = NOTIFICATION_ICONS[type] || "🔔";
  return `${prefix} ${fallback}`;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const permissionRef = useRef<NotificationPermission>("default");

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") {
      permissionRef.current = "granted";
      return true;
    }
    if (Notification.permission === "denied") return false;

    const result = await Notification.requestPermission();
    permissionRef.current = result;
    return result === "granted";
  }, []);

  const showNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (permissionRef.current !== "granted") return;
      if (document.visibilityState === "visible") return; // Don't notify if app is focused

      try {
        const n = new Notification(title, {
          icon: "/placeholder.svg",
          badge: "/placeholder.svg",
          tag: options?.tag || "default",
          ...options,
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
        // Auto-close after 5s
        setTimeout(() => n.close(), 5000);
      } catch {
        // Notification constructor may fail in some contexts
      }
    },
    []
  );

  useEffect(() => {
    if (!user) return;
    requestPermission();
  }, [user, requestPermission]);

  // Listen for new notifications (messages, matches, likes)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("push-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notif = payload.new as {
            type: string;
            title: string;
            body: string | null;
          };
          showNotification(getNotificationTitle(notif.type, notif.title), {
            body: notif.body || undefined,
            tag: `notif-${notif.type}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, showNotification]);

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("push-call-signals")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_signals",
          filter: `callee_id=eq.${user.id}`,
        },
        async (payload) => {
          const signal = payload.new as {
            signal_type: string;
            caller_id: string;
          };
          if (signal.signal_type !== "offer") return;

          // Fetch caller name
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", signal.caller_id)
            .single();

          const name = profile?.display_name || "Quelqu'un";
          showNotification("📞 Appel entrant", {
            body: `${name} vous appelle...`,
            tag: "incoming-call",
            requireInteraction: true,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, showNotification]);

  return { requestPermission };
}
