import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("is_user_admin");

      if (!error && typeof data === "boolean") {
        setIsAdmin(data);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    }

    checkAdmin();
  }, [user]);

  return { isAdmin, loading };
}
