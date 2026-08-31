import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { getLimitErrorMessage } from "@/lib/limits";
import { Zap, Crown } from "lucide-react";
import { toast } from "sonner";

const BoostButton = () => {
  const { user } = useAuth();
  const { limits } = useSubscription();
  const [boosted, setBoosted] = useState(false);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data } = await supabase
        .from("boosts")
        .select("*")
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setBoosted(true);
        const ms = new Date(data[0].expires_at).getTime() - Date.now();
        setRemaining(Math.ceil(ms / 60000));
      }
    };
    check();
  }, [user]);

  const handleBoost = async () => {
    if (!user || boosted) return;

    if (limits.boostsPerDay === 0) {
      toast.error("Les boosts sont réservés aux abonnés Premium et VIP.");
      return;
    }

    const { error } = await supabase.from("boosts").insert({
      user_id: user.id,
    } as any);

    if (error) {
      const limitMsg = getLimitErrorMessage(error);
      toast.error(limitMsg || "Erreur lors du boost");
      return;
    }

    setBoosted(true);
    setRemaining(30);
    toast.success("Profil boosté pendant 30 minutes ! ⚡");

    // Auto reset after 30 min
    setTimeout(() => {
      setBoosted(false);
      setRemaining(0);
    }, 30 * 60 * 1000);
  };

  return (
    <button
      onClick={handleBoost}
      disabled={boosted || limits.boostsPerDay === 0}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 active:scale-[0.97] ${
        boosted
          ? "bg-amber-500/15 text-amber-500 border border-amber-500/20"
          : limits.boostsPerDay === 0
            ? "bg-secondary/30 text-muted-foreground/50 border border-border/20 cursor-not-allowed"
            : "bg-secondary/50 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500 border border-border/30 hover:border-amber-500/30"
      }`}
    >
      {limits.boostsPerDay === 0 ? <Crown size={14} /> : <Zap size={14} className={boosted ? "fill-current" : ""} />}
      {boosted ? `Boosté (${remaining} min)` : limits.boostsPerDay === 0 ? "Premium" : "Booster"}
    </button>
  );
};

export default BoostButton;
