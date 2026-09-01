import { ShieldCheck, Shield, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const trustItems = [
  { icon: ShieldCheck, label: "Profils vérifiés" },
  { icon: Shield, label: "Modération 24h" },
  { icon: CreditCard, label: "Paiement sécurisé" },
] as const;

interface TrustBarProps {
  compact?: boolean;
  className?: string;
}

export default function TrustBar({ compact, className }: TrustBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-5 gap-y-2",
        compact ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm",
        className,
      )}
      role="list"
      aria-label="Garanties de confiance"
    >
      {trustItems.map(({ icon: Icon, label }) => (
        <span
          key={label}
          role="listitem"
          className="inline-flex items-center gap-1.5 text-muted-foreground"
        >
          <Icon
            size={compact ? 12 : 14}
            className="text-trust shrink-0"
            strokeWidth={2}
            aria-hidden
          />
          <span>{label}</span>
        </span>
      ))}
    </div>
  );
}
