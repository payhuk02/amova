import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { CONSUMABLE_LABELS, PLAN_LABELS, type ConsumableSku } from "@/lib/plans";
import type { PlanType } from "@/hooks/useSubscription";

type CallbackStatus = "loading" | "paid" | "pending" | "error";

function isConsumableSku(value: string | null): value is ConsumableSku {
  return Boolean(value && value in CONSUMABLE_LABELS);
}

function isPlanType(value: string | null): value is PlanType {
  return Boolean(value && value in PLAN_LABELS);
}

async function needsKyc(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("is_verified, verification_status")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return true;
  if (data.is_verified) return false;
  if (data.verification_status === "approved") return false;
  return true;
}

export default function PremiumCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const token = searchParams.get("token") || searchParams.get("tokenPay");
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [productKey, setProductKey] = useState<string | null>(null);
  const [redirectingKyc, setRedirectingKyc] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    const verify = async () => {
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: { token },
      });

      if (error || data?.error) {
        setStatus("error");
        return;
      }

      if (data?.status === "paid") {
        const plan = typeof data.plan === "string" ? data.plan : null;
        setProductKey(plan);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["subscription"] }),
          queryClient.invalidateQueries({ queryKey: ["entitlement"] }),
        ]);

        // After a subscription payment, unfinished KYC → verification page
        if (plan && !isConsumableSku(plan) && user?.id) {
          const requireKyc = await needsKyc(user.id);
          if (requireKyc) {
            setRedirectingKyc(true);
            setStatus("paid");
            navigate("/verification", { replace: true });
            return;
          }
        }

        setStatus("paid");
        return;
      }

      setStatus("pending");
    };

    void verify();
  }, [token, queryClient, user?.id, navigate]);

  const successLabel = (() => {
    if (isConsumableSku(productKey)) return CONSUMABLE_LABELS[productKey];
    if (isPlanType(productKey)) return PLAN_LABELS[productKey];
    return null;
  })();

  const isConsumable = isConsumableSku(productKey);

  const continueAfterPayment = async () => {
    if (!isConsumable && user?.id) {
      const requireKyc = await needsKyc(user.id);
      if (requireKyc) {
        navigate("/verification", { replace: true });
        return;
      }
    }
    navigate(isConsumable ? "/liked-me" : "/dashboard");
  };

  return (
    <AppShell>
      <main className="container max-w-md py-16 px-4 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <h1 className="text-xl font-display mb-2">Vérification du paiement...</h1>
            <p className="text-muted-foreground text-sm">Merci de patienter quelques instants.</p>
          </>
        )}

        {status === "paid" && (
          <>
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-display mb-2">Paiement confirmé !</h1>
            <p className="text-muted-foreground mb-6">
              {redirectingKyc
                ? "Redirection vers la vérification d'identité…"
                : isConsumable
                  ? successLabel
                    ? `Votre achat « ${successLabel} » est maintenant actif.`
                    : "Votre achat est maintenant actif."
                  : successLabel
                    ? `Votre abonnement ${successLabel} est maintenant actif.`
                    : "Votre abonnement est maintenant actif."}
            </p>
            {!redirectingKyc && (
              <Button onClick={() => void continueAfterPayment()}>Continuer</Button>
            )}
          </>
        )}

        {status === "pending" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-amber-500" />
            <h1 className="text-xl font-display mb-2">Paiement en cours</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Votre paiement est en traitement. Vous serez notifié dès confirmation.
            </p>
            <Button variant="outline" onClick={() => navigate("/premium")}>
              Retour aux abonnements
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-14 h-14 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-display mb-2">Paiement non confirmé</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Nous n'avons pas pu confirmer votre paiement. Réessayez ou contactez le support.
            </p>
            <Button onClick={() => navigate("/premium")}>Réessayer</Button>
          </>
        )}
      </main>
    </AppShell>
  );
}
