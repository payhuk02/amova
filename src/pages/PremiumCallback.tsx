import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { PLAN_LABELS } from "@/lib/plans";
import type { PlanType } from "@/hooks/useSubscription";

type CallbackStatus = "loading" | "paid" | "pending" | "error";

export default function PremiumCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = searchParams.get("token") || searchParams.get("tokenPay");
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [plan, setPlan] = useState<PlanType | null>(null);

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
        setPlan(data.plan as PlanType);
        setStatus("paid");
        queryClient.invalidateQueries({ queryKey: ["subscription"] });
        return;
      }

      setStatus("pending");
    };

    verify();
  }, [token, queryClient]);

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
              Votre abonnement {plan ? PLAN_LABELS[plan] : ""} est maintenant actif.
            </p>
            <Button onClick={() => navigate("/dashboard")}>Continuer</Button>
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
