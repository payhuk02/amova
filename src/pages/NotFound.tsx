import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative min-h-[100dvh] flex flex-col items-center justify-center px-6 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,hsl(330_60%_30%/0.25),transparent_55%),radial-gradient(ellipse_at_80%_80%,hsl(285_50%_25%/0.35),transparent_50%)]"
        aria-hidden
      />
      <div className="relative z-10 max-w-md w-full text-center space-y-6">
        <Link to="/" className="inline-flex justify-center">
          <Logo variant="compact" className="mx-auto" />
        </Link>
        <p className="font-display text-7xl sm:text-8xl font-light text-foreground/90 tracking-tight">
          404
        </p>
        <div className="space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-light text-foreground">
            Page introuvable
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Cette adresse n&apos;existe pas sur Amova. Revenez à l&apos;accueil pour continuer.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild variant="default" size="lg" className="touch-manipulation">
            <Link to="/">Accueil</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-border/50 touch-manipulation">
            <Link to="/auth">Connexion</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
