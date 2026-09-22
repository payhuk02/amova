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
        className="hero-kenburns w-full h-full object-cover object-[70%_center] md:object-[65%_center]"
      />
      <div className="absolute inset-0 hero-overlay" />
      <div
        className="absolute inset-0 opacity-[0.07] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />
    </div>

    <div className="container relative z-10 w-full py-20 md:py-32 px-6">
      <div className="reveal-up max-w-2xl text-left">
        <p className="reveal-fade font-body text-[11px] sm:text-xs uppercase tracking-[0.32em] text-gold mb-5 md:mb-7">
          Rencontres sérieuses · Afrique
        </p>

        <h1 className="font-display text-[clamp(3.5rem,13vw,8rem)] font-medium leading-[0.88] tracking-[-0.02em] text-white mb-5 md:mb-7">
          Amova
        </h1>

        <div className="hairline w-24 mb-6 md:mb-8" aria-hidden />

        <p className="reveal-up-delay font-display text-xl sm:text-2xl md:text-[1.75rem] font-normal italic text-white/90 leading-snug mb-4 max-w-lg">
          Des rencontres vérifiées, entre adultes sérieux.
        </p>
        <p className="reveal-up-delay text-white/55 text-sm sm:text-[0.95rem] max-w-md mb-10 md:mb-12 leading-relaxed font-body tracking-wide">
          Identité validée à la main · Matching homme ↔ femme · Mobile Money
        </p>
        <div className="reveal-up-delay-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <Button variant="hero" size="xl" className="w-full sm:w-auto min-w-[200px]" asChild>
            <Link to="/auth">Créer mon compte</Link>
          </Button>
          <Button
            variant="hero-outline"
            size="xl"
            className="w-full sm:w-auto border-white/20 text-white/90 hover:bg-white/[0.06] hover:border-white/35"
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
