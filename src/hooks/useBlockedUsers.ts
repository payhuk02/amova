import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useBlockedUsers() {
  const { user } = useAuth();
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!user) return;
    const { data } = await supabase.rpc("get_blocked_relationship_ids");
    setBlockedIds(new Set((data as string[] | null) ?? []));
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, [user]);

  const unblock = async (blockedId: string) => {
    if (!user) return;
    await supabase.from("blocked_users").delete().eq("blocker_id", user.id).eq("blocked_id", blockedId);
    setBlockedIds(prev => {
      const next = new Set(prev);
      next.delete(blockedId);
      return next;
    });
  };

  return { blockedIds, loading, reload, unblock };
}
