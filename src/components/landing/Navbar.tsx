import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

const navLinks = [
  { href: "#how", label: "Comment ça marche" },
  { href: "#features", label: "Fonctionnalités" },
  { href: "#pricing", label: "Tarifs" },
  { href: "#testimonials", label: "Témoignages" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <a href="/" className="flex items-center gap-2 font-display text-2xl font-semibold tracking-wide text-foreground">
          <img src="/logo.png" alt="Amova" className="h-8 w-8 object-contain" />
          Amova
        </a>

        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </a>
          ))}
        </div>
        <div className="hidden lg:flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <Button variant="default" size="sm" onClick={() => navigate("/dashboard")}>
              Mon espace
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => navigate("/auth")}>
                Connexion
              </Button>
              <Button variant="default" size="sm" onClick={() => navigate("/auth")}>
                Rejoindre
              </Button>
            </>
          )}
        </div>

        <button onClick={() => setOpen(!open)} className="lg:hidden p-2 text-foreground" aria-label="Menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border/30 bg-background/95 backdrop-blur-xl animate-in slide-in-from-top-2 duration-200">
          <div className="container py-6 flex flex-col gap-4">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-base text-muted-foreground hover:text-foreground transition-colors py-2">
                {l.label}
              </a>
            ))}
            <div className="flex gap-3 pt-4 border-t border-border/30">
              {user ? (
                <Button variant="default" size="sm" className="flex-1" onClick={() => { setOpen(false); navigate("/dashboard"); }}>
                  Mon espace
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="text-muted-foreground flex-1" onClick={() => { setOpen(false); navigate("/auth"); }}>
                    Connexion
                  </Button>
                  <Button variant="default" size="sm" className="flex-1" onClick={() => { setOpen(false); navigate("/auth"); }}>
                    Rejoindre
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
