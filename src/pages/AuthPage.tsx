import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getErrorMessage } from "@/lib/supabase-helpers";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Logo from "@/components/Logo";
import Atmosphere from "@/components/landing/Atmosphere";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/** Safe in-app return path after login (blocks open redirects). */
function safeReturnPath(from: unknown): string {
  if (typeof from !== "string") return "/dashboard";
  if (!from.startsWith("/") || from.startsWith("//")) return "/dashboard";
  if (from.startsWith("/auth")) return "/dashboard";
  return from;
}

const AuthPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [confirmAdult, setConfirmAdult] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = safeReturnPath((location.state as { from?: string } | null)?.from);

  useEffect(() => {
    if (!authLoading && user) {
      navigate(returnTo, { replace: true });
    }
  }, [authLoading, user, navigate, returnTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!isLogin && password.length < 8) {
        throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
      }

      if (!isLogin && password !== confirmPassword) {
        throw new Error("Les mots de passe ne correspondent pas.");
      }

      if (!isLogin && !acceptedTerms) {
        throw new Error("Veuillez accepter les conditions d'utilisation.");
      }

      if (!isLogin && !confirmAdult) {
        throw new Error("Vous devez confirmer avoir 18 ans ou plus.");
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Connexion réussie");
        trackEvent("Login");
        navigate(returnTo, { replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });
        if (error) throw error;
        trackEvent("Signup");

        if (data.session) {
          toast.success("Inscription réussie — bienvenue sur Amova");
          navigate("/profile-setup");
          return;
        }

        toast.success("Compte créé. Vérifiez votre e-mail pour confirmer, puis connectez-vous.");
        setIsLogin(true);
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="amova-canvas min-h-[100dvh] flex flex-col safe-area-top safe-area-bottom">
      <Atmosphere />
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between mb-8 sm:mb-10">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
            >
              <ArrowLeft size={16} />
              Accueil
            </Link>
            <Logo variant="mark" className="opacity-90" />
          </div>

          <p className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-foreground mb-2">
            Amova
          </p>
          <div className="hairline w-16 mb-5" aria-hidden />
          <h1 className="font-display text-xl sm:text-2xl font-normal italic text-foreground/90 mb-2">
            {isLogin ? "Connexion" : "Créer un compte"}
          </h1>
          <p className="text-muted-foreground text-sm mb-6 sm:mb-8 leading-relaxed">
            {isLogin
              ? "Connectez-vous à votre espace Amova."
              : "Créez votre compte pour des rencontres vérifiées."}
          </p>

          {!isLogin && (
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed border-l-2 border-brand/50 pl-3">
              18 ans et plus · Matching homme ↔ femme · Identité contrôlée à la main
            </p>
          )}

          <div
            className="flex mb-6 p-1 rounded-xl bg-secondary/50 border border-border/40"
            role="tablist"
            aria-label="Mode d’authentification"
          >
            <button
              type="button"
              role="tab"
              aria-selected={isLogin}
              onClick={() => setIsLogin(true)}
              className={cn(
                "flex-1 h-10 rounded-lg text-sm font-medium transition-colors touch-manipulation",
                isLogin
                  ? "bg-background text-foreground shadow-premium-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Connexion
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isLogin}
              onClick={() => setIsLogin(false)}
              className={cn(
                "flex-1 h-10 rounded-lg text-sm font-medium transition-colors touch-manipulation",
                !isLogin
                  ? "bg-background text-foreground shadow-premium-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Inscription
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                autoComplete="email"
                className="h-11 sm:h-12 bg-secondary/50 border-border/50 focus:border-primary/50 text-base"
              />
            </div>
            <div>
              <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">Mot de passe</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  className="h-11 sm:h-12 bg-secondary/50 border-border/50 focus:border-primary/50 pr-12 text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors touch-manipulation p-1"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">
                  Confirmer le mot de passe
                </label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="h-11 sm:h-12 bg-secondary/50 border-border/50 focus:border-primary/50 text-base"
                />
              </div>
            )}

            {!isLogin && (
              <div className="space-y-2.5 pt-1">
                <label className="flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmAdult}
                    onChange={(e) => setConfirmAdult(e.target.checked)}
                    className="mt-0.5 rounded border-border"
                  />
                  <span>Je confirme avoir 18 ans ou plus.</span>
                </label>
                <label className="flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 rounded border-border"
                  />
                  <span>
                    J&apos;accepte les{" "}
                    <Link to="/conditions" className="text-brand hover:underline">
                      conditions
                    </Link>{" "}
                    et la{" "}
                    <Link to="/confidentialite" className="text-brand hover:underline">
                      politique de confidentialité
                    </Link>
                    .
                  </span>
                </label>
              </div>
            )}

            <Button variant="hero" size="xl" className="w-full touch-manipulation mt-1" disabled={loading}>
              {loading ? "Chargement..." : isLogin ? "Se connecter" : "Créer mon compte"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
