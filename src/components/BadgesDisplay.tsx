import { useBadges, BADGE_CONFIG } from "@/hooks/useBadges";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface BadgesDisplayProps {
  userId: string;
  compact?: boolean;
}

const BadgesDisplay = ({ userId, compact = false }: BadgesDisplayProps) => {
  const { badges, loading } = useBadges(userId);

  if (loading || badges.length === 0) return null;

  return (
    <div className={`flex flex-wrap ${compact ? "gap-1" : "gap-1.5"}`}>
      {badges.map((badge) => {
        const config = BADGE_CONFIG[badge.badge_type];
        if (!config) return null;

        return (
          <Tooltip key={badge.badge_type}>
            <TooltipTrigger asChild>
              <span
                className={`inline-flex items-center gap-1 rounded-full border font-medium backdrop-blur-sm ${
                  compact ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
                } border-border/50 bg-secondary/60 text-foreground/80 cursor-default transition-colors hover:bg-champagne/10 hover:border-champagne/25`}
              >
                <span>{config.emoji}</span>
                {!compact && <span>{config.label}</span>}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{config.emoji} {config.label}</p>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};

export default BadgesDisplay;
