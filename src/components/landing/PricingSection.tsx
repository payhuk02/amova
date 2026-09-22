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
    description: "Pour découvrir Amova en douceur",
    features: [
      "50 swipes / jour",
      "1 Super Like / jour",
      "15 messages / jour",
      "Avatar visible (galerie en Plus)",
    ],
    cta: "Commencer",
    highlighted: false,
  },
  {
    name: "Plus",
    price: `${PLAN_PRICES.plus.toLocaleString("fr-FR")} FCFA`,
    period: "/mois",
    description: "Photos nettes, likes et messages",
    features: [
      "100 swipes / jour",
      "2 Super Likes / jour",
      "Messages illimités",
      "Galerie photos HD",
      "Voir qui vous aime",
      "Filtres avancés",
    ],
    cta: "Choisir Plus",
    highlighted: false,
  },
  {
    name: "Premium",
    price: `${PLAN_PRICES.premium.toLocaleString("fr-FR")} FCFA`,
    period: "/mois",
    description: "Liberté totale de découverte",
    features: [
      "Swipes & messages illimités",
      "5 Super Likes / jour",
      "1 Boost / jour",
      "Tout le plan Plus",
    ],
    cta: "Choisir Premium",
    highlighted: true,
  },
  {
    name: "VIP",
    price: `${PLAN_PRICES.vip.toLocaleString("fr-FR")} FCFA`,
    period: "/mois",
    description: "Visibilité et discrétion maximales",
    features: [
      "Super Likes illimités",
      "Mode incognito",
      "Matching prioritaire",
      "3 Boosts / jour",
      "Support prioritaire",
    ],
    cta: "Choisir VIP",
    highlighted: false,
  },
];

const PricingSection = () => (
  <section id="pricing" className="py-24 md:py-32 bg-background">
    <div className="container">
      <ScrollReveal className="max-w-2xl mx-auto text-center mb-14 md:mb-16">
        <p className="eyebrow mb-4">Tarifs</p>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-medium text-foreground">
          Des formules transparentes
        </h2>
        <p className="text-muted-foreground mt-4 mx-auto max-w-lg text-sm md:text-base leading-relaxed">
          −15&nbsp;% en trimestriel, −30&nbsp;% en annuel. Paiement via Orange Money, MTN ou Wave.
        </p>
      </ScrollReveal>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 max-w-6xl mx-auto items-stretch">
        {plans.map((plan, i) => (
          <ScrollReveal key={plan.name} delay={i * 60}>
            <article
              className={`panel p-6 h-full flex flex-col text-center items-center ${
                plan.highlighted
                  ? "border-brand relative ring-1 ring-brand/25 shadow-md"
                  : ""
              }`}
            >
              {plan.highlighted && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border border-brand text-brand text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md">
                  Recommandé
                </span>
              )}
              <div className="mb-5 w-full">
                <h3 className="font-display text-xl font-medium mb-1 text-foreground">{plan.name}</h3>
                <p className="text-muted-foreground text-sm leading-snug">{plan.description}</p>
              </div>
              <div className="mb-5">
                <span className="font-display text-2xl md:text-3xl font-semibold text-foreground tabular-nums">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-muted-foreground text-sm ml-1">{plan.period}</span>
                )}
              </div>
              <ul className="space-y-2.5 mb-7 flex-1 w-full text-left">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm justify-center sm:justify-start">
                    <Check className="w-4 h-4 text-success mt-0.5 shrink-0" strokeWidth={2} />
                    <span className="text-foreground/80 text-left">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.highlighted ? "hero" : "outline"}
                size="lg"
                className="w-full"
                asChild
              >
                <Link to="/auth">{plan.cta}</Link>
              </Button>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </div>
  </section>
);

export default PricingSection;
