import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

const ThemeToggle = () => {
  const [light, setLight] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("eclipse-theme") === "light";
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("light", light);
    localStorage.setItem("eclipse-theme", light ? "light" : "dark");
  }, [light]);

  return (
    <button
      onClick={() => setLight(!light)}
      className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors active:scale-95"
      aria-label={light ? "Passer en mode sombre" : "Passer en mode clair"}
    >
      {light ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
};

export default ThemeToggle;
