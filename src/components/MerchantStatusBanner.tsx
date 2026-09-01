import { AlertCircle, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MerchantStatusBanner() {
  return (
    <div className="mb-6 p-4 rounded-xl border border-amber-500/25 bg-amber-500/10">
      <div className="flex gap-3">
        <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
        <div className="space-y-2 text-sm">
          <p className="font-medium text-foreground">Activation des paiements Moneyfusion</p>
          <p className="text-muted-foreground leading-relaxed">
            Si le paiement affiche « Application non approuvée », le compte marchand doit être validé
            par Moneyfusion. Ce n&apos;est pas un bug de l&apos;application.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild className="h-8 text-xs">
              <a href="mailto:contact@moneyfusion.net">
                <Mail size={14} />
                Contacter Moneyfusion
              </a>
            </Button>
            <Button variant="ghost" size="sm" asChild className="h-8 text-xs">
              <a href="https://moneyfusion.net" target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} />
                moneyfusion.net
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
