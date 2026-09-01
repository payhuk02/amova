import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Crown, Sparkles, Zap, Shield, Eye, Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription, PlanType } from "@/hooks/useSubscription";
import PaymentCheckoutDialog from "@/components/PaymentCheckoutDialog";
import PaymentReassurance from "@/components/PaymentReassurance";
import MerchantStatusBanner from "@/components/MerchantStatusBanner";
import AppShell from "@/components/AppShell";
import { cn } from "@/lib/utils";
import { PLAN_PRICES } from "@/lib/plans";

const comparisonRows = [
  { label: "Super Likes / jour", free: "1", premium: "5", vip: "Illimités" },
  { label: "Swipes", free: "Limités", premium: "Illimités", vip: "Illimités" },
  { label: "Boosts / jour", free: "—", premium: "1", vip: "3" },
  { label: "Voir qui vous aime", free: false, premium: true, vip: true },
  { label: "Filtres avancés", free: false, premium: true, vip: true },
  { label: "Mode incognito", free: false, premium: false, vip: true },
  { label: "Matching prioritaire", free: false, premium: false, vip: true },
  { label: "Support prioritaire", free: false, premium: false, vip: true },
] as const;

const plans = [
  {
    id: "free" as PlanType,
    name: "Gratuit",
    price: "0 FCFA",
    period: "",
    icon: Heart,
    description: "Découvrir la plateforme",
  },
  {
    id: "premium" as PlanType,
    name: "Premium",
    price: `${PLAN_PRICES.premium.toLocaleString("fr-FR")} FCFA`,
    period: "/mois",
    icon: Sparkles,
    description: "L'expérience complète",
    popular: true,
  },
  {
    id: "vip" as PlanType,
    name: "VIP",
    price: `${PLAN_PRICES.vip.toLocaleString("fr-FR")} FCFA`,
    period: "/mois",
    icon: Crown,
    description: "Visibilité maximale",
  },
];

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
  const { currentPlan } = useSubscription();
  const [searchParams] = useSearchParams();
  const [checkoutPlan, setCheckoutPlan] = useState<Exclude<PlanType, "free"> | null>(null);
  const [isRenewalCheckout, setIsRenewalCheckout] = useState(false);

  useEffect(() => {
    if (searchParams.get("renew") === "1" && currentPlan !== "free") {
      setCheckoutPlan(currentPlan);
      setIsRenewalCheckout(true);
    }
  }, [searchParams, currentPlan]);

  const handleSelectPlan = (planId: PlanType) => {
    if (planId === "free" || planId === currentPlan) return;
    setIsRenewalCheckout(false);
    setCheckoutPlan(planId);
  };

  const openRenewal = () => {
    if (currentPlan === "free") return;
    setIsRenewalCheckout(true);
    setCheckoutPlan(currentPlan);
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

        <MerchantStatusBanner />

        {currentPlan !== "free" && (
          <div className="mb-6 flex justify-center">
            <Button variant="outline" size="sm" onClick={openRenewal} className="border-champagne/30">
              Renouveler mon abonnement {currentPlan.toUpperCase()}
            </Button>
          </div>
        )}

        {/* Plan cards */}
        <div className="grid gap-4 sm:grid-cols-3 mb-10">
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

        {/* Comparison table */}
        <div className="glass-card rounded-2xl overflow-hidden mb-8">
          <div className="p-4 sm:p-5 border-b border-border/40">
            <h2 className="font-display text-lg sm:text-xl font-medium">Comparatif des formules</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-border/40 bg-secondary/30">
                  <th className="text-left px-4 sm:px-6 py-3 text-muted-foreground font-medium">Fonctionnalité</th>
                  <th className="px-4 py-3 text-center text-muted-foreground font-medium w-24">Gratuit</th>
                  <th className="px-4 py-3 text-center text-champagne font-medium w-24">Premium</th>
                  <th className="px-4 py-3 text-center text-muted-foreground font-medium w-24">VIP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {comparisonRows.map((row) => (
                  <tr key={row.label} className="hover:bg-secondary/20">
                    <td className="px-4 sm:px-6 py-3 text-foreground/90">{row.label}</td>
                    <td className="px-4 py-3 text-center"><CellValue value={row.free} /></td>
                    <td className="px-4 py-3 text-center bg-champagne/5"><CellValue value={row.premium} /></td>
                    <td className="px-4 py-3 text-center"><CellValue value={row.vip} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <PaymentReassurance className="mb-8" />

        {/* Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {([
            { icon: Eye, label: "Voir les likes", desc: "Premium+" },
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
          open={checkoutPlan !== null}
          onOpenChange={(open) => {
            if (!open) {
              setCheckoutPlan(null);
              setIsRenewalCheckout(false);
            }
          }}
          isRenewal={isRenewalCheckout}
        />
      </div>
    </AppShell>
  );
}
