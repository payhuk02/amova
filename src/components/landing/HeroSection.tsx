import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => (
  <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
    <div className="absolute inset-0">
      <img src={heroBg} alt="" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-background/70" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
    </div>
    <div className="container relative z-10 text-center py-20 md:py-32 px-6">
      <div className="reveal-up max-w-3xl mx-auto">
        <p className="text-copper-light font-body text-xs sm:text-sm uppercase tracking-[0.25em] mb-6">
          Sur invitation uniquement
        </p>
        <h1 className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-light leading-[0.95] mb-8">
          L'amour mérite
          <br />
          <span className="text-gradient-copper font-medium italic">son secret</span>
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg md:text-xl max-w-xl mx-auto mb-10 md:mb-12 leading-relaxed">
          Un espace confidentiel où des âmes singulières se rencontrent loin des regards. Discrétion absolue, connexions authentiques.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="hero" size="xl" className="w-full sm:w-auto" asChild>
            <Link to="/auth">Demander un accès</Link>
          </Button>
          <Button variant="hero-outline" size="xl" className="w-full sm:w-auto" asChild>
            <a href="#how">En savoir plus</a>
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="reveal-fade mt-16 md:mt-24 grid grid-cols-3 gap-4 max-w-lg mx-auto">
        {[
          { value: "12K+", label: "Membres actifs" },
          { value: "87%", label: "Taux de match" },
          { value: "100%", label: "Confidentiel" },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="font-display text-2xl sm:text-3xl text-gradient-copper font-semibold tabular-nums">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HeroSection;
