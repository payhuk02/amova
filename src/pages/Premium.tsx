import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, Crown, Sparkles, Zap, Shield, Eye, Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription, PlanType } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PaymentCheckoutDialog from "@/components/PaymentCheckoutDialog";
import PaymentReassurance from "@/components/PaymentReassurance";
import AppShell from "@/components/AppShell";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getLimitErrorMessage } from "@/lib/limits";
import {
  CONSUMABLE_PRICES,
  BILLING_PERIODS,
  PAID_TRIAL,
  getSubscriptionAmount,
  formatFcfa,
  type ConsumableSku,
  type BillingPeriod,
} from "@/lib/plans";

const comparisonRows = [
  { label: "Super Likes / jour", free: "1", plus: "2", premium: "5", vip: "Illimités" },
  { label: "Swipes", free: "50 / jour", plus: "100 / jour", premium: "Illimités", vip: "Illimités" },
  { label: "Messages / jour", free: "15", plus: "Illimités", premium: "Illimités", vip: "Illimités" },
  { label: "Galerie photos HD", free: false, plus: true, premium: true, vip: true },
  { label: "Voir qui vous aime", free: false, plus: true, premium: true, vip: true },
  { label: "Filtres avancés", free: false, plus: true, premium: true, vip: true },
  { label: "Boosts / jour", free: "—", plus: "—", premium: "1", vip: "3" },
  { label: "Spotlight gratuit / sem.", free: false, plus: false, premium: false, vip: true },
  { label: "Mode incognito", free: false, plus: false, premium: false, vip: true },
  { label: "Matching prioritaire", free: false, plus: false, premium: false, vip: true },
  { label: "Support prioritaire", free: false, plus: false, premium: false, vip: true },
] as const;

function CellValue({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check size={16} className="text-success mx-auto" />
    ) : (
      <X size={14} className="text-muted-foreground/40 mx-auto" />
    );
  }
  return <span className="text-sm text-foreground">{value}</span>;
}

