import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => (
  <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16 sm:pt-[7.5rem] bg-plum">
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
        <p className="text-champagne-light font-body text-xs sm:text-sm uppercase tracking-[0.25em] mb-6">
          Rencontres vérifiées & sécurisées
        </p>
        <h1 className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-light leading-[0.95] mb-8">
          Des rencontres
          <br />
          <span className="text-gradient-brand font-medium italic">qui comptent</span>
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg md:text-xl max-w-xl mx-auto mb-10 md:mb-12 leading-relaxed">
          Une plateforme sélective où des profils authentiques se rencontrent en toute confiance. Discrétion, vérification et modération active.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="hero" size="xl" className="w-full sm:w-auto glow-champagne" asChild>
            <Link to="/auth">Créer mon compte</Link>
          </Button>
          <Button variant="hero-outline" size="xl" className="w-full sm:w-auto border-champagne/30 hover:border-champagne/50 hover:bg-champagne/10" asChild>
            <a href="#how">En savoir plus</a>
          </Button>
        </div>
      </div>

      <div className="reveal-fade mt-16 md:mt-24 grid grid-cols-3 gap-4 max-w-lg mx-auto">
        {[
          { value: "100%", label: "Profils vérifiés" },
          { value: "24h", label: "Modération active" },
          { value: "Sécurisé", label: "Paiement protégé" },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="font-display text-2xl sm:text-3xl text-gradient-brand font-semibold tabular-nums">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HeroSection;
