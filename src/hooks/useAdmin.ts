import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Client admin check via SECURITY DEFINER RPC `is_user_admin`.
 * Fail closed: only exact boolean true grants admin UI.
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

      try {
        const { data, error } = await supabase.rpc("is_user_admin");
        if (cancelled) return;
        // Strict equality — never treat truthy strings / null as admin
        setIsAdmin(!error && data === true);
      } catch {
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { isAdmin, loading };
}
