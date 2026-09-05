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
    <div className={cn("rounded-2xl border border-border/40 bg-card/50 p-8 sm:p-10 text-center", className)}>
      <div className="w-12 h-12 rounded-xl bg-secondary/60 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-lg sm:text-xl font-medium mb-2">{title}</h3>
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
