import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

interface BlurredPhotoProps {
  src: string | null | undefined;
  alt?: string;
  /** When true, apply strong blur + lock affordance (free plan). */
  blurred?: boolean;
  className?: string;
  imgClassName?: string;
  draggable?: boolean;
  onClick?: () => void;
  /** Show lock badge overlay when blurred */
  showLock?: boolean;
}

/** Profile photo soft-locked (blurred) for free users until Plus+ or match. */
export default function BlurredPhoto({
  src,
  alt = "",
  blurred = false,
  className,
  imgClassName,
  draggable,
  onClick,
  showLock = true,
}: BlurredPhotoProps) {
  if (!src) return null;

  const handleClick = (e: React.MouseEvent) => {
    if (!onClick) return;
    e.stopPropagation();
    onClick();
  };

  return (
    <div
      className={cn("relative overflow-hidden bg-secondary", onClick && "cursor-pointer", className)}
      onClick={handleClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      onContextMenu={blurred ? (e) => e.preventDefault() : undefined}
    >
      <img
        src={src}
        alt={blurred ? "" : alt}
        draggable={blurred ? false : draggable}
        decoding="async"
        className={cn(
          "w-full h-full object-cover select-none transition-[filter,transform] duration-300",
          blurred && "scale-125 blur-[28px] sm:blur-[36px] pointer-events-none",
          imgClassName,
        )}
        style={blurred ? { filter: "blur(36px) brightness(0.85)" } : undefined}
      />
      {blurred && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ background: "hsla(270, 20%, 8%, 0.45)" }}
          aria-hidden
        >
          {showLock && (
            <div className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg bg-background/90 border border-border">
              <Lock className="w-4 h-4 text-brand" />
              <span className="text-[10px] font-medium text-foreground">Photos réservées</span>
              <span className="text-[9px] text-muted-foreground">Plus ou match pour voir</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
