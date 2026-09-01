import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "hero" | "hero-outline" | "outline" | "trust";
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: EmptyStateAction;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "glass-card rounded-2xl p-8 sm:p-12 text-center border border-border/40",
        className,
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-secondary/50 border border-border/40 flex items-center justify-center mx-auto mb-5">
        <Icon className="w-7 h-7 text-champagne" strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-xl sm:text-2xl font-light mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">{description}</p>
      {action && (
        <Button
          variant={action.variant ?? "hero-outline"}
          size="lg"
          onClick={action.onClick}
          className="mt-6 touch-manipulation"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
