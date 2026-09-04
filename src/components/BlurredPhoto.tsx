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

/** Profile photo that can be soft-locked (blurred) for free users. */
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

  return (
    <div className={cn("relative overflow-hidden", className)} onClick={onClick}>
      <img
        src={src}
        alt={alt}
        draggable={draggable}
        className={cn(
          "w-full h-full object-cover transition-[filter,transform] duration-300",
          blurred && "scale-110 blur-xl",
          imgClassName,
        )}
      />
      {blurred && (
        <div className="absolute inset-0 bg-background/35 flex items-center justify-center pointer-events-none">
          {showLock && (
            <div className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-full bg-background/70 border border-border/40">
              <Lock className="w-4 h-4 text-champagne" />
              <span className="text-[10px] font-medium text-foreground/80">Plus pour voir</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
