import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PlanType = "free" | "premium" | "vip";

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
  incognitoMode: boolean;
  priorityMatching: boolean;
  unlimitedSwipes: boolean;
}> = {
  free: {
    superLikesPerDay: 1,
    boostsPerDay: 0,
    canSeeWhoLiked: false,
    incognitoMode: false,
    priorityMatching: false,
    unlimitedSwipes: false,
  },
  premium: {
    superLikesPerDay: 5,
    boostsPerDay: 1,
    canSeeWhoLiked: true,
    incognitoMode: false,
    priorityMatching: false,
    unlimitedSwipes: true,
  },
  vip: {
    superLikesPerDay: -1,
    boostsPerDay: 3,
    canSeeWhoLiked: true,
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

  const currentPlan: PlanType = (subscription?.plan as PlanType) || "free";
  const limits = PLAN_LIMITS[currentPlan];

  const upgrade = (newPlan: PlanType) => {
    if (newPlan === currentPlan || newPlan === "free") return;
    // Payment flow handled on /premium page via PaymentCheckoutDialog
  };

  return {
    subscription,
    currentPlan,
    limits,
    isLoading,
    upgrade,
    isUpgrading: false,
  };
}
