import { useState } from "react";
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

interface PaymentCheckoutDialogProps {
  plan: Exclude<PlanType, "free"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PaymentCheckoutDialog({
  plan,
  open,
  onOpenChange,
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
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("URL de paiement indisponible");

      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de paiement");
      setLoading(false);
    }
  };

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Paiement {PLAN_LABELS[plan]}</DialogTitle>
          <DialogDescription>
            {PLAN_PRICES[plan].toLocaleString("fr-FR")} FCFA / mois via Moneyfusion (Orange Money, MTN, Wave…)
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
              className="mt-1.5"
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
              className="mt-1.5"
            />
          </div>
          <Button className="w-full" onClick={handlePay} disabled={loading}>
            {loading ? "Redirection..." : "Payer maintenant"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
