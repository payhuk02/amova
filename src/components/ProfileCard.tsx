import { User, MapPin, MessageCircle, Heart, Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrustBadge, OnlineStatus, InterestTag } from "@/components/TrustBadge";
import { isOnline, formatLastSeen } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";
import BlurredPhoto from "@/components/BlurredPhoto";

export interface ProfileCardData {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  age: number | null;
  city: string | null;
  country?: string | null;
  bio: string | null;
  occupation?: string | null;
  interests?: string[] | null;
  last_seen?: string | null;
  is_verified?: boolean;
}

interface ProfileCardProps {
  profile: ProfileCardData;
  isLiked?: boolean;
  isMatched?: boolean;
  /** Blur photo for free plan (clear when Plus+ or match). */
  blurPhoto?: boolean;
  onLike?: () => void;
  onMessage?: () => void;
  onViewProfile?: () => void;
  onReport?: () => void;
  className?: string;
}

export default function ProfileCard({
  profile,
  isLiked,
  isMatched,
  blurPhoto = false,
  onLike,
  onMessage,
  onViewProfile,
  onReport,
  className,
}: ProfileCardProps) {
  const online = profile.last_seen ? isOnline(profile.last_seen) : false;
  const shouldBlur = blurPhoto && !isMatched;
  const place = [profile.city, profile.country].filter(Boolean).join(", ");

  return (
    <article
      className={cn(
        "rounded-2xl overflow-hidden border border-border/50 bg-card group hover:border-border transition-colors duration-200",
        "flex flex-col h-full min-h-[420px]",
        className,
      )}
    >
      {/* Photo — fixed ratio for equal cards */}
      <div className="aspect-[4/3] bg-secondary/30 relative shrink-0">
        {profile.avatar_url ? (
          <BlurredPhoto
            src={profile.avatar_url}
            blurred={shouldBlur}
            className="w-full h-full"
            showLock={shouldBlur}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="w-14 h-14 text-muted-foreground/25" strokeWidth={1} />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-card via-card/60 to-transparent" />

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {profile.last_seen && <OnlineStatus online={online} compact />}
        </div>

        <div className="absolute top-3 right-3 flex flex-wrap gap-1.5 justify-end">
          {profile.is_verified && <TrustBadge variant="verified" compact />}
          {isMatched && <TrustBadge variant="match" compact />}
        </div>

        {onReport && (
          <button
            onClick={onReport}
            className="absolute bottom-3 right-3 sm:opacity-0 sm:group-hover:opacity-100 w-8 h-8 rounded-full bg-background/70 backdrop-blur-sm border border-border/50 flex items-center justify-center text-muted-foreground hover:text-destructive transition-all"
            title="Signaler"
          >
            <Shield size={14} />
          </button>
        )}
      </div>

      {/* Info — grows; actions pinned bottom */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 min-h-0">
        <h3 className="font-display text-lg sm:text-xl font-medium mb-1 truncate">
          {onViewProfile ? (
            <button onClick={onViewProfile} className="hover:text-champagne transition-colors text-left truncate max-w-full">
              {profile.display_name}
              {profile.age && (
                <span className="text-muted-foreground font-light">, {profile.age}</span>
              )}
            </button>
          ) : (
            <>
              {profile.display_name}
              {profile.age && (
                <span className="text-muted-foreground font-light">, {profile.age}</span>
              )}
            </>
          )}
        </h3>

        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-2 min-h-[1.25rem]">
          {place ? (
            <span className="flex items-center gap-1 truncate">
              <MapPin size={12} className="shrink-0" />
              <span className="truncate">{place}</span>
            </span>
          ) : (
            <span className="opacity-0">—</span>
          )}
          {profile.last_seen && (
            <span className="text-[10px] sm:text-[11px] text-muted-foreground/70 shrink-0">
              {formatLastSeen(profile.last_seen)}
            </span>
          )}
        </div>

        {profile.occupation && (
          <p className="text-[11px] text-muted-foreground/80 mb-2 truncate">{profile.occupation}</p>
        )}

        <div className="flex flex-wrap gap-1 mb-2 min-h-[1.5rem]">
          {profile.interests && profile.interests.length > 0 ? (
            <>
              {profile.interests.slice(0, 3).map((interest) => (
                <InterestTag key={interest}>{interest}</InterestTag>
              ))}
              {profile.interests.length > 3 && (
                <InterestTag className="text-muted-foreground">
                  +{profile.interests.length - 3}
                </InterestTag>
              )}
            </>
          ) : null}
        </div>

        <p className="text-xs sm:text-sm text-foreground/70 leading-relaxed line-clamp-2 min-h-[2.5rem] mb-4">
          {profile.bio?.trim() || "\u00A0"}
        </p>

        {(onLike || onMessage) && (
          <div className="flex gap-2 mt-auto pt-1">
            {onLike && (
              <Button
                variant={isLiked ? "default" : "hero-outline"}
                size="sm"
                className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
                onClick={onLike}
              >
                {isLiked ? <Check size={14} /> : <Heart size={14} />}
                {isLiked ? "Aimé" : "J'aime"}
              </Button>
            )}
            {isMatched && onMessage && (
              <Button variant="trust" size="sm" className="h-9 sm:h-10" onClick={onMessage}>
                <MessageCircle size={14} />
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
