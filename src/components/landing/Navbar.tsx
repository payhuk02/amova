import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#trust", label: "Confiance" },
  { href: "#how", label: "Parcours" },
  { href: "#features", label: "Ce qui compte" },
  { href: "#pricing", label: "Tarifs" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled || open
          ? "border-b border-border/40 bg-background/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="container flex h-[4.25rem] items-center justify-between">
        <a
          href="/"
          className="flex items-center gap-2.5 text-foreground hover:opacity-90 transition-opacity"
        >
          <Logo variant="mark" className="h-8 w-8" />
          <span
            className={cn(
              "font-display text-xl font-medium tracking-tight hidden sm:inline",
              !scrolled && !open && "text-white",
            )}
          >
            Amova
          </span>
        </a>

        <div className="hidden lg:flex items-center gap-9">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={cn(
                "text-[13px] tracking-wide transition-colors",
                scrolled
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-white/70 hover:text-white",
              )}
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="hidden lg:flex items-center gap-3">
          <ThemeToggle
            className={
              scrolled ? undefined : "text-white/70 hover:text-white hover:bg-white/10"
            }
          />
          {user ? (
            <Button variant="default" size="sm" onClick={() => navigate("/dashboard")}>
              Mon espace
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  scrolled ? "text-muted-foreground" : "text-white/80 hover:text-white hover:bg-white/10",
                )}
                onClick={() => navigate("/auth")}
              >
                Connexion
              </Button>
              <Button variant="default" size="sm" onClick={() => navigate("/auth")}>
                Rejoindre
              </Button>
            </>
          )}
        </div>

        <div className="flex lg:hidden items-center gap-1">
          <ThemeToggle
            className={
              scrolled || open ? undefined : "text-white/80 hover:text-white hover:bg-white/10"
            }
          />
          <button
            onClick={() => setOpen(!open)}
            className={cn("p-2", scrolled || open ? "text-foreground" : "text-white")}
            aria-label="Menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border/30 bg-background/95 backdrop-blur-xl animate-in slide-in-from-top-2 duration-200">
          <div className="container py-6 flex flex-col gap-4">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-base text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                {l.label}
              </a>
            ))}
            <div className="flex gap-3 pt-4 border-t border-border/30">
              {user ? (
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setOpen(false);
                    navigate("/dashboard");
                  }}
                >
                  Mon espace
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground flex-1"
                    onClick={() => {
                      setOpen(false);
                      navigate("/auth");
                    }}
                  >
                    Connexion
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setOpen(false);
                      navigate("/auth");
                    }}
                  >
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
