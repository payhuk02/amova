import { cn } from "@/lib/utils";

type LogoVariant = "full" | "compact" | "mark";

interface LogoProps {
  variant?: LogoVariant;
  className?: string;
}

const variantClass: Record<LogoVariant, string> = {
  full: "h-16 w-auto rounded-2xl",
  compact: "h-11 w-auto rounded-xl",
  mark: "h-9 w-9 rounded-xl",
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
        "object-contain shrink-0 bg-white",
        variantClass[variant],
        className,
      )}
      decoding="async"
    />
  );
}
