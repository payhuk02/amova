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
  <section id="trust" className="py-24 md:py-32 section-band">
    <div className="container">
      <ScrollReveal className="max-w-2xl mb-14 md:mb-20">
        <p className="text-gold text-sm uppercase tracking-[0.22em] mb-4 font-body">
          Confiance
        </p>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-medium text-foreground mb-4">
          Comment on vérifie
        </h2>
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
          Sur Amova, l’identité n’est pas un badge marketing. Elle est validée
          à la main avant d’afficher le statut vérifié.
        </p>
      </ScrollReveal>

      <div className="grid md:grid-cols-3 gap-6 md:gap-5 max-w-5xl">
        {steps.map((s, i) => (
          <ScrollReveal key={s.step} delay={i * 80}>
            <div className="panel p-6 h-full">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary border border-border">
                  <s.icon className="h-5 w-5 text-brand" strokeWidth={1.5} />
                </div>
                <span className="font-display text-sm text-gold tracking-widest">
                  {s.step}
                </span>
              </div>
              <h3 className="font-display text-xl md:text-2xl font-medium mb-2 text-foreground">
                {s.title}
              </h3>
              <p className="text-muted-foreground text-sm md:text-[0.95rem] leading-relaxed">
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
