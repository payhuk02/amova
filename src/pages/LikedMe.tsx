import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Heart, User, MapPin, MessageCircle, ShieldCheck, Eye, Sparkles, Check } from "lucide-react";
import AppShell from "@/components/AppShell";
import ScrollReveal from "@/components/ScrollReveal";
import { isOnline, formatLastSeen } from "@/hooks/useOnlineStatus";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface LikerProfile {
  user_id: string;
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
}

const LikedMe = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [likers, setLikers] = useState<LikerProfile[]>([]);
  const [likedBackIds, setLikedBackIds] = useState<Set<string>>(new Set());
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data: incomingLikes } = await supabase
        .from("likes")
        .select("from_user_id, created_at, is_super")
        .eq("to_user_id", user.id)
        .order("created_at", { ascending: false });

      if (!incomingLikes || incomingLikes.length === 0) {
        setLoading(false);
        return;
      }

      const likerIds = incomingLikes.map((l) => l.from_user_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, age, city, bio, interests, is_verified, last_seen")
        .in("user_id", likerIds);

      const { data: myLikes } = await supabase
        .from("likes")
        .select("to_user_id")
        .eq("from_user_id", user.id)
        .in("to_user_id", likerIds);

      const likedBack = new Set((myLikes || []).map((l) => l.to_user_id));
      setLikedBackIds(likedBack);

      const matched = new Set<string>();
      likedBack.forEach((id) => matched.add(id));
      setMatchedIds(matched);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      const result: LikerProfile[] = incomingLikes
        .map((like) => {
          const profile = profileMap.get(like.from_user_id);
          if (!profile) return null;
          return {
            ...profile,
            liked_at: like.created_at,
            is_super: like.is_super,
          } as LikerProfile;
        })
        .filter(Boolean) as LikerProfile[];

      setLikers(result);
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
          </div>
        </ScrollReveal>

        {likers.length === 0 ? (
          <ScrollReveal>
            <div className="glass-card rounded-xl p-8 sm:p-10 md:p-12 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-accent/15 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Heart className="w-6 h-6 sm:w-7 sm:h-7 text-accent" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-lg sm:text-xl mb-2">Pas encore de likes</h3>
              <p className="text-muted-foreground text-xs sm:text-sm mb-4 sm:mb-6">
                Complétez votre profil et soyez actif pour attirer plus de monde !
              </p>
              <Button variant="hero-outline" onClick={() => navigate("/discover")} className="touch-manipulation">
                Découvrir des profils
              </Button>
            </div>
          </ScrollReveal>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {likers.map((liker, i) => {
              const isLikedBack = likedBackIds.has(liker.user_id);
              const isMatch = matchedIds.has(liker.user_id);
              const isRevealed = revealed.has(liker.user_id);
              const online = isOnline(liker.last_seen);

              return (
                <ScrollReveal key={liker.user_id} delay={i * 60}>
                  <div
                    className={`glass-card rounded-xl p-3 sm:p-4 md:p-5 transition-all duration-300 ${
                      liker.is_super ? "border-gold-soft/40 ring-1 ring-gold-soft/20" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2.5 sm:gap-3 md:gap-4">
                      {/* Avatar */}
                      <button
                        onClick={() => navigate(`/profile/${liker.user_id}`)}
                        className="relative shrink-0 touch-manipulation"
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
                            onClick={() => navigate(`/profile/${liker.user_id}`)}
                            className={`font-display text-sm sm:text-base md:text-lg font-medium truncate hover:text-primary transition-colors touch-manipulation ${
                              !isRevealed && !isLikedBack ? "blur-sm select-none" : ""
                            }`}
                          >
                            {isRevealed || isLikedBack
                              ? liker.display_name
                              : "••••••"}
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
                          {!isLikedBack ? (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleLikeBack(liker.user_id)}
                                className="touch-manipulation h-8 text-xs"
                              >
                                <Heart size={13} />
                                <span className="hidden sm:inline">Aimer aussi</span>
                                <span className="sm:hidden">Aimer</span>
                              </Button>
                              {!isRevealed && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-border/50 touch-manipulation h-8 text-xs"
                                  onClick={() =>
                                    setRevealed((prev) => new Set(prev).add(liker.user_id))
                                  }
                                >
                                  <Eye size={13} />
                                  Révéler
                                </Button>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium text-emerald-500">
                                <Check size={13} />
                                Match !
                              </span>
                              <Button
                                variant="hero-outline"
                                size="sm"
                                onClick={() =>
                                  navigate(`/messages?with=${liker.user_id}`)
                                }
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
