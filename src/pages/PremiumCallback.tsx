import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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

export default function PremiumCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = searchParams.get("token") || searchParams.get("tokenPay");
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [productKey, setProductKey] = useState<string | null>(null);

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
        setProductKey(typeof data.plan === "string" ? data.plan : null);
        setStatus("paid");
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["subscription"] }),
          queryClient.invalidateQueries({ queryKey: ["entitlement"] }),
        ]);
        return;
      }

      setStatus("pending");
    };

    verify();
  }, [token, queryClient]);

  const successLabel = (() => {
    if (isConsumableSku(productKey)) return CONSUMABLE_LABELS[productKey];
    if (isPlanType(productKey)) return PLAN_LABELS[productKey];
    return null;
  })();

  const isConsumable = isConsumableSku(productKey);

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
              {isConsumable
                ? successLabel
                  ? `Votre achat « ${successLabel} » est maintenant actif.`
                  : "Votre achat est maintenant actif."
                : successLabel
                  ? `Votre abonnement ${successLabel} est maintenant actif.`
                  : "Votre abonnement est maintenant actif."}
            </p>
            <Button onClick={() => navigate(isConsumable ? "/liked-me" : "/dashboard")}>
              Continuer
            </Button>
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
