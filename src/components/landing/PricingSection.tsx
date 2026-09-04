import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";

const plans = [
  {
    name: "Gratuit",
    price: "0 FCFA",
    period: "",
    description: "Pour découvrir la plateforme",
    features: ["1 Super Like / jour", "50 swipes / jour", "15 messages / jour", "Avatar visible (galerie Premium)"],
    cta: "Commencer gratuitement",
    highlighted: false,
  },
  {
    name: "Premium",
    price: "4 900 FCFA",
    period: "/mois",
    description: "L'expérience complète",
    features: ["5 Super Likes / jour", "Swipes & messages illimités", "Galerie photos HD", "Voir qui vous aime", "Filtres avancés", "1 Boost / jour"],
    cta: "Choisir Premium",
    highlighted: true,
  },
  {
    name: "VIP",
    price: "9 900 FCFA",
    period: "/mois",
    description: "Visibilité et priorité maximales",
    features: ["Super Likes illimités", "Mode incognito", "Matching prioritaire", "3 Boosts / jour", "Support prioritaire"],
    cta: "Choisir VIP",
    highlighted: false,
  },
];

const PricingSection = () => (
  <section id="pricing" className="py-24 md:py-32">
    <div className="container">
      <ScrollReveal className="text-center mb-16 md:mb-20">
        <p className="text-champagne-light text-sm uppercase tracking-[0.25em] mb-4">Tarifs</p>
        <h2 className="font-display text-4xl md:text-5xl font-light">
          Des formules <span className="text-gradient-copper italic">transparentes</span>
        </h2>
        <p className="text-muted-foreground mt-4 max-w-md mx-auto">
          Pas de frais cachés. Paiement sécurisé via Orange Money, MTN et Wave.
        </p>
      </ScrollReveal>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch px-4 sm:px-6 md:px-0">
        {plans.map((plan, i) => (
          <ScrollReveal key={plan.name} delay={i * 100}>
            <div
              className={`rounded-2xl p-6 md:p-8 h-full flex flex-col transition-all duration-300 ${
                plan.highlighted
                  ? "glass-card border-champagne/30 shadow-premium relative"
                  : "glass-card hover:border-champagne/20"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-champagne text-primary-foreground text-xs font-semibold px-4 py-1 rounded-full">
                  Populaire
                </span>
              )}
              <div className="mb-6">
                <h3 className="font-display text-xl font-medium mb-1">{plan.name}</h3>
                <p className="text-muted-foreground text-sm">{plan.description}</p>
              </div>
              <div className="mb-6">
                <span className="font-display text-4xl font-semibold text-gradient-copper tabular-nums">{plan.price}</span>
                {plan.period && <span className="text-muted-foreground text-sm">{plan.period}</span>}
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
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
