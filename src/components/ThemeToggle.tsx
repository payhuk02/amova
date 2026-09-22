import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "amova-color-mode";

const ThemeToggle = ({ className }: { className?: string }) => {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light");
    root.classList.toggle("dark", dark);
    localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
    localStorage.removeItem("amova-theme");
  }, [dark]);

  return (
    <button
      onClick={() => setDark((v) => !v)}
      className={cn(
        "p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors active:scale-95",
        className,
      )}
      aria-label={dark ? "Passer en mode clair" : "Passer en mode sombre"}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

export default ThemeToggle;
