import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Heart, User, MapPin, MessageCircle, ShieldCheck, Eye, Sparkles, Check } from "lucide-react";
import AppShell from "@/components/AppShell";
import ScrollReveal from "@/components/ScrollReveal";
import EmptyState from "@/components/ui/empty-state";
import { isOnline, formatLastSeen } from "@/hooks/useOnlineStatus";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface LikerProfile {
  like_id: string;
  user_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  age: number | null;
  city: string | null;
  bio: string | null;
  interests: string[] | null;
  is_verified: boolean;
  last_seen: string | null;
  liked_at: string;
  is_super: boolean;
  is_revealed: boolean;
}

const LikedMe = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { limits } = useSubscription();
  const canSeeWhoLiked = limits.canSeeWhoLiked;
  const [likers, setLikers] = useState<LikerProfile[]>([]);
  const [likedBackIds, setLikedBackIds] = useState<Set<string>>(new Set());
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data: incomingLikers, error } = await supabase.rpc("get_incoming_likers");

      if (error) {
        toast.error("Impossible de charger les likes");
        setLoading(false);
        return;
      }

      if (!incomingLikers || incomingLikers.length === 0) {
        setLoading(false);
        return;
      }

      const revealedLikers = incomingLikers.filter((l) => l.user_id);
      const likerIds = revealedLikers.map((l) => l.user_id!);

      let likedBack = new Set<string>();
      if (likerIds.length > 0) {
        const { data: myLikes } = await supabase
          .from("likes")
          .select("to_user_id")
          .eq("from_user_id", user.id)
          .in("to_user_id", likerIds);

        likedBack = new Set((myLikes || []).map((l) => l.to_user_id));
      }

      setLikedBackIds(likedBack);
      setMatchedIds(new Set(likedBack));

      setLikers(incomingLikers as LikerProfile[]);
      setLoading(false);
    };

    load();
  }, [user]);

  const handleLikeBack = useCallback(
    async (toUserId: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("likes")
        .insert({ from_user_id: user.id, to_user_id: toUserId });

      if (!error) {
        setLikedBackIds((prev) => new Set(prev).add(toUserId));
        setMatchedIds((prev) => new Set(prev).add(toUserId));
        toast.success("C'est un match ! 🎉");
      }
    },
    [user]
  );

  if (loading) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="container max-w-2xl py-4 sm:py-6 md:py-8 px-3 sm:px-4 md:px-6">
        <ScrollReveal>
          <div className="mb-5 sm:mb-6 md:mb-8">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-light mb-0.5 sm:mb-1">
              Qui m'a <span className="text-gradient-copper italic">aimé(e)</span>
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              {likers.length} personne{likers.length > 1 ? "s" : ""} {likers.length > 1 ? "ont" : "a"} aimé votre profil
            </p>
            {!canSeeWhoLiked && likers.length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-sm text-foreground mb-3">
                  Passez Premium pour voir qui vous a aimé et réagir plus vite.
                </p>
                <Button variant="hero" size="sm" onClick={() => navigate("/premium")}>
                  Débloquer Premium
                </Button>
              </div>
            )}
          </div>
        </ScrollReveal>

        {likers.length === 0 ? (
          <ScrollReveal>
            <EmptyState
              icon={Heart}
              title="Pas encore de likes"
              description="Complétez votre profil et restez actif pour attirer des connexions authentiques."
              action={{
                label: "Découvrir des profils",
                onClick: () => navigate("/discover"),
                variant: "hero-outline",
              }}
            />
          </ScrollReveal>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {likers.map((liker, i) => {
              const likerUserId = liker.user_id;
              const isLikedBack = likerUserId ? likedBackIds.has(likerUserId) : false;
              const isMatch = likerUserId ? matchedIds.has(likerUserId) : false;
              const isRevealed = liker.is_revealed;
              const online = isOnline(liker.last_seen);

              return (
                <ScrollReveal key={liker.like_id} delay={i * 60}>
                  <div
                    className={`glass-card rounded-xl p-3 sm:p-4 md:p-5 transition-all duration-300 ${
                      liker.is_super ? "border-gold-soft/40 ring-1 ring-gold-soft/20" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2.5 sm:gap-3 md:gap-4">
                      {/* Avatar */}
                      <button
                        onClick={() => likerUserId && navigate(`/profile/${likerUserId}`)}
                        disabled={!likerUserId}
                        className="relative shrink-0 touch-manipulation disabled:cursor-default"
                      >
                        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden">
                          {liker.avatar_url ? (
                            <img
                              src={liker.avatar_url}
                              alt=""
                              className={`w-full h-full rounded-full object-cover transition-all ${
                                !isRevealed && !isLikedBack ? "blur-md" : ""
                              }`}
                            />
                          ) : (
                            <User className="w-5 h-5 sm:w-6 sm:h-6 text-copper" strokeWidth={1.5} />
                          )}
                        </div>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 border-card ${
                            online ? "bg-emerald-500" : "bg-muted-foreground/30"
                          }`}
                        />
                      </button>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5">
                          {liker.is_super && (
                            <Sparkles size={13} className="text-gold-soft shrink-0" />
                          )}
                          <button
                            onClick={() => likerUserId && navigate(`/profile/${likerUserId}`)}
                            disabled={!likerUserId}
                            className={`font-display text-sm sm:text-base md:text-lg font-medium truncate transition-colors touch-manipulation disabled:cursor-default ${
                              isRevealed ? "hover:text-primary" : "blur-sm select-none"
                            }`}
                          >
                            {isRevealed ? liker.display_name || "Membre" : "••••••"}
                          </button>
                          {liker.is_verified && (
                            <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                          )}
                          {liker.age && (
                            <span className="text-xs sm:text-sm text-muted-foreground font-light">
                              , {liker.age}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-1.5">
                          {liker.city && (
                            <span className="flex items-center gap-1">
                              <MapPin size={10} />
                              {liker.city}
                            </span>
                          )}
                          <span>
                            {formatDistanceToNow(new Date(liker.liked_at), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </span>
                        </div>

                        {/* Interests */}
                        {(isRevealed || isLikedBack) &&
                          liker.interests &&
                          liker.interests.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1.5 sm:mb-2">
                              {liker.interests.slice(0, 3).map((interest) => (
                                <span
                                  key={interest}
                                  className="px-1.5 sm:px-2 py-0.5 rounded-full bg-primary/10 text-[9px] sm:text-[10px] font-medium text-foreground/70"
                                >
                                  {interest}
                                </span>
                              ))}
                            </div>
                          )}

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                          {!isRevealed ? (
                            <Button
                              variant="hero"
                              size="sm"
                              onClick={() => navigate("/premium")}
                              className="touch-manipulation h-8 text-xs"
                            >
                              <Eye size={13} />
                              Débloquer Premium
                            </Button>
                          ) : !isLikedBack ? (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => likerUserId && handleLikeBack(likerUserId)}
                              disabled={!likerUserId}
                              className="touch-manipulation h-8 text-xs"
                            >
                              <Heart size={13} />
                              <span className="hidden sm:inline">Aimer aussi</span>
                              <span className="sm:hidden">Aimer</span>
                            </Button>
                          ) : (
                            <>
                              <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium text-emerald-500">
                                <Check size={13} />
                                Match !
                              </span>
                              <Button
                                variant="hero-outline"
                                size="sm"
                                onClick={() => likerUserId && navigate(`/messages?with=${likerUserId}`)}
                                disabled={!likerUserId}
                                className="touch-manipulation h-8 text-xs"
                              >
                                <MessageCircle size={13} />
                                <span className="hidden sm:inline">Message</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Super like badge */}
                      {liker.is_super && (
                        <div className="shrink-0 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-gold-soft/15 text-[8px] sm:text-[10px] font-medium text-gold-soft self-start">
                          ⭐ <span className="hidden sm:inline">Super Like</span>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        )}
      </main>
    </AppShell>
  );
};

export default LikedMe;
