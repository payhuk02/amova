import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => (
  <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16 bg-plum">
    <div className="absolute inset-0">
      <img
        src={heroBg}
        alt="Couple africain élégant et amoureux"
        className="w-full h-full object-cover object-[65%_center] scale-105"
      />
      <div className="absolute inset-0 hero-overlay" />
    </div>
    <div className="container relative z-10 text-center py-20 md:py-32 px-6">
      <div className="reveal-up max-w-3xl mx-auto">
        <p className="text-champagne-light font-body text-xs sm:text-sm uppercase tracking-[0.2em] mb-6">
          Amova
        </p>
        <h1 className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-light leading-[0.95] mb-8">
          Des rencontres
          <br />
          <span className="text-gradient-brand font-medium italic">qui comptent</span>
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg md:text-xl max-w-xl mx-auto mb-10 md:mb-12 leading-relaxed">
          Matching homme ↔ femme, vérification d&apos;identité manuelle, paiement Mobile Money.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="hero" size="xl" className="w-full sm:w-auto" asChild>
            <Link to="/auth">Créer mon compte</Link>
          </Button>
          <Button
            variant="hero-outline"
            size="xl"
            className="w-full sm:w-auto border-champagne/30 hover:border-champagne/50 hover:bg-champagne/10"
            asChild
          >
            <a href="#how">Comment ça marche</a>
          </Button>
        </div>
      </div>
    </div>
  </section>
);

export default HeroSection;
