import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";

const CTASection = () => (
  <section className="py-24 md:py-32 bg-background relative">
    <div className="absolute inset-x-0 top-0 hairline" aria-hidden />
    <div className="container">
      <ScrollReveal className="max-w-xl mx-auto text-center">
        <p className="eyebrow mb-4">Inscription</p>
        <h2 className="font-display text-3xl md:text-5xl font-medium mb-4 leading-[1.1] text-foreground">
          Rejoindre Amova
        </h2>
        <p className="text-muted-foreground text-base md:text-lg mb-9 leading-relaxed">
          Compte gratuit. Matching homme ↔ femme. La vérification d&apos;identité
          est disponible après abonnement.
        </p>
        <Button variant="hero" size="xl" asChild>
          <Link to="/auth">Créer mon compte</Link>
        </Button>
        <p className="text-muted-foreground text-xs mt-6">
          Réservé aux 18 ans et plus · Résiliation à tout moment
        </p>
      </ScrollReveal>
    </div>
  </section>
);

export default CTASection;
