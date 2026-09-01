import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const STORAGE_KEY = "amova_cookie_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 safe-area-bottom animate-in slide-in-from-bottom duration-300">
      <div className="container max-w-3xl mx-auto">
        <div className="glass-card rounded-xl p-4 md:p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center shadow-premium border-champagne/20">
          <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
            Amova utilise des cookies essentiels et des données locales pour la sécurité, les
            préférences et l&apos;amélioration du service. En continuant, vous acceptez notre{" "}
            <Link to="/confidentialite" className="text-champagne hover:underline">
              politique de confidentialité
            </Link>
            .
          </p>
          <div className="flex gap-2 shrink-0 w-full sm:w-auto">
            <Button variant="hero" size="sm" onClick={accept} className="flex-1 sm:flex-none">
              Accepter
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={accept}
              className="shrink-0"
              aria-label="Fermer"
            >
              <X size={18} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
