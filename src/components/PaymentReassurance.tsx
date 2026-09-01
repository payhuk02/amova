import { Shield, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentReassuranceProps {
  className?: string;
  compact?: boolean;
}

const methods = ["Orange Money", "MTN", "Wave"];

export default function PaymentReassurance({ className, compact }: PaymentReassuranceProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-secondary/30 p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-trust/15 flex items-center justify-center shrink-0">
          <Shield size={16} className="text-trust" />
        </div>
        <div>
          <p className={cn("font-medium text-foreground", compact ? "text-xs" : "text-sm")}>
            Paiement 100% sécurisé
          </p>
          <p className={cn("text-muted-foreground", compact ? "text-[10px]" : "text-xs")}>
            Transaction chiffrée via Moneyfusion. Aucune donnée bancaire stockée.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {methods.map((method) => (
          <span
            key={method}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/50 bg-background/50 text-muted-foreground font-medium",
              compact ? "text-[10px]" : "text-xs",
            )}
          >
            <CreditCard size={10} className="text-champagne" />
            {method}
          </span>
        ))}
      </div>
    </div>
  );
}
