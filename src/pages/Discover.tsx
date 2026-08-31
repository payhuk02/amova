import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Heart, X, User, MapPin, MessageCircle, Sparkles, SlidersHorizontal, Shield, Star, ShieldCheck, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import BlockReportDialog from "@/components/BlockReportDialog";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { isOnline, formatLastSeen } from "@/hooks/useOnlineStatus";
import SuperLikeButton from "@/components/SuperLikeButton";
import BoostButton from "@/components/BoostButton";
import CompatibilityModal from "@/components/CompatibilityModal";
import DiscoverFilters, { type DiscoverFiltersState } from "@/components/DiscoverFilters";
import BadgesDisplay from "@/components/BadgesDisplay";
import { useCheckAndAwardBadges } from "@/hooks/useBadges";
import { getLimitErrorMessage } from "@/lib/limits";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  gender: string | null;
  bio: string | null;
  age: number | null;
  city: string | null;
  looking_for: string | null;
  avatar_url: string | null;
  last_seen: string | null;
  interests: string[] | null;
  is_verified?: boolean;
  compatibility?: number;
}

const Discover = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState<"left" | "right" | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [matchAnimation, setMatchAnimation] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [reportTarget, setReportTarget] = useState<Profile | null>(null);
  const [showCompatibility, setShowCompatibility] = useState(false);
  const [myProfile, setMyProfile] = useState<any>(null);
  const { blockedIds, reload: reloadBlocked } = useBlockedUsers();
  const { checkBadges } = useCheckAndAwardBadges();
  const [filters, setFilters] = useState<DiscoverFiltersState>({
    city: "",
    ageMin: "18",
    ageMax: "60",
    gender: "",
    verifiedOnly: false,
    onlineOnly: false,
    lookingFor: "",
    hasInterests: [],
  });

  // Collect all unique interests from profiles
  const availableInterests = useMemo(() => {
    const set = new Set<string>();
    profiles.forEach((p) => p.interests?.forEach((i) => set.add(i)));
    return Array.from(set).sort();
  }, [profiles]);

  useEffect(() => {
    if (!user) return;

    const loadProfiles = async () => {
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!myProfile?.display_name) {
        navigate("/profile-setup");
        return;
      }
      setMyProfile(myProfile);

      const { data: myLikes } = await supabase
        .from("likes")
        .select("to_user_id")
        .eq("from_user_id", user.id);

      const likedIds = (myLikes || []).map((l) => l.to_user_id);

      let query = supabase
        .from("profiles")
        .select("*")
        .neq("user_id", user.id)
        .not("display_name", "is", null);

      if (myProfile.looking_for && myProfile.looking_for !== "les deux") {
        query = query.eq("gender", myProfile.looking_for);
      }

      const { data: otherProfiles } = await query.limit(50);

      const filtered = (otherProfiles || []).filter(
        (p) => !likedIds.includes(p.user_id)
      ) as Profile[];

      try {
        const { data: scoreData, error } = await supabase.functions.invoke("ai-match", {
          body: { userProfile: myProfile, candidates: filtered.slice(0, 20) },
        });

        if (!error && scoreData?.scored) {
          const scored = scoreData.scored as Array<{ user_id: string; score: number }>;
          const scoreMap = new Map(scored.map((s) => [s.user_id, s.score]));
          const withScores = filtered.map((p) => ({
            ...p,
            compatibility: scoreMap.get(p.user_id) || Math.floor(Math.random() * 30 + 50),
          }));
          withScores.sort((a, b) => (b.compatibility || 0) - (a.compatibility || 0));
          setProfiles(withScores);
        } else {
          setProfiles(filtered);
        }
      } catch {
        setProfiles(filtered);
      }

      setLoading(false);

      // Check badges on load
      checkBadges();
    };

    loadProfiles();
  }, [user, navigate]);

  // Apply filters + blocked
  const visibleProfiles = profiles.filter((p, i) => {
    if (i < currentIndex) return false;
    if (blockedIds.has(p.user_id)) return false;
    if (filters.city && p.city && !p.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
    if (filters.ageMin && p.age && p.age < parseInt(filters.ageMin)) return false;
    if (filters.ageMax && p.age && p.age > parseInt(filters.ageMax)) return false;
    if (filters.gender && p.gender !== filters.gender) return false;
    if (filters.lookingFor && (p as any).looking_for !== filters.lookingFor) return false;
    if (filters.verifiedOnly && !(p as any).is_verified) return false;
    if (filters.onlineOnly && !isOnline(p.last_seen)) return false;
    if (filters.hasInterests.length > 0) {
      const pInterests = p.interests || [];
      if (!filters.hasInterests.some((fi) => pInterests.includes(fi))) return false;
    }
    return true;
  });

  const currentProfile = visibleProfiles[0];

  const handleSwipe = useCallback(
    async (direction: "left" | "right", isSuper = false) => {
      if (!user || !currentProfile || swiping) return;
      setSwiping(direction);

      if (direction === "right") {
        const { error } = await supabase
          .from("likes")
          .insert({ from_user_id: user.id, to_user_id: currentProfile.user_id, is_super: isSuper } as any);

        if (!error) {
          const { data: reverse } = await supabase
            .from("likes")
            .select("id")
            .eq("from_user_id", currentProfile.user_id)
            .eq("to_user_id", user.id)
            .maybeSingle();

          if (reverse) {
            setMatchAnimation(currentProfile.display_name || "quelqu'un");
            toast.success("C'est un match ! 🎉");
            setTimeout(() => setMatchAnimation(null), 2500);
            checkBadges();
          } else if (isSuper) {
            toast.success("Super Like envoyé ! ⭐");
          }
        } else {
          const limitMsg = getLimitErrorMessage(error);
          if (limitMsg) {
            toast.error(limitMsg);
          } else {
            toast.error("Impossible d'envoyer ce like");
          }
        }
      }

      setTimeout(() => {
        setSwiping(null);
        setDragX(0);
        setCurrentIndex((prev) => prev + 1);
      }, 300);
    },
    [user, currentProfile, swiping]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setDragX(e.clientX - startX);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragX > 100) handleSwipe("right");
    else if (dragX < -100) handleSwipe("left");
    else setDragX(0);
  };

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
      {/* Match overlay */}
      {matchAnimation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="text-center animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-accent fill-accent" />
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-light mb-3">
              C'est un <span className="text-gradient-copper italic">match</span> !
            </h2>
            <p className="text-muted-foreground">
              Vous et {matchAnimation} vous plaisez mutuellement
            </p>
            <Button
              variant="hero"
              size="lg"
              className="mt-8"
              onClick={() => {
                setMatchAnimation(null);
                navigate(`/messages?with=${currentProfile?.user_id}`);
              }}
            >
              <MessageCircle size={16} />
              Envoyer un message
            </Button>
          </div>
        </div>
      )}

      {/* Block/Report dialog */}
      {reportTarget && (
        <BlockReportDialog
          open={!!reportTarget}
          onClose={() => setReportTarget(null)}
          targetUserId={reportTarget.user_id}
          targetName={reportTarget.display_name || "Utilisateur"}
          onBlocked={() => {
            reloadBlocked();
            setCurrentIndex((prev) => prev + 1);
          }}
        />
      )}

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-8">
        {/* Filters toggle */}
        <div className="w-full max-w-sm mb-4 flex justify-between items-center">
          <BoostButton />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="border-border/50"
          >
            <SlidersHorizontal size={14} /> Filtres
            {(filters.verifiedOnly || filters.hasInterests.length > 0) && (
              <span className="ml-1 w-2 h-2 rounded-full bg-primary" />
            )}
          </Button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <DiscoverFilters
            filters={filters}
            onChange={setFilters}
            availableInterests={availableInterests}
          />
        )}

        {!currentProfile ? (
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-7 h-7 text-copper" strokeWidth={1.5} />
            </div>
            <h2 className="font-display text-2xl font-light mb-3">
              Plus de profils pour le moment
            </h2>
            <p className="text-muted-foreground text-sm mb-8">
              Revenez plus tard pour découvrir de nouvelles personnes.
            </p>
            <Button variant="hero-outline" onClick={() => navigate("/dashboard")}>
              Retour au tableau de bord
            </Button>
          </div>
        ) : (
          <>
            {/* Card */}
            <div
              className="w-full max-w-sm relative touch-none select-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              style={{
                transform: swiping
                  ? `translateX(${swiping === "right" ? 400 : -400}px) rotate(${swiping === "right" ? 15 : -15}deg)`
                  : `translateX(${dragX}px) rotate(${dragX * 0.05}deg)`,
                transition: swiping || !isDragging ? "transform 300ms cubic-bezier(0.16, 1, 0.3, 1)" : "none",
                opacity: swiping ? 0 : 1,
              }}
            >
              {/* Swipe indicators */}
              <div
                className="absolute top-6 left-6 z-10 px-4 py-2 rounded-lg border-2 border-primary text-primary font-bold text-lg uppercase tracking-wider -rotate-12 pointer-events-none transition-opacity"
                style={{ opacity: Math.max(0, Math.min(1, dragX / 100)) }}
              >
                J'aime
              </div>
              <div
                className="absolute top-6 right-6 z-10 px-4 py-2 rounded-lg border-2 border-destructive text-destructive font-bold text-lg uppercase tracking-wider rotate-12 pointer-events-none transition-opacity"
                style={{ opacity: Math.max(0, Math.min(1, -dragX / 100)) }}
              >
                Passer
              </div>

              <div className="glass-card rounded-2xl overflow-hidden">
                {/* Photo */}
                <div className="aspect-[3/4] bg-secondary/30 relative">
                  {currentProfile.avatar_url ? (
                    <img src={currentProfile.avatar_url} alt="" className="w-full h-full object-cover" draggable={false} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-20 h-20 text-muted-foreground/30" strokeWidth={1} />
                    </div>
                  )}

                  {/* Online status */}
                  <div className="absolute top-4 left-4">
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium backdrop-blur-sm ${
                        isOnline(currentProfile.last_seen)
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-background/60 text-muted-foreground"
                      }`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          isOnline(currentProfile.last_seen) ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/50"
                        }`}
                      />
                      {formatLastSeen(currentProfile.last_seen)}
                    </div>
                  </div>

                  {/* Compatibility badge */}
                  {currentProfile.compatibility && (
                    <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5">
                      <Sparkles size={12} className="text-copper" />
                      <span className="text-xs font-medium tabular-nums">{currentProfile.compatibility}%</span>
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-card to-transparent" />
                </div>

                {/* Info */}
                <div className="p-6 -mt-8 relative">
                  <h3 className="font-display text-2xl font-medium mb-1 flex items-center gap-1.5">
                    <button onClick={() => navigate(`/profile/${currentProfile.user_id}`)} className="hover:text-primary transition-colors">
                      {currentProfile.display_name}
                    </button>
                    {(currentProfile as any).is_verified && <ShieldCheck size={18} className="text-emerald-500" />}
                    {currentProfile.age && (
                      <span className="text-muted-foreground font-light">, {currentProfile.age}</span>
                    )}
                  </h3>
                  {currentProfile.city && (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                      <MapPin size={13} />
                      {currentProfile.city}
                    </p>
                  )}

                  {/* Badges */}
                  <div className="mb-2">
                    <BadgesDisplay userId={currentProfile.user_id} compact />
                  </div>

                  {currentProfile.interests && currentProfile.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {currentProfile.interests.slice(0, 5).map((interest) => (
                        <span
                          key={interest}
                          className="px-2.5 py-1 rounded-full bg-primary/10 text-[11px] font-medium text-foreground/80"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  )}
                  {currentProfile.bio && (
                    <p className="text-sm text-foreground/70 leading-relaxed line-clamp-3">{currentProfile.bio}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-8">
              <button
                onClick={() => handleSwipe("left")}
                disabled={!!swiping}
                className="w-14 h-14 rounded-full border-2 border-border/50 flex items-center justify-center text-muted-foreground hover:border-destructive hover:text-destructive transition-all duration-200 active:scale-95 hover:shadow-lg"
              >
                <X size={24} strokeWidth={2.5} />
              </button>
              <SuperLikeButton onClick={() => handleSwipe("right", true)} disabled={!!swiping} />
              <button
                onClick={() => setShowCompatibility(true)}
                className="w-10 h-10 rounded-full border border-border/30 flex items-center justify-center text-muted-foreground/50 hover:text-copper hover:border-copper/30 transition-all duration-200 active:scale-95"
                title="Compatibilité"
              >
                <BarChart3 size={16} />
              </button>
              <button
                onClick={() => setReportTarget(currentProfile)}
                className="w-10 h-10 rounded-full border border-border/30 flex items-center justify-center text-muted-foreground/50 hover:text-accent hover:border-accent/30 transition-all duration-200 active:scale-95"
              >
                <Shield size={16} />
              </button>
              <button
                onClick={() => handleSwipe("right")}
                disabled={!!swiping}
                className="w-[72px] h-[72px] rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 active:scale-95"
              >
                <Heart size={30} strokeWidth={2} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground/50 mt-4">
              {visibleProfiles.length - 1} profils restants
            </p>
          </>
        )}

        {/* Compatibility modal */}
        {currentProfile && myProfile && (
          <CompatibilityModal
            userProfile={myProfile}
            targetProfile={currentProfile}
            open={showCompatibility}
            onClose={() => setShowCompatibility(false)}
          />
        )}
      </main>
    </AppShell>
  );
};

export default Discover;
