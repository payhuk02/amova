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
import {
  PLAN_LABELS,
  CONSUMABLE_LABELS,
  CONSUMABLE_PRICES,
  BILLING_PERIODS,
  getSubscriptionAmount,
  formatFcfa,
  type ConsumableSku,
  type BillingPeriod,
} from "@/lib/plans";
import PaymentReassurance from "@/components/PaymentReassurance";
import { trackEvent } from "@/lib/analytics";

interface PaymentCheckoutDialogProps {
  plan?: Exclude<PlanType, "free"> | null;
  productSku?: ConsumableSku | null;
  billingPeriod?: BillingPeriod;
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
  plan = null,
  productSku = null,
  billingPeriod = "monthly",
  open,
  onOpenChange,
  isRenewal = false,
}: PaymentCheckoutDialogProps) {
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(false);

  const isConsumable = Boolean(productSku);
  const periodMeta = BILLING_PERIODS[billingPeriod];
  const title = isConsumable
    ? CONSUMABLE_LABELS[productSku!]
    : plan
      ? `${isRenewal ? "Renouveler" : "Paiement"} ${PLAN_LABELS[plan]}`
      : "";
  const priceLabel = isConsumable
    ? formatFcfa(CONSUMABLE_PRICES[productSku!])
    : plan
      ? `${formatFcfa(getSubscriptionAmount(plan, billingPeriod))} — ${periodMeta.label}${
          isRenewal ? ` (prolongation ${periodMeta.days} j)` : ""
        }`
      : "";

  const handlePay = async () => {
    if (!user) return;
    if (!isConsumable && !plan) return;
    if (!phone.trim() || !clientName.trim()) {
      toast.error("Veuillez renseigner votre nom et numéro de téléphone");
      return;
    }

    setLoading(true);
    try {
      const body = isConsumable
        ? {
            productSku,
            phone: phone.trim(),
            clientName: clientName.trim(),
          }
        : {
            plan,
            phone: phone.trim(),
            clientName: clientName.trim(),
            isRenewal,
            billingPeriod,
          };

      const { data, error } = await supabase.functions.invoke("create-payment", { body });

      if (error) {
        throw new Error(await getInvokeErrorMessage(error));
      }
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("URL de paiement indisponible");

      trackEvent(
        isConsumable ? "Consumable Checkout" : isRenewal ? "Renewal Checkout" : "Premium Checkout",
        isConsumable ? { productSku } : { plan, billingPeriod },
      );

      window.location.href = data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : await getInvokeErrorMessage(err);
      toast.error(message, { duration: 6000 });
      setLoading(false);
    }
  };

  if (!plan && !productSku) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
          <DialogDescription>{priceLabel}</DialogDescription>
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

          <PaymentReassurance />

          <Button onClick={handlePay} disabled={loading} className="w-full" variant="default">
            {loading ? "Redirection…" : "Payer maintenant"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
