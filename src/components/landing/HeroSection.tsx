import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => (
  <section className="relative min-h-[100svh] flex items-end md:items-center overflow-hidden pt-16 bg-plum">
    <div className="absolute inset-0">
      <img
        src={heroBg}
        alt="Couple africain élégant"
        width={1536}
        height={1024}
        decoding="async"
        fetchPriority="high"
        className="w-full h-full object-cover object-[68%_center] md:object-[65%_center] scale-[1.03]"
      />
      <div className="absolute inset-0 hero-overlay" />
    </div>

    <div className="container relative z-10 w-full py-16 md:py-28 px-6">
      <div className="reveal-up max-w-2xl text-left">
        <h1 className="font-display text-[clamp(3.25rem,12vw,7.5rem)] font-medium leading-[0.9] tracking-tight text-white mb-6 md:mb-8">
          Amova
        </h1>
        <p className="reveal-up-delay font-display text-xl sm:text-2xl md:text-3xl font-light text-white/95 leading-snug mb-4 max-w-lg">
          Des rencontres vérifiées, entre adultes sérieux.
        </p>
        <p className="reveal-up-delay text-white/65 text-sm sm:text-base max-w-md mb-10 md:mb-12 leading-relaxed font-body">
          Identité validée à la main · Matching homme ↔ femme · Mobile Money
        </p>
        <div className="reveal-up-delay flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <Button variant="hero" size="xl" className="w-full sm:w-auto" asChild>
            <Link to="/auth">Créer mon compte</Link>
          </Button>
          <Button
            variant="hero-outline"
            size="xl"
            className="w-full sm:w-auto border-white/25 text-white hover:bg-white/10 hover:border-white/40"
            asChild
          >
            <a href="#trust">Comment on vérifie</a>
          </Button>
        </div>
      </div>
    </div>
  </section>
);

export default HeroSection;
