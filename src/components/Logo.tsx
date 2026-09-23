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

const sources: Record<
  LogoVariant,
  { webp?: string; png: string; width: number; height: number }
> = {
  full: {
    webp: "/logo.webp",
    png: "/logo.png",
    width: 900,
    height: 790,
  },
  compact: {
    webp: "/logo-compact.webp",
    png: "/logo-compact.png",
    width: 900,
    height: 616,
  },
  mark: {
    webp: undefined,
    png: "/icon.png",
    width: 512,
    height: 512,
  },
};

export default function Logo({ variant = "full", className }: LogoProps) {
  const asset = sources[variant];
  const alt =
    variant === "mark"
      ? "Amova"
      : "Amova — Rencontres sincères, histoires vraies";

  const imgClass = cn(
    "object-contain shrink-0",
    variantClass[variant],
    className,
  );

  if (asset.webp) {
    return (
      <picture>
        <source srcSet={asset.webp} type="image/webp" />
        <img
          src={asset.png}
          alt={alt}
          width={asset.width}
          height={asset.height}
          className={imgClass}
          decoding="async"
        />
      </picture>
    );
  }

  return (
    <img
      src={asset.png}
      alt={alt}
      width={asset.width}
      height={asset.height}
      className={imgClass}
      decoding="async"
    />
  );
}
