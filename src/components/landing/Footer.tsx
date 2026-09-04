import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

const Footer = () => (
  <footer className="border-t border-border/30 py-10 md:py-12">
    <div className="container">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center">
          <Logo variant="compact" className="h-14 rounded-2xl" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 text-sm text-muted-foreground">
          <Link to="/confidentialite" className="hover:text-foreground transition-colors">Confidentialité</Link>
          <Link to="/conditions" className="hover:text-foreground transition-colors">Conditions</Link>
          <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          <Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
        </div>
        <p className="text-xs text-muted-foreground/50">© 2026 Amova. Tous droits réservés.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
