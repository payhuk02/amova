import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
    superLikesPerDay: -1, // unlimited
    boostsPerDay: 3,
    canSeeWhoLiked: true,
    incognitoMode: true,
    priorityMatching: true,
    unlimitedSwipes: true,
  },
};

export function useSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const upgradeMutation = useMutation({
    mutationFn: async (newPlan: PlanType) => {
      if (!user) throw new Error("Non connecté");

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      // Try upsert
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("subscriptions")
          .update({
            plan: newPlan,
            started_at: new Date().toISOString(),
            expires_at: newPlan === "free" ? null : expiresAt.toISOString(),
            status: "active",
          })
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("subscriptions")
          .insert({
            user_id: user.id,
            plan: newPlan,
            expires_at: newPlan === "free" ? null : expiresAt.toISOString(),
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, newPlan) => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      const names = { free: "Gratuit", premium: "Premium", vip: "VIP" };
      toast.success(`Abonnement ${names[newPlan]} activé !`);
    },
    onError: () => toast.error("Erreur lors de la mise à jour de l'abonnement"),
  });

  return {
    subscription,
    currentPlan,
    limits,
    isLoading,
    upgrade: upgradeMutation.mutate,
    isUpgrading: upgradeMutation.isPending,
  };
}
