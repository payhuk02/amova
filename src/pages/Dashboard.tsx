import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, User, MapPin, MessageCircle, Search, SlidersHorizontal, Check, Compass, Shield } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import AppShell from "@/components/AppShell";
import BlockReportDialog from "@/components/BlockReportDialog";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { isOnline, formatLastSeen } from "@/hooks/useOnlineStatus";
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
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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

    if (!myProfile?.display_name) {
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
      const { data: mutualLikes } = await supabase
        .from("likes")
        .select("from_user_id")
        .eq("to_user_id", user.id)
        .in("from_user_id", Array.from(likedSet));

      setMatchedIds(new Set((mutualLikes || []).map((l) => l.from_user_id)));
    }

    let query = supabase
      .from("profiles")
      .select("*")
      .neq("user_id", user.id)
      .not("display_name", "is", null);

    if (myProfile.looking_for && myProfile.looking_for !== "les deux") {
      query = query.eq("gender", myProfile.looking_for);
    }

    const { data: otherProfiles } = await query.limit(50);
    setProfiles((otherProfiles || []) as Profile[]);
    setLoading(false);
  }, [user, navigate]);

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
      if (error) return;
      setLikedIds((prev) => new Set(prev).add(toUserId));

      const { data: reverse } = await supabase
        .from("likes").select("id").eq("from_user_id", toUserId).eq("to_user_id", user.id).maybeSingle();

      if (reverse) {
        setMatchedIds((prev) => new Set(prev).add(toUserId));
        toast.success("C'est un match ! 🎉");
      }
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    if (blockedIds.has(p.user_id)) return false;
    if (filters.city && p.city && !p.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
    if (filters.ageMin && p.age && p.age < parseInt(filters.ageMin)) return false;
    if (filters.ageMax && p.age && p.age > parseInt(filters.ageMax)) return false;
    if (filters.gender && p.gender !== filters.gender) return false;
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
                <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="border-border/50 shrink-0 snap-start touch-manipulation text-xs sm:text-sm">
                  <SlidersHorizontal size={14} /> Filtres
                </Button>
              </div>
            </div>
          </ScrollReveal>

          {showFilters && (
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
              <div className="glass-card rounded-xl p-8 sm:p-12 text-center">
                <Heart className="w-10 h-10 sm:w-12 sm:h-12 text-copper mx-auto mb-3 sm:mb-4" strokeWidth={1.5} />
                <h3 className="font-display text-lg sm:text-xl mb-2">Pas encore de profils</h3>
                <p className="text-muted-foreground text-xs sm:text-sm">Les premiers membres arrivent bientôt.</p>
              </div>
            </ScrollReveal>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
              {filteredProfiles.map((p, i) => {
                const isLiked = likedIds.has(p.user_id);
                const isMatched = matchedIds.has(p.user_id);
                const online = isOnline(p.last_seen);

                return (
                  <ScrollReveal key={p.id} delay={i * 80}>
                    <div className="glass-card rounded-xl p-4 sm:p-6 hover:border-primary/30 transition-all duration-300 group touch-manipulation">
                      <div className="flex items-start justify-between mb-3 sm:mb-4">
                        <div className="relative">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition-colors overflow-hidden">
                            {p.avatar_url ? (
                              <img src={p.avatar_url} alt="" className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 sm:w-7 sm:h-7 text-copper" strokeWidth={1.5} />
                            )}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-card ${online ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                        </div>
                        <button onClick={() => setReportTarget(p)}
                          className="sm:opacity-0 sm:group-hover:opacity-100 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-accent hover:bg-accent/10 transition-all active:scale-95 touch-manipulation">
                          <Shield size={14} />
                        </button>
                      </div>

                      <h3 className="font-display text-lg sm:text-xl font-medium mb-0.5">
                        <button onClick={() => navigate(`/profile/${p.user_id}`)} className="hover:text-primary transition-colors touch-manipulation">
                          {p.display_name}
                        </button>
                      </h3>
                      <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground mb-1">
                        {p.age && <span>{p.age} ans</span>}
                        {p.city && <span className="flex items-center gap-1"><MapPin size={12} />{p.city}</span>}
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground/60 mb-2 sm:mb-3">{formatLastSeen(p.last_seen)}</p>

                      {p.interests && p.interests.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2 sm:mb-3">
                          {(p.interests as string[]).slice(0, 3).map(interest => (
                            <span key={interest} className="px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-medium text-foreground/70">{interest}</span>
                          ))}
                          {p.interests.length > 3 && (
                            <span className="px-2 py-0.5 rounded-full bg-secondary/50 text-[10px] text-muted-foreground">+{p.interests.length - 3}</span>
                          )}
                        </div>
                      )}

                      {p.bio && <p className="text-xs sm:text-sm text-foreground/70 leading-relaxed line-clamp-2 sm:line-clamp-3">{p.bio}</p>}

                      <div className="flex gap-2 mt-3 sm:mt-4">
                        <Button variant={isLiked ? "default" : "hero-outline"} size="sm" className="flex-1 touch-manipulation h-9 sm:h-10 text-xs sm:text-sm" onClick={() => handleLike(p.user_id)}>
                          {isLiked ? <Check size={14} /> : <Heart size={14} />}
                          {isLiked ? "Aimé" : "J'aime"}
                        </Button>
                        {isMatched && (
                          <Button variant="default" size="sm" className="touch-manipulation h-9 sm:h-10" onClick={() => navigate(`/messages?with=${p.user_id}`)}>
                            <MessageCircle size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
};

export default Dashboard;
