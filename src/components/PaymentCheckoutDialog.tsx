import { useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { PlanType } from "@/hooks/useSubscription";
import { PLAN_LABELS, PLAN_PRICES } from "@/lib/plans";
import PaymentReassurance from "@/components/PaymentReassurance";
import { trackEvent } from "@/lib/analytics";

interface PaymentCheckoutDialogProps {
  plan: Exclude<PlanType, "free"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isRenewal?: boolean;
}

async function getInvokeErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error) return String(body.error);
    } catch {
      // ignore parse errors
    }
  }
  if (error instanceof Error) return error.message;
  return "Erreur de paiement";
}

export default function PaymentCheckoutDialog({
  plan,
  open,
  onOpenChange,
  isRenewal = false,
}: PaymentCheckoutDialogProps) {
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (!plan || !user) return;
    if (!phone.trim() || !clientName.trim()) {
      toast.error("Veuillez renseigner votre nom et numéro de téléphone");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: {
          plan,
          phone: phone.trim(),
          clientName: clientName.trim(),
          isRenewal,
        },
      });

      if (error) {
        throw new Error(await getInvokeErrorMessage(error));
      }
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("URL de paiement indisponible");

      trackEvent(isRenewal ? "Renewal Checkout" : "Premium Checkout", { plan });

      window.location.href = data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : await getInvokeErrorMessage(err);
      toast.error(message, { duration: 6000 });
      setLoading(false);
    }
  };

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isRenewal ? "Renouveler" : "Paiement"} {PLAN_LABELS[plan]}
          </DialogTitle>
          <DialogDescription>
            {PLAN_PRICES[plan].toLocaleString("fr-FR")} FCFA / mois
            {isRenewal && " — prolongation de 30 jours"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="clientName">Nom complet</Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Votre nom"
              className="mt-1.5 bg-secondary/30"
            />
          </div>
          <div>
            <Label htmlFor="phone">Numéro de téléphone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07 XX XX XX XX"
              className="mt-1.5 bg-secondary/30"
            />
          </div>

          <PaymentReassurance compact />

          <Button variant="hero" className="w-full" onClick={handlePay} disabled={loading}>
            {loading ? "Redirection..." : "Payer maintenant"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
