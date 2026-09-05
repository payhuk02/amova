import { Shield, Heart, Smartphone, BadgeCheck } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const features = [
  {
    icon: Heart,
    title: "Matching homme ↔ femme",
    description: "Les hommes voient les femmes, et inversement. Pas d’ambiguïté sur les intentions.",
  },
  {
    icon: BadgeCheck,
    title: "Vérification manuelle",
    description: "Pièce d’identité, selfie et photos récentes validés par un administrateur.",
  },
  {
    icon: Shield,
    title: "Modération réelle",
    description: "Signalements traités par l’équipe. Comptes frauduleux ou abusifs suspendus.",
  },
  {
    icon: Smartphone,
    title: "Mobile Money",
    description: "Paiement via Orange Money, MTN et Wave. Abonnements et passes clairs.",
  },
];

const FeaturesSection = () => (
  <section id="features" className="py-24 md:py-32 bg-secondary/20">
    <div className="container">
      <ScrollReveal className="text-center mb-16 md:mb-20">
        <p className="text-champagne-light text-sm uppercase tracking-[0.2em] mb-4">Ce qui compte</p>
        <h2 className="font-display text-4xl md:text-5xl font-light text-foreground">
          Une plateforme conçue pour des rencontres sérieuses
        </h2>
      </ScrollReveal>
      <div className="grid sm:grid-cols-2 gap-5 md:gap-6 max-w-4xl mx-auto">
        {features.map((feature, i) => (
          <ScrollReveal key={feature.title} delay={i * 60}>
            <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8 h-full">
              <feature.icon
                className="w-7 h-7 text-champagne mb-5"
                strokeWidth={1.5}
              />
              <h3 className="font-display text-lg md:text-xl font-medium mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
