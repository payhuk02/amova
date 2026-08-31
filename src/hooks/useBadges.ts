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

    // Check profile_complete
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profile?.display_name && profile?.bio && profile?.age && profile?.city && profile?.avatar_url) {
      await supabase.from("badges").upsert(
        { user_id: user.id, badge_type: "profile_complete" } as any,
        { onConflict: "user_id,badge_type" }
      );
    }

    // Check verified
    if (profile?.is_verified) {
      await supabase.from("badges").upsert(
        { user_id: user.id, badge_type: "verified" } as any,
        { onConflict: "user_id,badge_type" }
      );
    }

    // Check first_match
    const { data: myLikes } = await supabase
      .from("likes")
      .select("to_user_id")
      .eq("from_user_id", user.id);
    
    if (myLikes && myLikes.length > 0) {
      const { data: mutuals } = await supabase
        .from("likes")
        .select("from_user_id")
        .eq("to_user_id", user.id)
        .in("from_user_id", myLikes.map(l => l.to_user_id));
      
      if (mutuals && mutuals.length > 0) {
        await supabase.from("badges").upsert(
          { user_id: user.id, badge_type: "first_match" } as any,
          { onConflict: "user_id,badge_type" }
        );
      }
    }

    // Check popular (10+ likes received)
    const { count: likesReceived } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("to_user_id", user.id);
    
    if ((likesReceived || 0) >= 10) {
      await supabase.from("badges").upsert(
        { user_id: user.id, badge_type: "popular" } as any,
        { onConflict: "user_id,badge_type" }
      );
    }

    // Check social (50+ messages sent)
    const { count: msgCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("sender_id", user.id);
    
    if ((msgCount || 0) >= 50) {
      await supabase.from("badges").upsert(
        { user_id: user.id, badge_type: "social" } as any,
        { onConflict: "user_id,badge_type" }
      );
    }

    // Check explorer (attended an event)
    const { count: eventCount } = await supabase
      .from("event_attendees")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    
    if ((eventCount || 0) >= 1) {
      await supabase.from("badges").upsert(
        { user_id: user.id, badge_type: "explorer" } as any,
        { onConflict: "user_id,badge_type" }
      );
    }

    // Check storyteller (5+ stories)
    const { count: storyCount } = await supabase
      .from("stories")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    
    if ((storyCount || 0) >= 5) {
      await supabase.from("badges").upsert(
        { user_id: user.id, badge_type: "storyteller" } as any,
        { onConflict: "user_id,badge_type" }
      );
    }

    // Check loyal (30+ days)
    if (profile?.created_at) {
      const daysSince = (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince >= 30) {
        await supabase.from("badges").upsert(
          { user_id: user.id, badge_type: "loyal" } as any,
          { onConflict: "user_id,badge_type" }
        );
      }
    }
  };

  return { checkBadges };
}
