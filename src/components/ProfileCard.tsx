import { User, MapPin, MessageCircle, Heart, Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrustBadge, OnlineStatus, InterestTag } from "@/components/TrustBadge";
import { isOnline, formatLastSeen } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";

export interface ProfileCardData {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  age: number | null;
  city: string | null;
  bio: string | null;
  interests?: string[] | null;
  last_seen?: string | null;
  is_verified?: boolean;
}

interface ProfileCardProps {
  profile: ProfileCardData;
  isLiked?: boolean;
  isMatched?: boolean;
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
  onLike,
  onMessage,
  onViewProfile,
  onReport,
  className,
}: ProfileCardProps) {
  const online = profile.last_seen ? isOnline(profile.last_seen) : false;

  return (
    <article
      className={cn(
        "glass-card rounded-2xl overflow-hidden group hover:border-champagne/20 transition-all duration-300",
        className,
      )}
    >
      {/* Photo */}
      <div className="aspect-[4/3] bg-secondary/30 relative">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="w-14 h-14 text-muted-foreground/25" strokeWidth={1} />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-card via-card/60 to-transparent" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {profile.last_seen && (
            <OnlineStatus online={online} compact />
          )}
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

      {/* Info */}
      <div className="p-4 sm:p-5">
        <h3 className="font-display text-lg sm:text-xl font-medium mb-1">
          {onViewProfile ? (
            <button onClick={onViewProfile} className="hover:text-champagne transition-colors text-left">
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

        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-2">
          {profile.city && (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {profile.city}
            </span>
          )}
          {profile.last_seen && (
            <span className="text-[10px] sm:text-[11px] text-muted-foreground/70">
              {formatLastSeen(profile.last_seen)}
            </span>
          )}
        </div>

        {profile.interests && profile.interests.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {profile.interests.slice(0, 3).map((interest) => (
              <InterestTag key={interest}>{interest}</InterestTag>
            ))}
            {profile.interests.length > 3 && (
              <InterestTag className="text-muted-foreground">
                +{profile.interests.length - 3}
              </InterestTag>
            )}
          </div>
        )}

        {profile.bio && (
          <p className="text-xs sm:text-sm text-foreground/70 leading-relaxed line-clamp-2 mb-4">
            {profile.bio}
          </p>
        )}

        {(onLike || onMessage) && (
          <div className="flex gap-2">
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
