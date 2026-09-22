import { IdCard, Camera, BadgeCheck } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const steps = [
  {
    icon: IdCard,
    step: "01",
    title: "Pièce d’identité",
    text: "Vous transmettez le recto et le verso d’une pièce officielle. Vos documents restent strictement confidentiels.",
  },
  {
    icon: Camera,
    step: "02",
    title: "Selfie en direct",
    text: "Une photo prise en direct confirme que le profil vous appartient réellement.",
  },
  {
    icon: BadgeCheck,
    step: "03",
    title: "Validation humaine",
    text: "Un administrateur compare les éléments et valide le badge. Aucune validation automatique opaque.",
  },
];

const TrustKycSection = () => (
  <section id="trust" className="py-24 md:py-32 section-band">
    <div className="container">
      <ScrollReveal className="max-w-2xl mx-auto text-center mb-14 md:mb-20">
        <p className="eyebrow mb-4">Sécurité</p>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-medium text-foreground mb-4">
          Une identité vérifiée, réellement
        </h2>
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
          Sur Amova, le statut vérifié n’est pas un décor. Chaque dossier est examiné
          par un membre de l’équipe avant validation.
        </p>
      </ScrollReveal>

      <div className="grid md:grid-cols-3 gap-4 md:gap-5 max-w-5xl mx-auto">
        {steps.map((s, i) => (
          <ScrollReveal key={s.step} delay={i * 80}>
            <article className="panel p-6 md:p-8 h-full flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-brand mb-4">
                <s.icon className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <span className="font-display text-xs text-muted-foreground tracking-[0.2em] mb-3">
                {s.step}
              </span>
              <h3 className="font-display text-xl font-medium mb-2 text-foreground">
                {s.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {s.text}
              </p>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </div>
  </section>
);

export default TrustKycSection;
