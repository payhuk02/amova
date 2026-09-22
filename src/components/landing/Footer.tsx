import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import { SEO_CITIES } from "@/lib/seo";

const Footer = () => (
  <footer className="border-t border-border bg-surface py-12 md:py-14">
    <div className="container space-y-10">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div className="flex items-center gap-3">
          <Logo variant="mark" className="h-9 w-9" />
          <div>
            <p className="font-display text-lg font-medium tracking-tight text-foreground">Amova</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Rencontres vérifiées en Afrique
            </p>
          </div>
        </div>
        <nav
          aria-label="Liens utiles"
          className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
        >
          <Link to="/tarifs" className="hover:text-foreground transition-colors">
            Tarifs
          </Link>
          <Link to="/verification-identite" className="hover:text-foreground transition-colors">
            Vérification
          </Link>
          <Link to="/rencontres" className="hover:text-foreground transition-colors">
            Villes
          </Link>
          <Link to="/faq" className="hover:text-foreground transition-colors">
            FAQ
          </Link>
          <Link to="/contact" className="hover:text-foreground transition-colors">
            Contact
          </Link>
          <Link to="/conditions" className="hover:text-foreground transition-colors">
            Conditions
          </Link>
          <Link to="/confidentialite" className="hover:text-foreground transition-colors">
            Confidentialité
          </Link>
        </nav>
        <p className="text-xs text-muted-foreground">
          © 2026 Amova. Tous droits réservés.
        </p>
      </div>
      <nav aria-label="Rencontres par ville" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {SEO_CITIES.map((c) => (
          <Link
            key={c.slug}
            to={`/rencontres/${c.slug}`}
            className="hover:text-foreground transition-colors"
          >
            {c.name}
          </Link>
        ))}
      </nav>
    </div>
  </footer>
);

export default Footer;
