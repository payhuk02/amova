import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";

const CTASection = () => (
  <section className="py-24 md:py-28">
    <div className="container">
      <ScrollReveal className="max-w-xl">
        <h2 className="font-display text-3xl md:text-5xl font-light mb-4 leading-tight text-foreground">
          Rejoindre Amova
        </h2>
        <p className="text-muted-foreground text-base md:text-lg mb-8 leading-relaxed">
          Inscription gratuite. Matching homme ↔ femme. Vérification d&apos;identité disponible après abonnement.
        </p>
        <Button variant="hero" size="xl" asChild>
          <Link to="/auth">Créer mon compte</Link>
        </Button>
        <p className="text-muted-foreground/70 text-xs mt-6">
          18 ans et plus · Annulation à tout moment
        </p>
      </ScrollReveal>
    </div>
  </section>
);

export default CTASection;
