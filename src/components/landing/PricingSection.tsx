import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import { PLAN_PRICES } from "@/lib/plans";

const plans = [
  {
    name: "Gratuit",
    price: "0 FCFA",
    period: "",
    description: "Découvrir la plateforme",
    features: ["1 Super Like / jour", "50 swipes / jour", "15 messages / jour", "Avatar visible (galerie Plus)"],
    cta: "Commencer",
    highlighted: false,
  },
  {
    name: "Plus",
    price: `${PLAN_PRICES.plus.toLocaleString("fr-FR")} FCFA`,
    period: "/mois",
    description: "Photos, likes et messages",
    features: ["2 Super Likes / jour", "100 swipes / jour", "Messages illimités", "Galerie photos HD", "Voir qui vous aime", "Filtres avancés"],
    cta: "Choisir Plus",
    highlighted: false,
  },
  {
    name: "Premium",
    price: `${PLAN_PRICES.premium.toLocaleString("fr-FR")} FCFA`,
    period: "/mois",
    description: "Swipes illimités et boost",
    features: ["5 Super Likes / jour", "Swipes & messages illimités", "1 Boost / jour", "Tout le plan Plus"],
    cta: "Choisir Premium",
    highlighted: true,
  },
  {
    name: "VIP",
    price: `${PLAN_PRICES.vip.toLocaleString("fr-FR")} FCFA`,
    period: "/mois",
    description: "Priorité et incognito",
    features: ["Super Likes illimités", "Mode incognito", "Matching prioritaire", "3 Boosts / jour", "Support prioritaire"],
    cta: "Choisir VIP",
    highlighted: false,
  },
];

const PricingSection = () => (
  <section id="pricing" className="py-24 md:py-32">
    <div className="container">
      <ScrollReveal className="text-center mb-16 md:mb-20">
        <p className="text-champagne-light text-sm uppercase tracking-[0.2em] mb-4">Tarifs</p>
        <h2 className="font-display text-4xl md:text-5xl font-light text-foreground">
          Formules claires
        </h2>
        <p className="text-muted-foreground mt-4 max-w-md mx-auto text-sm md:text-base">
          −15 % trimestriel, −30 % annuel. Paiement Orange Money, MTN et Wave.
        </p>
      </ScrollReveal>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto items-stretch px-4 sm:px-6 md:px-0">
        {plans.map((plan, i) => (
          <ScrollReveal key={plan.name} delay={i * 60}>
            <div
              className={`rounded-2xl p-6 md:p-7 h-full flex flex-col border bg-card transition-colors ${
                plan.highlighted
                  ? "border-champagne/40 relative"
                  : "border-border/50 hover:border-border"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute top-0 left-4 -translate-y-1/2 bg-background border border-champagne/40 text-champagne text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md">
                  Populaire
                </span>
              )}
              <div className="mb-5">
                <h3 className="font-display text-xl font-medium mb-1">{plan.name}</h3>
                <p className="text-muted-foreground text-sm">{plan.description}</p>
              </div>
              <div className="mb-5">
                <span className="font-display text-2xl md:text-3xl font-semibold text-foreground tabular-nums">
                  {plan.price}
                </span>
                {plan.period && <span className="text-muted-foreground text-sm">{plan.period}</span>}
              </div>
              <ul className="space-y-2.5 mb-7 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-success mt-0.5 flex-shrink-0" strokeWidth={2} />
                    <span className="text-foreground/80">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.highlighted ? "hero" : "hero-outline"}
                size="lg"
                className="w-full"
                asChild
              >
                <Link to="/auth">{plan.cta}</Link>
              </Button>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  </section>
);

export default PricingSection;
