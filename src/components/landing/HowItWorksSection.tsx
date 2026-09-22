import { UserPlus, Search, Heart } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Créez votre profil",
    description:
      "Genre, ville, religion, métier et critères partenaires. Le genre et la date de naissance sont verrouillés après validation.",
  },
  {
    icon: Search,
    step: "02",
    title: "Découvrez l’autre genre",
    description:
      "Explorez des profils opposés au vôtre. Filtrez par ville et âge ; les filtres avancés sont réservés aux abonnés Plus.",
  },
  {
    icon: Heart,
    step: "03",
    title: "Matchez et échangez",
    description:
      "Likez, matchez, puis discutez. Les photos restent floutées sur le plan Gratuit jusqu’à un match ou un abonnement.",
  },
];

const HowItWorksSection = () => (
  <section id="how" className="py-24 md:py-32 bg-secondary/20">
    <div className="container">
      <ScrollReveal className="max-w-2xl mb-14 md:mb-20">
        <p className="text-gold text-sm uppercase tracking-[0.22em] mb-4 font-body">
          Le parcours
        </p>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-light text-foreground">
          Trois étapes simples
        </h2>
      </ScrollReveal>

      <div className="max-w-3xl space-y-12 md:space-y-14">
        {steps.map((step, i) => (
          <ScrollReveal key={step.step} delay={i * 80}>
            <div className="flex gap-5 md:gap-8 items-start">
              <div className="flex-shrink-0 flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-full border border-border/50 bg-background">
                <step.icon className="w-5 h-5 md:w-6 md:h-6 text-brand" strokeWidth={1.5} />
              </div>
              <div className="pt-1">
                <p className="text-gold/80 text-xs uppercase tracking-[0.15em] mb-2 font-body">
                  Étape {step.step}
                </p>
                <h3 className="font-display text-2xl md:text-3xl font-medium mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed max-w-md">{step.description}</p>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
