import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Zap } from "lucide-react";
import { toast } from "sonner";

const BoostButton = () => {
  const { user } = useAuth();
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

    const { error } = await supabase.from("boosts").insert({
      user_id: user.id,
    } as any);

    if (error) {
      toast.error("Erreur lors du boost");
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
      disabled={boosted}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 active:scale-[0.97] ${
        boosted
          ? "bg-amber-500/15 text-amber-500 border border-amber-500/20"
          : "bg-secondary/50 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500 border border-border/30 hover:border-amber-500/30"
      }`}
    >
      <Zap size={14} className={boosted ? "fill-current" : ""} />
      {boosted ? `Boosté (${remaining} min)` : "Booster"}
    </button>
  );
};

export default BoostButton;
