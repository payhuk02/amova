import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useNativePush() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return;

    let removeListeners: (() => void) | undefined;

    const setup = async () => {
      const { PushNotifications } = await import("@capacitor/push-notifications");

      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== "granted") return;

      await PushNotifications.register();

      const regListener = await PushNotifications.addListener("registration", async (token) => {
        const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
        await supabase.rpc("register_push_device", {
          p_token: token.value,
          p_platform: platform,
        });
      });

      const errListener = await PushNotifications.addListener("registrationError", (err) => {
        console.warn("Push registration error:", err);
      });

      removeListeners = () => {
        void regListener.remove();
        void errListener.remove();
      };
    };

    void setup();

    return () => {
      removeListeners?.();
    };
  }, [user]);
}
