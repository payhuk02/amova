import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import { FOOTER_COUNTRIES_PREVIEW, SEO_COUNTRIES } from "@/lib/seo";

const Footer = () => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded
    ? SEO_COUNTRIES
    : SEO_COUNTRIES.slice(0, FOOTER_COUNTRIES_PREVIEW);
  const hasMore = SEO_COUNTRIES.length > FOOTER_COUNTRIES_PREVIEW;

  return (
    <footer className="border-t border-border bg-surface py-12 md:py-14">
      <div className="container space-y-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <Logo variant="mark" className="h-9 w-9" />
            <div>
              <p className="font-display text-lg font-medium tracking-tight text-foreground">
                Amova
              </p>
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
            <Link
              to="/verification-identite"
              className="hover:text-foreground transition-colors"
            >
              Vérification
            </Link>
            <Link to="/rencontres" className="hover:text-foreground transition-colors">
              Pays
            </Link>
            <Link to="/video" className="hover:text-foreground transition-colors">
              Vidéo
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
            <Link
              to="/confidentialite"
              className="hover:text-foreground transition-colors"
            >
              Confidentialité
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground">
            © 2026 Amova. Tous droits réservés.
          </p>
        </div>

        <nav aria-label="Rencontres par pays" className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 font-medium">
            Pays couverts
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {visible.map((c) => (
              <Link
                key={c.slug}
                to={`/rencontres/${c.slug}`}
                className="hover:text-foreground transition-colors"
              >
                {c.name}
              </Link>
            ))}
            {hasMore && !expanded && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="font-semibold text-brand hover:text-brand/80 transition-colors"
              >
                Suite
              </button>
            )}
            {expanded && (
              <>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Réduire
                </button>
                <Link
                  to="/rencontres"
                  className="font-semibold text-brand hover:text-brand/80 transition-colors"
                >
                  Voir la page Pays
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
