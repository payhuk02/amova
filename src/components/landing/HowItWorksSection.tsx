import { UserPlus, Search, Heart } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Créez votre profil",
    description:
      "Présentez-vous : ville, métier, religion et critères. Le genre et la date de naissance sont définitifs après validation.",
  },
  {
    icon: Search,
    step: "02",
    title: "Découvrez l’autre genre",
    description:
      "Parcourez uniquement des profils du genre opposé. Filtrez par ville et âge ; les filtres avancés sont inclus dès Plus.",
  },
  {
    icon: Heart,
    step: "03",
    title: "Matchez, puis échangez",
    description:
      "Un like mutuel ouvre la conversation. Sur le plan Gratuit, les photos restent floutées jusqu’au match ou à un abonnement.",
  },
];

const HowItWorksSection = () => (
  <section id="how" className="py-24 md:py-32 bg-background">
    <div className="container">
      <ScrollReveal className="max-w-2xl mx-auto text-center mb-14 md:mb-20">
        <p className="eyebrow mb-4">Parcours</p>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-medium text-foreground">
          Trois étapes, sans détour
        </h2>
      </ScrollReveal>

      <div className="grid sm:grid-cols-3 gap-4 md:gap-5 max-w-5xl mx-auto">
        {steps.map((step, i) => (
          <ScrollReveal key={step.step} delay={i * 80}>
            <article className="panel flex flex-col items-center text-center p-6 md:p-8 h-full">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-brand mb-4">
                <step.icon className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <p className="text-brand text-xs uppercase tracking-[0.16em] mb-2 font-body font-medium">
                Étape {step.step}
              </p>
              <h3 className="font-display text-xl md:text-2xl font-medium mb-2 text-foreground">
                {step.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.description}
              </p>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
