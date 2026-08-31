import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useTrackOnlineStatus() {
  const { user } = useAuth();

  const updateLastSeen = useCallback(async () => {
    if (!user) return;

    // Check if incognito mode is enabled
    const { data: profile } = await supabase
      .from("profiles")
      .select("incognito_mode")
      .eq("user_id", user.id)
      .single();

    if ((profile as any)?.incognito_mode) return;

    await supabase
      .from("profiles")
      .update({ last_seen: new Date().toISOString() } as any)
      .eq("user_id", user.id);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 60000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") updateLastSeen();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user, updateLastSeen]);
}

export function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff < 5 * 60 * 1000;
}

export function formatLastSeen(lastSeen: string | null): string {
  if (!lastSeen) return "Hors ligne";
  const diff = Date.now() - new Date(lastSeen).getTime();
  if (diff < 5 * 60 * 1000) return "En ligne";
  if (diff < 60 * 60 * 1000) return `Vu il y a ${Math.floor(diff / 60000)} min`;
  if (diff < 24 * 60 * 60 * 1000) return `Vu il y a ${Math.floor(diff / 3600000)}h`;
  return `Vu il y a ${Math.floor(diff / 86400000)}j`;
}
