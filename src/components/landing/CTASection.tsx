import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";

const CTASection = () => (
  <section className="py-24 md:py-32 relative overflow-hidden">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-champagne/[0.04] blur-3xl pointer-events-none" />
    <div className="container relative">
      <ScrollReveal className="max-w-2xl mx-auto text-center">
        <p className="text-champagne-light text-sm uppercase tracking-[0.25em] mb-4">Prêt à commencer ?</p>
        <h2 className="font-display text-4xl md:text-6xl font-light mb-6 leading-[1.05]">
          Votre histoire <span className="text-gradient-copper italic">commence ici</span>
        </h2>
        <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
          Rejoignez une communauté de célibataires sérieux, vérifiés et engagés dans des rencontres authentiques.
        </p>
        <Button variant="hero" size="xl" asChild>
          <Link to="/auth">Créer mon compte</Link>
        </Button>
        <p className="text-muted-foreground/60 text-xs mt-6">
          Inscription gratuite · Annulation à tout moment
        </p>
      </ScrollReveal>
    </div>
  </section>
);

export default CTASection;
