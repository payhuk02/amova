import { IdCard, Camera, BadgeCheck } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const steps = [
  {
    icon: IdCard,
    step: "01",
    title: "Pièce d’identité",
    text: "Recto et verso d’une pièce officielle. Vos documents restent confidentiels.",
  },
  {
    icon: Camera,
    step: "02",
    title: "Selfie en direct",
    text: "Une photo prise en live pour confirmer que le profil vous appartient.",
  },
  {
    icon: BadgeCheck,
    step: "03",
    title: "Validation humaine",
    text: "Un administrateur compare et valide. Pas de robot, pas d’automatisme opaque.",
  },
];

const TrustKycSection = () => (
  <section id="trust" className="py-24 md:py-32 border-b border-border/40">
    <div className="container">
      <ScrollReveal className="max-w-2xl mb-14 md:mb-20">
        <p className="text-brand-light text-sm uppercase tracking-[0.2em] mb-4 font-body">
          Confiance
        </p>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-light text-foreground mb-4">
          Comment on vérifie
        </h2>
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
          Sur Amova, l’identité n’est pas un badge marketing. Elle est validée
          à la main avant d’afficher le statut vérifié.
        </p>
      </ScrollReveal>

      <div className="grid md:grid-cols-3 gap-10 md:gap-8 max-w-5xl">
        {steps.map((s, i) => (
          <ScrollReveal key={s.step} delay={i * 80}>
            <div className="relative h-full">
              {i < steps.length - 1 && (
                <div
                  className="hidden md:block absolute top-7 left-[calc(100%+0.25rem)] w-[calc(100%-2rem)] h-px bg-border/60"
                  aria-hidden
                />
              )}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-secondary/40">
                  <s.icon className="h-6 w-6 text-brand" strokeWidth={1.5} />
                </div>
                <span className="font-display text-sm text-muted-foreground tracking-widest">
                  {s.step}
                </span>
              </div>
              <h3 className="font-display text-xl md:text-2xl font-medium mb-2 text-foreground">
                {s.title}
              </h3>
              <p className="text-muted-foreground text-sm md:text-[0.95rem] leading-relaxed max-w-xs">
                {s.text}
              </p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  </section>
);

export default TrustKycSection;
