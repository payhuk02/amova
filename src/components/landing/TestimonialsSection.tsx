import ScrollReveal from "@/components/ScrollReveal";

const testimonials = [
  {
    quote: "J'ai trouvé quelqu'un qui comprend le besoin de discrétion. Éclipse a changé ma vision des rencontres.",
    name: "Camille R.",
    age: 34,
    initials: "CR",
  },
  {
    quote: "La qualité des profils est incomparable. On sent que chaque membre est là pour les bonnes raisons.",
    name: "Marc D.",
    age: 41,
    initials: "MD",
  },
  {
    quote: "Enfin un espace où je peux être moi-même sans craindre le jugement. L'anonymat ici est réel.",
    name: "Sophie L.",
    age: 29,
    initials: "SL",
  },
];

const TestimonialsSection = () => (
  <section id="testimonials" className="py-24 md:py-32 bg-secondary/20">
    <div className="container">
      <ScrollReveal className="text-center mb-16">
        <p className="text-copper-light text-sm uppercase tracking-[0.25em] mb-4">Ils nous font confiance</p>
        <h2 className="font-display text-4xl md:text-5xl font-light">
          Des rencontres <span className="text-gradient-copper italic">inoubliables</span>
        </h2>
      </ScrollReveal>
      <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
        {testimonials.map((t, i) => (
          <ScrollReveal key={t.name} delay={i * 100}>
            <div className="glass-card rounded-xl p-6 md:p-8 flex flex-col h-full">
              <p className="text-foreground/80 italic leading-relaxed flex-1 font-display text-lg">
                "{t.quote}"
              </p>
              <div className="mt-6 pt-6 border-t border-border/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-copper text-sm font-medium">
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.age} ans · Membre vérifié</p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
