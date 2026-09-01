import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const NOTIFICATION_ICONS: Record<string, string> = {
  match: "💘",
  like: "❤️",
  message: "💬",
  call: "📞",
  super_like: "⭐",
  event: "📅",
};

const TYPE_TO_PREF: Record<string, keyof NotifPrefs> = {
  match: "matches",
  like: "likes",
  super_like: "likes",
  message: "messages",
  event: "events",
};

interface NotifPrefs {
  matches: boolean;
  messages: boolean;
  likes: boolean;
  events: boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
  matches: true,
  messages: true,
  likes: true,
  events: true,
};

function getNotificationTitle(type: string, fallback: string): string {
  const prefix = NOTIFICATION_ICONS[type] || "🔔";
  return `${prefix} ${fallback}`;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const permissionRef = useRef<NotificationPermission>("default");
  const prefsRef = useRef<NotifPrefs>(DEFAULT_PREFS);

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
      if (document.visibilityState === "visible") return;

      try {
        const n = new Notification(title, {
          icon: "/icon.png",
          badge: "/icon.png",
          tag: options?.tag || "default",
          ...options,
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
        setTimeout(() => n.close(), 5000);
      } catch {
        // Notification constructor may fail in some contexts
      }
    },
    []
  );

  const shouldNotify = useCallback((type: string) => {
    const prefKey = TYPE_TO_PREF[type];
    if (!prefKey) return true;
    return prefsRef.current[prefKey];
  }, []);

  useEffect(() => {
    if (!user) return;
    requestPermission();

    supabase
      .from("profiles")
      .select("notif_matches, notif_messages, notif_likes, notif_events")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          prefsRef.current = {
            matches: data.notif_matches ?? true,
            messages: data.notif_messages ?? true,
            likes: data.notif_likes ?? true,
            events: data.notif_events ?? true,
          };
        }
      });
  }, [user, requestPermission]);

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
          if (!shouldNotify(notif.type)) return;
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
  }, [user, showNotification, shouldNotify]);

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
          if (signal.signal_type !== "offer" && signal.signal_type !== "audio-offer") return;
          if (!prefsRef.current.messages) return;

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
