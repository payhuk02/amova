import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

const Footer = () => (
  <footer className="border-t border-border bg-surface py-12 md:py-14">
    <div className="container">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div className="flex items-center gap-3">
          <Logo variant="mark" className="h-9 w-9" />
          <div>
            <p className="font-display text-lg font-medium tracking-tight text-foreground">Amova</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Rencontres vérifiées
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-6 md:gap-8 text-sm text-muted-foreground">
          <Link to="/confidentialite" className="hover:text-foreground transition-colors">
            Confidentialité
          </Link>
          <Link to="/conditions" className="hover:text-foreground transition-colors">
            Conditions
          </Link>
          <Link to="/contact" className="hover:text-foreground transition-colors">
            Contact
          </Link>
          <Link to="/faq" className="hover:text-foreground transition-colors">
            FAQ
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          © 2026 Amova. Tous droits réservés.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
