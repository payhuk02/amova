import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Badge {
  badge_type: string;
  earned_at: string;
}

export const BADGE_CONFIG: Record<string, { label: string; emoji: string; description: string }> = {
  profile_complete: { label: "Profil complet", emoji: "✨", description: "Tous les champs du profil sont remplis" },
  verified: { label: "Vérifié", emoji: "✅", description: "Identité vérifiée" },
  first_match: { label: "Premier match", emoji: "💕", description: "Obtenu son premier match" },
  popular: { label: "Populaire", emoji: "🔥", description: "Reçu 10+ likes" },
  social: { label: "Social", emoji: "💬", description: "Envoyé 50+ messages" },
  explorer: { label: "Explorateur", emoji: "🧭", description: "Participé à un événement" },
  loyal: { label: "Fidèle", emoji: "👑", description: "Membre depuis 30+ jours" },
  storyteller: { label: "Conteur", emoji: "📸", description: "Publié 5+ stories" },
};

export function useBadges(userId?: string) {
  const { user } = useAuth();
  const targetId = userId || user?.id;
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetId) return;

    const load = async () => {
      const { data } = await supabase
        .from("badges")
        .select("badge_type, earned_at")
        .eq("user_id", targetId);
      setBadges((data as Badge[]) || []);
      setLoading(false);
    };

    load();
  }, [targetId]);

  return { badges, loading };
}

export function useCheckAndAwardBadges() {
  const { user } = useAuth();

  const checkBadges = async () => {
    if (!user) return;
    await supabase.rpc("check_and_award_badges");
  };

  return { checkBadges };
}
