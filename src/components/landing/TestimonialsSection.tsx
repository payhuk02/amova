import ScrollReveal from "@/components/ScrollReveal";

const points = [
  {
    title: "Matching H↔F",
    text: "Découverte strictement homme ↔ femme.",
  },
  {
    title: "Vérification manuelle",
    text: "Identité validée par un administrateur, pas par un bot.",
  },
  {
    title: "Mobile Money",
    text: "Orange Money, MTN et Wave pour les abonnements.",
  },
];

/** Trust strip — no fabricated testimonials */
const TestimonialsSection = () => (
  <section id="testimonials" className="py-20 md:py-24 bg-secondary/20 border-y border-border/30">
    <div className="container">
      <ScrollReveal className="text-center mb-12">
        <p className="text-champagne-light text-sm uppercase tracking-[0.2em] mb-3">Engagements</p>
        <h2 className="font-display text-3xl md:text-4xl font-light text-foreground">
          Ce que vous pouvez attendre
        </h2>
      </ScrollReveal>
      <div className="grid md:grid-cols-3 gap-8 md:gap-10 max-w-4xl mx-auto">
        {points.map((p, i) => (
          <ScrollReveal key={p.title} delay={i * 60}>
            <div className="text-center md:text-left">
              <h3 className="font-display text-lg font-medium mb-2 text-champagne-light">{p.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{p.text}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
