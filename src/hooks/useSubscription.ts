import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PlanType = "free" | "plus" | "premium" | "vip";

interface Subscription {
  id: string;
  user_id: string;
  plan: PlanType;
  started_at: string;
  expires_at: string | null;
  status: string;
}

const PLAN_LIMITS: Record<PlanType, {
  superLikesPerDay: number;
  boostsPerDay: number;
  canSeeWhoLiked: boolean;
  canViewFullGallery: boolean;
  dailyMessageLimit: number;
  incognitoMode: boolean;
  priorityMatching: boolean;
  unlimitedSwipes: boolean;
}> = {
  free: {
    superLikesPerDay: 1,
    boostsPerDay: 0,
    canSeeWhoLiked: false,
    canViewFullGallery: false,
    dailyMessageLimit: 15,
    incognitoMode: false,
    priorityMatching: false,
    unlimitedSwipes: false,
  },
  plus: {
    superLikesPerDay: 2,
    boostsPerDay: 0,
    canSeeWhoLiked: true,
    canViewFullGallery: true,
    dailyMessageLimit: -1,
    incognitoMode: false,
    priorityMatching: false,
    unlimitedSwipes: false, // 100/day server-side
  },
  premium: {
    superLikesPerDay: 5,
    boostsPerDay: 1,
    canSeeWhoLiked: true,
    canViewFullGallery: true,
    dailyMessageLimit: -1,
    incognitoMode: false,
    priorityMatching: false,
    unlimitedSwipes: true,
  },
  vip: {
    superLikesPerDay: -1,
    boostsPerDay: 3,
    canSeeWhoLiked: true,
    canViewFullGallery: true,
    dailyMessageLimit: -1,
    incognitoMode: true,
    priorityMatching: true,
    unlimitedSwipes: true,
  },
};

export function useSubscription() {
  const { user } = useAuth();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;
      return data as Subscription | null;
    },
    enabled: !!user,
  });

  const { data: revealUntil } = useQuery({
    queryKey: ["entitlement", "likes_reveal_24h", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("user_entitlements")
        .select("expires_at")
        .eq("user_id", user.id)
        .eq("sku", "likes_reveal_24h")
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.expires_at ?? null;
    },
    enabled: !!user,
  });

  const effectivePlan: PlanType = (() => {
    if (!subscription || subscription.status !== "active") return "free";
    if (
      subscription.plan !== "free" &&
      subscription.expires_at &&
      new Date(subscription.expires_at) < new Date()
    ) {
      return "free";
    }
    return subscription.plan as PlanType;
  })();

  const currentPlan: PlanType = effectivePlan;
  const limits = PLAN_LIMITS[currentPlan];
  const hasLikesRevealPass = Boolean(revealUntil && new Date(revealUntil) > new Date());
  const canSeeWhoLiked = limits.canSeeWhoLiked || hasLikesRevealPass;
  const isExpired =
    subscription?.plan !== "free" &&
    subscription?.expires_at != null &&
    new Date(subscription.expires_at) < new Date();

  const upgrade = (newPlan: PlanType) => {
    if (newPlan === currentPlan || newPlan === "free") return;
  };

  return {
    subscription,
    currentPlan,
    limits: { ...limits, canSeeWhoLiked },
    hasLikesRevealPass,
    likesRevealExpiresAt: revealUntil,
    isLoading,
    isExpired,
    upgrade,
    isUpgrading: false,
  };
}
