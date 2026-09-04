import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { getLimitErrorMessage } from "@/lib/limits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Search, SlidersHorizontal, Compass } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import AppShell from "@/components/AppShell";
import BlockReportDialog from "@/components/BlockReportDialog";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import ProfileCard from "@/components/ProfileCard";
import EmptyState from "@/components/ui/empty-state";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { isProfileComplete } from "@/hooks/useProfileComplete";
import { toast } from "sonner";

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
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currentPlan } = useSubscription();
  const canFilter = currentPlan !== "free";
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ city: "", ageMin: "", ageMax: "", gender: "" });
  const [reportTarget, setReportTarget] = useState<Profile | null>(null);
  const { blockedIds, reload: reloadBlocked } = useBlockedUsers();

  const loadData = useCallback(async () => {
    if (!user) return;

    const { data: myProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!isProfileComplete(myProfile as Parameters<typeof isProfileComplete>[0])) {
      navigate("/profile-setup");
      return;
    }

    setProfile(myProfile as Profile);

    const { data: myLikes } = await supabase
      .from("likes")
      .select("to_user_id")
      .eq("from_user_id", user.id);

    const likedSet = new Set((myLikes || []).map((l) => l.to_user_id));
    setLikedIds(likedSet);

    if (likedSet.size > 0) {
      const { data: mutualIds } = await supabase.rpc("get_mutual_match_user_ids");
      setMatchedIds(new Set((mutualIds as string[] | null) ?? []));
    }

    // Same source as Discover: excludes likes, passes, blocks, incognito
    const { data: discovered, error: discoverError } = await supabase.rpc("get_discover_profiles", {
      p_limit: 50,
      p_city: filters.city || null,
      p_age_min: filters.ageMin ? parseInt(filters.ageMin, 10) : null,
      p_age_max: filters.ageMax ? parseInt(filters.ageMax, 10) : null,
      p_gender: filters.gender || null,
      p_looking_for: null,
      p_verified_only: false,
      p_online_only: false,
      p_interests: null,
    });

    if (discoverError) {
      toast.error("Impossible de charger les profils");
      setProfiles([]);
    } else {
      setProfiles((discovered || []) as Profile[]);
    }
    setLoading(false);
  }, [user, navigate, filters.city, filters.ageMin, filters.ageMax, filters.gender]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const { containerRef, pullDistance, isRefreshing } = usePullToRefresh(loadData);

  const handleLike = async (toUserId: string) => {
    if (!user) return;
    if (likedIds.has(toUserId)) {
      await supabase.from("likes").delete().eq("from_user_id", user.id).eq("to_user_id", toUserId);
      setLikedIds((prev) => { const next = new Set(prev); next.delete(toUserId); return next; });
      setMatchedIds((prev) => { const next = new Set(prev); next.delete(toUserId); return next; });
    } else {
      const { error } = await supabase.from("likes").insert({ from_user_id: user.id, to_user_id: toUserId });
      if (error) {
        const limitMsg = getLimitErrorMessage(error);
        toast.error(limitMsg || "Impossible d'aimer ce profil", {
          action: limitMsg
            ? { label: "Offres", onClick: () => navigate("/premium") }
            : undefined,
        });
        return;
      }
      setLikedIds((prev) => new Set(prev).add(toUserId));

      const { data: reverse } = await supabase.rpc("has_liked_me", {
        p_user_id: toUserId,
      });

      if (reverse) {
        setMatchedIds((prev) => new Set(prev).add(toUserId));
        toast.success("C'est un match !");
      }
    }
  };

  const requestFilters = () => {
    if (!canFilter) {
      toast.error("Les filtres de recherche sont réservés aux membres Plus et plus.", {
        action: { label: "Voir Plus", onClick: () => navigate("/premium") },
      });
      return;
    }
    setShowFilters(!showFilters);
  };

  const filteredProfiles = profiles.filter((p) => {
    if (blockedIds.has(p.user_id)) return false;
    return true;
  });

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
      {reportTarget && (
        <BlockReportDialog open={!!reportTarget} onClose={() => setReportTarget(null)}
          targetUserId={reportTarget.user_id} targetName={reportTarget.display_name || "Utilisateur"}
          onBlocked={() => reloadBlocked()} />
      )}

      <main ref={containerRef} className="flex-1 overflow-y-auto">
        <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
        <div className="container py-4 sm:py-6 md:py-12 px-3 sm:px-4 md:px-6">
          <ScrollReveal>
            <div className="mb-5 sm:mb-8 flex flex-col gap-3 sm:gap-4">
              <div>
                <h2 className="font-display text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light mb-1 sm:mb-2">
                  Bonjour, <span className="text-gradient-copper italic">{profile?.display_name}</span>
                </h2>
                <p className="text-muted-foreground text-xs sm:text-sm">Découvrez les profils qui correspondent à vos envies.</p>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x-mandatory">
                <Button variant="default" size="sm" onClick={() => navigate("/discover")} className="shrink-0 snap-start touch-manipulation text-xs sm:text-sm">
                  <Compass size={14} /> Mode swipe
                </Button>
                <Button variant="outline" size="sm" onClick={requestFilters} className="border-border/50 shrink-0 snap-start touch-manipulation text-xs sm:text-sm">
                  <SlidersHorizontal size={14} /> Filtres{!canFilter ? " · Plus" : ""}
                </Button>
              </div>
            </div>
          </ScrollReveal>

          {showFilters && canFilter && (
            <ScrollReveal>
              <div className="glass-card rounded-xl p-3 sm:p-5 mb-5 sm:mb-8 space-y-3 sm:space-y-0 sm:flex sm:flex-row sm:gap-4">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Ville</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
                      placeholder="Rechercher une ville" className="pl-9 h-10 bg-secondary/50 border-border/50 text-sm" />
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-4">
                  <div className="flex-1 sm:w-24 sm:flex-initial">
                    <label className="text-xs text-muted-foreground mb-1 block">Âge min</label>
                    <Input type="number" min={18} value={filters.ageMin} onChange={e => setFilters(f => ({ ...f, ageMin: e.target.value }))}
                      placeholder="18" className="h-10 bg-secondary/50 border-border/50 text-sm tabular-nums" />
                  </div>
                  <div className="flex-1 sm:w-24 sm:flex-initial">
                    <label className="text-xs text-muted-foreground mb-1 block">Âge max</label>
                    <Input type="number" max={120} value={filters.ageMax} onChange={e => setFilters(f => ({ ...f, ageMax: e.target.value }))}
                      placeholder="60" className="h-10 bg-secondary/50 border-border/50 text-sm tabular-nums" />
                  </div>
                </div>
                <div className="sm:w-32">
                  <label className="text-xs text-muted-foreground mb-1 block">Genre</label>
                  <div className="flex gap-1">
                    {[{ v: "", l: "Tous" }, { v: "homme", l: "H" }, { v: "femme", l: "F" }].map(opt => (
                      <button key={opt.v} onClick={() => setFilters(f => ({ ...f, gender: opt.v }))}
                        className={`flex-1 h-10 rounded-lg border text-xs font-medium transition-all touch-manipulation active:scale-[0.97] ${filters.gender === opt.v ? "border-primary bg-primary/10 text-foreground" : "border-border/50 bg-secondary/30 text-muted-foreground"}`}>
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollReveal>
          )}

          {filteredProfiles.length === 0 ? (
            <ScrollReveal>
              <EmptyState
                icon={Heart}
                title="Pas encore de profils"
                description="Nous sélectionnons les premiers membres de votre région. Revenez très bientôt ou élargissez vos filtres."
                action={{
                  label: "Mode swipe",
                  onClick: () => navigate("/discover"),
                  variant: "hero",
                }}
              />
            </ScrollReveal>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
              {filteredProfiles.map((p, i) => (
                <ScrollReveal key={p.id} delay={i * 80}>
                  <ProfileCard
                    profile={p}
                    isLiked={likedIds.has(p.user_id)}
                    isMatched={matchedIds.has(p.user_id)}
                    onLike={() => handleLike(p.user_id)}
                    onMessage={() => navigate(`/messages?with=${p.user_id}`)}
                    onViewProfile={() => navigate(`/profile/${p.user_id}`)}
                    onReport={() => setReportTarget(p)}
                  />
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
};

export default Dashboard;
