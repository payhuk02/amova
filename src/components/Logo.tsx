import { cn } from "@/lib/utils";

type LogoVariant = "full" | "compact" | "mark";

interface LogoProps {
  variant?: LogoVariant;
  className?: string;
}

const variantClass: Record<LogoVariant, string> = {
  full: "h-16 w-auto",
  compact: "h-11 w-auto",
  mark: "h-9 w-9",
};

export default function Logo({ variant = "full", className }: LogoProps) {
  const src = variant === "mark" ? "/icon.png" : "/logo.png";
  const alt =
    variant === "mark"
      ? "Amova"
      : "Amova — Rencontres sincères, histoires vraies";

  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        "object-contain shrink-0",
        variantClass[variant],
        className,
      )}
      decoding="async"
    />
  );
}
