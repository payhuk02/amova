import { Shield, Heart, Smartphone, BadgeCheck } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const features = [
  {
    icon: Heart,
    title: "Matching homme ↔ femme",
    description:
      "Les hommes voient uniquement des femmes, et inversement. Des intentions claires, dès le premier regard.",
  },
  {
    icon: BadgeCheck,
    title: "Profils contrôlés",
    description:
      "Pièce d’identité, selfie et photos récentes validés par un administrateur, pas par un algorithme seul.",
  },
  {
    icon: Shield,
    title: "Modération attentive",
    description:
      "Signalements traités par l’équipe. Les comptes abusifs ou frauduleux sont suspendus.",
  },
  {
    icon: Smartphone,
    title: "Paiement Mobile Money",
    description:
      "Orange Money, MTN et Wave. Abonnements et passes en FCFA, avec des tarifs affichés sans surprise.",
  },
];

const FeaturesSection = () => (
  <section id="features" className="py-24 md:py-32 section-band">
    <div className="container">
      <ScrollReveal className="max-w-2xl mx-auto text-center mb-14 md:mb-20">
        <p className="eyebrow mb-4">Engagements</p>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-medium text-foreground">
          Conçue pour des rencontres sérieuses
        </h2>
        <p className="text-muted-foreground mt-4 text-base leading-relaxed mx-auto max-w-xl">
          Une plateforme sobre, pensée pour des adultes qui cherchent une relation
          durable — pas un divertissement anonyme.
        </p>
      </ScrollReveal>

      <div className="grid sm:grid-cols-2 gap-4 md:gap-5 max-w-4xl mx-auto">
        {features.map((feature, i) => (
          <ScrollReveal key={feature.title} delay={i * 50}>
            <article className="panel flex flex-col items-center text-center p-6 md:p-8 h-full">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-brand mb-4">
                <feature.icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-lg font-medium mb-2 text-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
