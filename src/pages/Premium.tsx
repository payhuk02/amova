import { Check, Crown, Sparkles, Zap, Shield, Eye, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription, PlanType } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

const plans = [
  {
    id: "free" as PlanType,
    name: "Gratuit",
    price: "0 FCFA",
    period: "",
    icon: Heart,
    color: "from-muted to-muted/50",
    features: [
      "1 Super Like par jour",
      "Swipes limités",
      "Profil standard",
      "Messagerie basique",
    ],
    missing: [
      "Voir qui vous aime",
      "Mode incognito",
      "Boost de profil",
      "Matching prioritaire",
    ],
  },
  {
    id: "premium" as PlanType,
    name: "Premium",
    price: "4900 FCFA",
    period: "/mois",
    icon: Sparkles,
    color: "from-amber-500/20 to-orange-500/20",
    accent: "text-amber-500",
    popular: true,
    features: [
      "5 Super Likes par jour",
      "Swipes illimités",
      "1 Boost par jour",
      "Voir qui vous aime",
      "Filtres avancés",
      "Messagerie prioritaire",
    ],
    missing: [
      "Mode incognito",
      "Matching prioritaire",
      "Super Likes illimités",
    ],
  },
  {
    id: "vip" as PlanType,
    name: "VIP",
    price: "9900 FCFA",
    period: "/mois",
    icon: Crown,
    color: "from-violet-500/20 to-purple-500/20",
    accent: "text-violet-500",
    features: [
      "Super Likes illimités",
      "Swipes illimités",
      "3 Boosts par jour",
      "Voir qui vous aime",
      "Mode incognito",
      "Matching prioritaire",
      "Badge VIP exclusif",
      "Support prioritaire",
    ],
    missing: [],
  },
];

export default function Premium() {
  const { currentPlan, upgrade } = useSubscription();

  return (
    <div className="container max-w-5xl py-6 px-4 pb-24 lg:pb-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
          <Crown size={16} />
          Abonnements Amova
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          Trouvez l'amour plus vite
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Débloquez des fonctionnalités exclusives pour maximiser vos chances de rencontre
        </p>
      </div>

      {/* Plans grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const Icon = plan.icon;

          return (
            <div
              key={plan.id}
              className={cn(
                "relative rounded-2xl border p-5 flex flex-col transition-all",
                plan.popular
                  ? "border-amber-500/50 shadow-lg shadow-amber-500/10 scale-[1.02]"
                  : "border-border/50",
                isCurrent && "ring-2 ring-primary"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full">
                  Populaire
                </div>
              )}

              <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3", plan.color)}>
                <Icon size={20} className={plan.accent || "text-muted-foreground"} />
              </div>

              <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
              </div>

              <div className="flex-1 space-y-2 mb-5">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <Check size={14} className="text-green-500 shrink-0" />
                    <span className="text-foreground">{f}</span>
                  </div>
                ))}
                {plan.missing.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm opacity-40">
                    <Check size={14} className="shrink-0" />
                    <span className="line-through">{f}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => upgrade(plan.id)}
                disabled={isCurrent}
                variant={plan.popular ? "default" : "outline"}
                className={cn(
                  "w-full",
                  plan.popular && "bg-amber-500 hover:bg-amber-600 text-white"
                )}
              >
                {isCurrent ? "Plan actuel" : plan.id === "free" ? "Plan gratuit" : "Bientôt disponible"}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Features breakdown */}
      <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {([
          { icon: Heart, label: "Swipes illimités", desc: "Premium+" },
          { icon: Eye, label: "Voir les likes", desc: "Premium+" },
          { icon: Zap, label: "Boosts quotidiens", desc: "Premium+" },
          { icon: Shield, label: "Mode incognito", desc: "VIP" },
        ] as const).map((f) => {
          const FIcon = f.icon;
          return (
            <div key={f.label} className="text-center p-4 rounded-xl bg-secondary/30 border border-border/30">
              <FIcon size={24} className="mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium text-foreground">{f.label}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
