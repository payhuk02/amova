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

      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("user_id", user.id)
        .single();

      if (!error && data) {
        setIsAdmin(!!data.is_admin);
      }
      setLoading(false);
    }

    checkAdmin();
  }, [user]);

  return { isAdmin, loading };
}
