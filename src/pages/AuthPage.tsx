import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getErrorMessage } from "@/lib/supabase-helpers";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

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

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, user, navigate]);

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
        navigate("/dashboard");
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

        // Autoconfirm ON: session is returned immediately
        if (data.session) {
          toast.success("Inscription réussie — bienvenue sur Amova");
          navigate("/profile-setup");
          return;
        }

        // Fallback if confirmation email is still required
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
    <div className="min-h-[100dvh] flex flex-col safe-area-top safe-area-bottom">
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 sm:mb-10 touch-manipulation">
          <ArrowLeft size={16} />
          Retour
        </Link>

        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-light mb-2">
          {isLogin ? "Bon retour" : "Rejoignez-nous"}
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base mb-6 sm:mb-8">
          {isLogin
            ? "Accédez à votre espace personnel sécurisé."
            : "Matching homme ↔ femme. Vérification d'identité et Mobile Money."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
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
                className="h-11 sm:h-12 bg-secondary/50 border-border/50 focus:border-primary/50 pr-12 text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors touch-manipulation p-1"
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
                className="h-11 sm:h-12 bg-secondary/50 border-border/50 focus:border-primary/50 text-base"
              />
            </div>
          )}

          <Button variant="hero" size="xl" className="w-full touch-manipulation" disabled={loading}>
            {loading ? "Chargement..." : isLogin ? "Se connecter" : "Créer mon compte"}
          </Button>

          <div className="space-y-2.5">
            {!isLogin && (
              <>
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
                    <Link to="/conditions" className="text-champagne hover:underline">
                      conditions
                    </Link>{" "}
                    et la{" "}
                    <Link to="/confidentialite" className="text-champagne hover:underline">
                      politique de confidentialité
                    </Link>
                    .
                  </span>
                </label>
              </>
            )}
          </div>
        </form>

        <div className="relative my-6 sm:my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-4 text-muted-foreground">ou continuer avec</span>
          </div>
        </div>

        <Button
          variant="outline"
          size="xl"
          className="w-full border-border/50 hover:border-primary/30 touch-manipulation"
          disabled={!isLogin && (!confirmAdult || !acceptedTerms)}
          onClick={async () => {
            if (!isLogin && (!confirmAdult || !acceptedTerms)) {
              toast.error("Confirmez avoir 18 ans et acceptez les conditions avant de continuer.");
              return;
            }
            const { error } = await lovable.auth.signInWithOAuth("google", {
              redirect_uri: `${window.location.origin}/auth`,
            });
            if (error) toast.error(error.message || "Erreur Google");
          }}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </Button>

        <p className="text-center text-xs sm:text-sm text-muted-foreground mt-6 sm:mt-8">
          {isLogin ? "Pas encore membre ?" : "Déjà membre ?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-champagne hover:text-champagne-light transition-colors underline underline-offset-4 touch-manipulation"
          >
            {isLogin ? "Créer un compte" : "Se connecter"}
          </button>
        </p>
      </div>
      </div>
    </div>
  );
};

export default AuthPage;
