import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { registerServiceWorker } from "@/lib/register-sw";
import { arrayBufferToBase64, urlBase64ToUint8Array } from "@/lib/web-push-utils";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function useWebPush() {
  const { user } = useAuth();

  const subscribe = useCallback(async () => {
    if (!user || !VAPID_PUBLIC_KEY) return false;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return false;

      const registration = await registerServiceWorker();
      if (!registration) return false;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const p256dh = arrayBufferToBase64(subscription.getKey("p256dh"));
      const auth = arrayBufferToBase64(subscription.getKey("auth"));

      const { error } = await supabase.rpc("register_push_device", {
        p_token: subscription.endpoint,
        p_platform: "web",
        p_endpoint: subscription.endpoint,
        p_p256dh: p256dh,
        p_auth_key: auth,
      });

      return !error;
    } catch (error) {
      console.warn("Web push subscription failed:", error);
      return false;
    }
  }, [user]);

  useEffect(() => {
    if (!user || !VAPID_PUBLIC_KEY) return;
    void subscribe();
  }, [user, subscribe]);

  return { subscribe, isSupported: Boolean(VAPID_PUBLIC_KEY) };
}
