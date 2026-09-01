import { UserPlus, Search, Heart } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Inscription",
    description: "Créez votre profil en quelques minutes. Ajoutez vos photos et centres d'intérêt pour vous démarquer.",
  },
  {
    icon: Search,
    step: "02",
    title: "Découverte",
    description: "Explorez des profils compatibles grâce à notre algorithme. Filtrez par ville, âge et préférences.",
  },
  {
    icon: Heart,
    step: "03",
    title: "Connexion",
    description: "Likez, matchez et échangez en toute sécurité. Chaque interaction est protégée et modérée.",
  },
];

const HowItWorksSection = () => (
  <section id="how" className="py-24 md:py-32 relative overflow-hidden">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-champagne/[0.03] blur-3xl pointer-events-none" />

    <div className="container relative">
      <ScrollReveal className="text-center mb-16 md:mb-20">
        <p className="text-champagne-light text-sm uppercase tracking-[0.25em] mb-4">Le parcours</p>
        <h2 className="font-display text-4xl md:text-5xl font-light">
          Trois étapes vers <span className="text-gradient-copper italic">la rencontre</span>
        </h2>
      </ScrollReveal>

      <div className="max-w-4xl mx-auto">
        {steps.map((step, i) => (
          <ScrollReveal key={step.step} delay={i * 120} direction={i % 2 === 0 ? "left" : "right"}>
            <div className="flex gap-6 md:gap-10 mb-12 md:mb-16 last:mb-0 items-start">
              <div className="flex-shrink-0 relative">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl glass-card flex items-center justify-center">
                  <step.icon className="w-7 h-7 md:w-8 md:h-8 text-champagne" strokeWidth={1.5} />
                </div>
                {i < steps.length - 1 && (
                  <div className="absolute top-20 md:top-24 left-1/2 -translate-x-1/2 w-px h-12 md:h-16 bg-gradient-to-b from-border/60 to-transparent" />
                )}
              </div>

              <div className="pt-2 md:pt-4">
                <p className="text-champagne-light text-xs uppercase tracking-[0.2em] mb-2 font-body">Étape {step.step}</p>
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
