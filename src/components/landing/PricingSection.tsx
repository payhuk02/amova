import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";

const plans = [
  {
    name: "Découverte",
    price: "0 FCFA",
    period: "",
    description: "Pour explorer en toute discrétion",
    features: ["3 profils par jour", "Messagerie basique", "Profil vérifié", "Chiffrement des messages"],
    cta: "Commencer",
    highlighted: false,
  },
  {
    name: "Privilège",
    price: "4900 FCFA",
    period: "/mois",
    description: "L'expérience complète sans limite",
    features: ["Profils illimités", "Messages éphémères", "Matching avancé", "Accès événements", "Profil prioritaire", "Support dédié"],
    cta: "Choisir Privilège",
    highlighted: true,
  },
  {
    name: "Cercle d'Or",
    price: "9900 FCFA",
    period: "/mois",
    description: "Le summum de l'exclusivité",
    features: ["Tout de Privilège", "Concierge personnel", "Événements VIP", "Visibilité maximale", "Matching prioritaire", "Invitations +1"],
    cta: "Demander l'accès",
    highlighted: false,
  },
];

const PricingSection = () => (
  <section id="pricing" className="py-24 md:py-32">
    <div className="container">
      <ScrollReveal className="text-center mb-16 md:mb-20">
        <p className="text-copper-light text-sm uppercase tracking-[0.25em] mb-4">Tarifs</p>
        <h2 className="font-display text-4xl md:text-5xl font-light">
          Choisissez votre <span className="text-gradient-copper italic">expérience</span>
        </h2>
      </ScrollReveal>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch px-4 sm:px-6 md:px-0">
        {plans.map((plan, i) => (
          <ScrollReveal key={plan.name} delay={i * 100}>
            <div
              className={`rounded-xl p-6 md:p-8 h-full flex flex-col transition-all duration-300 ${
                plan.highlighted
                  ? "glass-card border-primary/40 glow-copper relative"
                  : "glass-card hover:border-primary/20"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-4 py-1 rounded-full">
                  Populaire
                </span>
              )}
              <div className="mb-6">
                <h3 className="font-display text-xl font-medium mb-1">{plan.name}</h3>
                <p className="text-muted-foreground text-sm">{plan.description}</p>
              </div>
              <div className="mb-6">
                <span className="font-display text-4xl font-semibold text-gradient-copper">{plan.price}</span>
                {plan.period && <span className="text-muted-foreground text-sm">{plan.period}</span>}
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="w-4 h-4 text-copper mt-0.5 flex-shrink-0" strokeWidth={2} />
                    <span className="text-foreground/80">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.highlighted ? "hero" : "hero-outline"}
                size="lg"
                className="w-full"
              >
                {plan.cta}
              </Button>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  </section>
);

export default PricingSection;
