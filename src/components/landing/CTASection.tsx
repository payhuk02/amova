import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";

const CTASection = () => (
  <section className="py-24 md:py-32 relative overflow-hidden">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-primary/[0.04] blur-3xl pointer-events-none" />
    <div className="container relative">
      <ScrollReveal className="max-w-2xl mx-auto text-center">
        <p className="text-copper-light text-sm uppercase tracking-[0.25em] mb-4">Prêt à franchir le pas ?</p>
        <h2 className="font-display text-4xl md:text-6xl font-light mb-6 leading-[1.05]">
          Votre histoire <span className="text-gradient-copper italic">commence ici</span>
        </h2>
        <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
          L'accès à Éclipse est limité pour garantir la qualité de chaque rencontre. 
          Soumettez votre candidature et rejoignez un cercle d'exception.
        </p>
        <Button variant="hero" size="xl">
          Demander une invitation
        </Button>
        <p className="text-muted-foreground/60 text-xs mt-6">
          Places limitées · Confidentialité absolue · Annulation à tout moment
        </p>
      </ScrollReveal>
    </div>
  </section>
);

export default CTASection;
