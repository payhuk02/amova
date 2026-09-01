import Logo from "@/components/Logo";

const Footer = () => (
  <footer className="border-t border-border/30 py-10 md:py-12">
    <div className="container">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center">
          <Logo variant="compact" className="h-10" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">Confidentialité</a>
          <a href="#" className="hover:text-foreground transition-colors">Conditions</a>
          <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          <a href="#" className="hover:text-foreground transition-colors">FAQ</a>
        </div>
        <p className="text-xs text-muted-foreground/50">© 2026 Amova. Tous droits réservés.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
