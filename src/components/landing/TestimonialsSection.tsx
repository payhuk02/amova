import ScrollReveal from "@/components/ScrollReveal";

const points = [
  {
    title: "Matching clair",
    text: "Découverte strictement homme ↔ femme, pour des intentions sans ambiguïté.",
  },
  {
    title: "Contrôle humain",
    text: "L’identité est validée par un administrateur, jamais uniquement par un bot.",
  },
  {
    title: "Paiement local",
    text: "Abonnements et passes via Orange Money, MTN et Wave, en FCFA.",
  },
];

const TestimonialsSection = () => (
  <section id="engagements" className="py-20 md:py-24 section-band">
    <div className="container">
      <ScrollReveal className="max-w-2xl mx-auto text-center mb-12 md:mb-14">
        <p className="eyebrow mb-3">Promesse</p>
        <h2 className="font-display text-3xl md:text-4xl font-medium text-foreground">
          Ce que vous pouvez attendre
        </h2>
      </ScrollReveal>
      <div className="grid md:grid-cols-3 gap-4 md:gap-5 max-w-4xl mx-auto">
        {points.map((p, i) => (
          <ScrollReveal key={p.title} delay={i * 60}>
            <article className="panel p-6 md:p-7 h-full text-center flex flex-col items-center">
              <h3 className="font-display text-lg font-medium mb-2 text-foreground">{p.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{p.text}</p>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