export default function Premium() {
  const { user } = useAuth();
  const { currentPlan, isExpired, subscription } = useSubscription();
  const [searchParams] = useSearchParams();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [checkoutPlan, setCheckoutPlan] = useState<Exclude<PlanType, "free"> | null>(null);
  const [checkoutSku, setCheckoutSku] = useState<ConsumableSku | null>(null);
  const [isRenewalCheckout, setIsRenewalCheckout] = useState(false);
  const [isTrialCheckout, setIsTrialCheckout] = useState(false);

  const { data: canStartTrial } = useQuery({
    queryKey: ["paid-trial-eligible", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("user_can_start_paid_trial");
      if (error) throw error;
      return Boolean(data);
    },
    enabled: !!user && currentPlan === "free" && !isExpired,
  });

  const { data: vipSpotlightAvailable, refetch: refetchVipSpotlight } = useQuery({
    queryKey: ["vip-weekly-spotlight", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_entitlements")
        .select("id")
        .eq("user_id", user.id)
        .eq("sku", "vip_weekly_spotlight")
        .gt("expires_at", new Date().toISOString())
        .limit(1)
        .maybeSingle();
      return !data;
    },
    enabled: !!user && currentPlan === "vip",
  });

  const [claimingSpotlight, setClaimingSpotlight] = useState(false);

  const claimVipSpotlight = async () => {
    setClaimingSpotlight(true);
    try {
      const { error } = await supabase.rpc("claim_vip_weekly_spotlight");
      if (error) {
        toast.error(getLimitErrorMessage(error) || error.message);
        return;
      }
      toast.success("Spotlight VIP activé pour 24 h");
      void refetchVipSpotlight();
    } finally {
      setClaimingSpotlight(false);
    }
  };

  const periodMeta = BILLING_PERIODS[billingPeriod];
  const priceSuffix =
    billingPeriod === "monthly" ? "/mois" : billingPeriod === "quarterly" ? "/3 mois" : "/an";

  const plans = [
    {
      id: "free" as PlanType,
      name: "Gratuit",
      price: "0 FCFA",
      period: "",
      icon: Heart,
      description: "Découvrir la plateforme",
      savings: null as string | null,
    },
    {
      id: "plus" as PlanType,
      name: "Plus",
      price: formatFcfa(getSubscriptionAmount("plus", billingPeriod)),
      period: priceSuffix,
      icon: Zap,
      description: "Photos, likes & messages",
      savings: periodMeta.discount > 0 ? `−${Math.round(periodMeta.discount * 100)} %` : null,
    },
    {
      id: "premium" as PlanType,
      name: "Premium",
      price: formatFcfa(getSubscriptionAmount("premium", billingPeriod)),
      period: priceSuffix,
      icon: Sparkles,
      description: "L'expérience complète",
      popular: true,
      savings: periodMeta.discount > 0 ? `−${Math.round(periodMeta.discount * 100)} %` : null,
    },
    {
      id: "vip" as PlanType,
      name: "VIP",
      price: formatFcfa(getSubscriptionAmount("vip", billingPeriod)),
      period: priceSuffix,
      icon: Crown,
      description: "Visibilité maximale",
      savings: periodMeta.discount > 0 ? `−${Math.round(periodMeta.discount * 100)} %` : null,
    },
  ];

  useEffect(() => {
    if (searchParams.get("renew") !== "1") return;

    const renewPlan: Exclude<PlanType, "free"> =
      currentPlan !== "free"
        ? currentPlan
        : isExpired && subscription?.plan && subscription.plan !== "free"
          ? (subscription.plan as Exclude<PlanType, "free">)
          : "premium";

    setCheckoutPlan(renewPlan);
    setIsRenewalCheckout(true);
  }, [searchParams, currentPlan, isExpired, subscription?.plan]);

  const handleSelectPlan = (planId: PlanType) => {
    if (planId === "free" || planId === currentPlan) return;
    setCheckoutSku(null);
    setIsTrialCheckout(false);
    setIsRenewalCheckout(false);
    setCheckoutPlan(planId);
  };

  const openRenewal = () => {
    const renewPlan: Exclude<PlanType, "free"> =
      currentPlan !== "free"
        ? currentPlan
        : isExpired && subscription?.plan && subscription.plan !== "free"
          ? (subscription.plan as Exclude<PlanType, "free">)
          : "premium";
    setCheckoutSku(null);
    setIsTrialCheckout(false);
    setIsRenewalCheckout(true);
    setCheckoutPlan(renewPlan);
  };

  const openTrial = () => {
    setCheckoutPlan(null);
    setCheckoutSku(null);
    setIsRenewalCheckout(false);
    setIsTrialCheckout(true);
  };

  return (
    <AppShell>
      <div className="container max-w-5xl py-6 px-4 pb-8">
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-champagne/10 text-champagne text-sm font-medium mb-4 border border-champagne/20">
            <Crown size={16} />
            Abonnements Amova
          </div>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-light mb-2">
            Investissez dans vos <span className="text-gradient-copper italic">rencontres</span>
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm sm:text-base">
            Des formules transparentes, sans engagement caché. Choisissez le plan adapté à vos ambitions.
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-full border border-border/40 bg-secondary/30 p-1 gap-0.5">
            {(Object.keys(BILLING_PERIODS) as BillingPeriod[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setBillingPeriod(key)}
                className={cn(
                  "px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors",
                  billingPeriod === key
                    ? "bg-champagne text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {BILLING_PERIODS[key].label}
                {BILLING_PERIODS[key].discount > 0 && (
                  <span className="ml-1 opacity-80">
                    −{Math.round(BILLING_PERIODS[key].discount * 100)}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {(currentPlan !== "free" || isExpired) && (
          <div className="mb-6 flex justify-center">
            <Button variant="outline" size="sm" onClick={openRenewal} className="border-champagne/30">
              {isExpired && currentPlan === "free"
                ? "Renouveler mon abonnement"
                : `Renouveler mon abonnement ${currentPlan.toUpperCase()}`}
            </Button>
          </div>
        )}

        {canStartTrial && (
          <div className="mb-8 glass-card rounded-2xl p-5 sm:p-6 border border-champagne/25 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div>
              <p className="font-display text-lg font-medium">{PAID_TRIAL.label}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Testez Premium une seule fois — swipes illimités, likes visibles, boost inclus.
              </p>
            </div>
            <Button variant="default" onClick={openTrial} className="shrink-0">
              Essayer — {formatFcfa(PAID_TRIAL.price)}
            </Button>
          </div>
        )}

        {currentPlan === "vip" && (
          <div className="mb-8 glass-card rounded-2xl p-5 sm:p-6 border border-champagne/25 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div>
              <p className="font-display text-lg font-medium">Avantages VIP</p>
              <p className="text-sm text-muted-foreground mt-1">
                Matching prioritaire actif. Spotlight gratuit 1×/semaine
                {vipSpotlightAvailable ? " disponible." : " déjà utilisé cette semaine."}
              </p>
              <a
                href="mailto:contact@amova.space?subject=Support%20VIP%20Amova"
                className="text-xs text-champagne hover:underline mt-2 inline-block"
              >
                Contacter le support prioritaire
              </a>
            </div>
            {vipSpotlightAvailable && (
              <Button
                variant="default"
                onClick={() => void claimVipSpotlight()}
                disabled={claimingSpotlight}
                className="shrink-0"
              >
                {claimingSpotlight ? "Activation…" : "Activer Spotlight gratuit"}
              </Button>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const Icon = plan.icon;

            return (
              <div
                key={plan.id}
                className={cn(
                  "glass-card rounded-2xl p-5 sm:p-6 flex flex-col relative",
                  plan.popular && "border-champagne/30 shadow-premium",
                  isCurrent && "ring-2 ring-champagne/50",
                )}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-champagne text-primary-foreground text-xs font-semibold px-3 py-0.5 rounded-full">
                    Populaire
                  </span>
                )}
                {plan.savings && (
                  <span className="absolute top-3 right-3 text-[10px] font-semibold text-champagne">
                    {plan.savings}
                  </span>
                )}

                <div className="w-10 h-10 rounded-xl bg-champagne/10 border border-champagne/20 flex items-center justify-center mb-4">
                  <Icon size={20} className="text-champagne" />
                </div>

                <h3 className="font-display text-xl font-medium">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mb-3">{plan.description}</p>

                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-2xl font-semibold tabular-nums">{plan.price}</span>
                  {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                </div>

                <Button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isCurrent}
                  variant={plan.popular ? "default" : "hero-outline"}
                  className="w-full mt-auto"
                >
                  {isCurrent ? "Plan actuel" : plan.id === "free" ? "Plan actif" : "Choisir ce plan"}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="glass-card rounded-2xl p-5 sm:p-6 mb-8">
          <h2 className="font-display text-lg font-medium mb-2">Passes ponctuels</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Pas besoin d&apos;abonnement : achetez uniquement ce dont vous avez besoin.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                { sku: "likes_reveal_24h" as const, desc: "Dévoilez les likes 24h" },
                { sku: "boost_24h" as const, desc: "Boost profil 24h" },
                { sku: "spotlight_24h" as const, desc: "Spotlight Discover 24h" },
              ] as const
            ).map(({ sku, desc }) => (
              <button
                key={sku}
                type="button"
                onClick={() => {
                  setCheckoutPlan(null);
                  setIsRenewalCheckout(false);
                  setIsTrialCheckout(false);
                  setCheckoutSku(sku);
                }}
                className="text-left rounded-xl border border-border/40 bg-secondary/20 p-4 hover:border-champagne/30 transition-colors"
              >
                <p className="text-sm font-medium">{desc}</p>
                <p className="text-champagne text-sm mt-1 tabular-nums">
                  {formatFcfa(CONSUMABLE_PRICES[sku])}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden mb-8">
          <div className="p-4 sm:p-5 border-b border-border/40">
            <h2 className="font-display text-lg sm:text-xl font-medium">Comparatif des formules</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-border/40 bg-secondary/30">
                  <th className="text-left px-4 sm:px-6 py-3 text-muted-foreground font-medium">Fonctionnalité</th>
                  <th className="px-3 py-3 text-center text-muted-foreground font-medium w-20">Gratuit</th>
                  <th className="px-3 py-3 text-center text-muted-foreground font-medium w-20">Plus</th>
                  <th className="px-3 py-3 text-center text-champagne font-medium w-20">Premium</th>
                  <th className="px-3 py-3 text-center text-muted-foreground font-medium w-20">VIP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {comparisonRows.map((row) => (
                  <tr key={row.label} className="hover:bg-secondary/20">
                    <td className="px-4 sm:px-6 py-3 text-foreground/90">{row.label}</td>
                    <td className="px-3 py-3 text-center"><CellValue value={row.free} /></td>
                    <td className="px-3 py-3 text-center"><CellValue value={row.plus} /></td>
                    <td className="px-3 py-3 text-center bg-champagne/5"><CellValue value={row.premium} /></td>
                    <td className="px-3 py-3 text-center"><CellValue value={row.vip} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <PaymentReassurance className="mb-8" />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {([
            { icon: Eye, label: "Voir les likes", desc: "Plus+" },
            { icon: Zap, label: "Boosts quotidiens", desc: "Premium+" },
            { icon: Shield, label: "Mode incognito", desc: "VIP" },
            { icon: Heart, label: "Swipes illimités", desc: "Premium+" },
          ] as const).map(({ icon: Icon, label, desc }) => (
            <div key={label} className="glass-card rounded-xl p-4 text-center">
              <Icon size={22} className="mx-auto mb-2 text-champagne" strokeWidth={1.5} />
              <p className="text-sm font-medium">{label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
            </div>
          ))}
        </div>

        <PaymentCheckoutDialog
          plan={checkoutPlan}
          productSku={checkoutSku}
          billingPeriod={billingPeriod}
          isTrial={isTrialCheckout}
          open={checkoutPlan !== null || checkoutSku !== null || isTrialCheckout}
          onOpenChange={(open) => {
            if (!open) {
              setCheckoutPlan(null);
              setCheckoutSku(null);
              setIsRenewalCheckout(false);
              setIsTrialCheckout(false);
            }
          }}
          isRenewal={isRenewalCheckout}
        />
      </div>
    </AppShell>
  );
}
