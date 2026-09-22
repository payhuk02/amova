import { Shield, Heart, Smartphone, BadgeCheck } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const features = [
  {
    icon: Heart,
    title: "Matching homme ↔ femme",
    description: "Les hommes voient les femmes, et inversement. Intentions claires, sans ambiguïté.",
  },
  {
    icon: BadgeCheck,
    title: "Profils vérifiés",
    description: "Pièce, selfie et photos récentes validés par un administrateur — pas par un bot.",
  },
  {
    icon: Shield,
    title: "Modération réelle",
    description: "Signalements traités par l’équipe. Comptes frauduleux ou abusifs suspendus.",
  },
  {
    icon: Smartphone,
    title: "Mobile Money",
    description: "Orange Money, MTN et Wave. Abonnements et passes en FCFA, sans surprise.",
  },
];

const FeaturesSection = () => (
  <section id="features" className="py-24 md:py-32 section-band">
    <div className="container">
      <ScrollReveal className="max-w-2xl mb-14 md:mb-20">
        <p className="text-gold text-sm uppercase tracking-[0.22em] mb-4 font-body">
          Ce qui compte
        </p>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-medium text-foreground">
          Conçue pour des rencontres sérieuses
        </h2>
      </ScrollReveal>

      <div className="grid sm:grid-cols-2 gap-4 md:gap-5 max-w-4xl">
        {features.map((feature, i) => (
          <ScrollReveal key={feature.title} delay={i * 50}>
            <div className="panel flex gap-4 md:gap-5 p-5 md:p-6 h-full">
              <feature.icon
                className="w-6 h-6 text-brand shrink-0 mt-0.5"
                strokeWidth={1.5}
              />
              <div>
                <h3 className="font-display text-lg md:text-xl font-medium mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
