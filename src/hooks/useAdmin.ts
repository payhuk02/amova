import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Client admin check via SECURITY DEFINER RPC `is_user_admin`.
 * Fail closed on any error / unexpected payload.
 */
export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkAdmin() {
      if (!user) {
        if (!cancelled) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) setLoading(true);

      const { data, error } = await supabase.rpc("is_user_admin");

      if (cancelled) return;

      if (error || data !== true) {
        setIsAdmin(false);
      } else {
        setIsAdmin(true);
      }
      setLoading(false);
    }

    void checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { isAdmin, loading };
}
