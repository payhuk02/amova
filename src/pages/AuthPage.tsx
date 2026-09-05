import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getErrorMessage } from "@/lib/supabase-helpers";
import { supabase } from "@/integrations/supabase/client";
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
