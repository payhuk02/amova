import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";

const CTASection = () => (
  <section className="py-28 md:py-36 relative">
    <div className="absolute inset-x-0 top-0 hairline" aria-hidden />
    <div className="container">
      <ScrollReveal className="max-w-xl">
        <p className="text-gold text-xs uppercase tracking-[0.22em] mb-4 font-body">Rejoindre</p>
        <h2 className="font-display text-3xl md:text-5xl font-medium mb-5 leading-[1.1] text-foreground">
          Votre prochain chapitre commence ici
        </h2>
        <p className="text-muted-foreground text-base md:text-lg mb-10 leading-relaxed">
          Inscription gratuite. Matching homme ↔ femme. Vérification d&apos;identité disponible après abonnement.
        </p>
        <Button variant="hero" size="xl" asChild>
          <Link to="/auth">Créer mon compte</Link>
        </Button>
        <p className="text-muted-foreground/60 text-xs mt-7 tracking-wide">
          18 ans et plus · Annulation à tout moment
        </p>
      </ScrollReveal>
    </div>
  </section>
);

export default CTASection;
