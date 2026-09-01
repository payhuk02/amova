import { cn } from "@/lib/utils";
import { ShieldCheck, Crown, Star, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type TrustBadgeVariant = "verified" | "premium" | "super" | "match" | "compatibility";

const variantStyles: Record<TrustBadgeVariant, string> = {
  verified: "bg-trust/15 text-trust border-trust/25",
  premium: "bg-champagne/15 text-champagne border-champagne/25",
  super: "bg-champagne/20 text-champagne-light border-champagne/30",
  match: "bg-success/15 text-success border-success/25",
  compatibility: "bg-secondary/80 text-foreground border-border/50",
};

const variantIcons: Record<TrustBadgeVariant, LucideIcon> = {
  verified: ShieldCheck,
  premium: Crown,
  super: Star,
  match: Sparkles,
  compatibility: Sparkles,
};

const variantLabels: Record<TrustBadgeVariant, string> = {
  verified: "Vérifié",
  premium: "Premium",
  super: "Super Like",
  match: "Match",
  compatibility: "",
};

interface TrustBadgeProps {
  variant: TrustBadgeVariant;
  label?: string;
  compact?: boolean;
  className?: string;
}

export function TrustBadge({ variant, label, compact, className }: TrustBadgeProps) {
  const Icon = variantIcons[variant];
  const text = label ?? variantLabels[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium backdrop-blur-sm",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        variantStyles[variant],
        className,
      )}
    >
      <Icon size={compact ? 10 : 12} strokeWidth={2} />
      {text && <span>{text}</span>}
    </span>
  );
}

interface OnlineStatusProps {
  online: boolean;
  label?: string;
  compact?: boolean;
  className?: string;
}

export function OnlineStatus({ online, label, compact, className }: OnlineStatusProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium backdrop-blur-sm",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        online
          ? "bg-success/15 text-success border-success/25"
          : "bg-secondary/80 text-muted-foreground border-border/50",
        className,
      )}
    >
      <span
        className={cn(
          "rounded-full shrink-0",
          compact ? "w-1.5 h-1.5" : "w-2 h-2",
          online ? "bg-success animate-pulse" : "bg-muted-foreground/40",
        )}
      />
      {label && <span>{label}</span>}
    </span>
  );
}

interface InterestTagProps {
  children: React.ReactNode;
  className?: string;
}

export function InterestTag({ children, className }: InterestTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full bg-secondary/60 border border-border/40 text-[10px] sm:text-[11px] font-medium text-foreground/75",
        className,
      )}
    >
      {children}
    </span>
  );
}
