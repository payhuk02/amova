import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  MapPin, User, Heart, Navigation, Loader2, ArrowLeft
} from "lucide-react";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/ui/empty-state";
import { TrustBadge } from "@/components/TrustBadge";
import { useGeolocation, useSmartMatches } from "@/hooks/useGeolocation";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { toast } from "sonner";

const NearbyMap = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { position, loading: geoLoading, requestLocation } = useGeolocation();
  const { matches, loading: matchLoading, loadMatches } = useSmartMatches();
  const { blockedIds } = useBlockedUsers();
  const [maxDistance, setMaxDistance] = useState(50);
  const [hasLocation, setHasLocation] = useState(false);

  const visibleMatches = useMemo(
    () => matches.filter((m) => !blockedIds.has(m.user_id)),
    [matches, blockedIds],
  );

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("latitude, longitude")
        .eq("user_id", user.id)
        .single();
      if (data && (data as any).latitude) {
        setHasLocation(true);
        loadMatches(maxDistance);
      }
    };
    check();
  }, [user]);

  const handleEnableLocation = async () => {
    const pos = await requestLocation();
    if (pos) {
      setHasLocation(true);
      toast.success("Position enregistrée !");
      loadMatches(maxDistance);
    }
  };

  const handleDistanceChange = (val: number[]) => {
    setMaxDistance(val[0]);
  };

  const handleDistanceCommit = () => {
    loadMatches(maxDistance);
  };

  if (!hasLocation) {
    return (
      <AppShell>
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Navigation className="w-9 h-9 text-copper" strokeWidth={1.5} />
            </div>
            <h2 className="font-display text-2xl font-light mb-3">Découvrir autour de vous</h2>
            <p className="text-muted-foreground text-sm mb-8">
              Activez la localisation pour voir les profils à proximité et bénéficier du matching intelligent basé sur la distance.
            </p>
            <Button
              variant="hero"
              size="lg"
              onClick={handleEnableLocation}
              disabled={geoLoading}
              className="w-full"
            >
              {geoLoading ? (
                <><Loader2 size={16} className="animate-spin" /> Localisation en cours...</>
              ) : (
                <><MapPin size={16} /> Activer la localisation</>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="mt-4 text-muted-foreground"
            >
              Plus tard
            </Button>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="flex-1 overflow-y-auto">
        <div className="container py-4 sm:py-6 px-3 sm:px-4 md:px-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors touch-manipulation"
          >
            <ArrowLeft size={16} /> Retour
          </button>

          <div className="mb-6">
            <h1 className="font-display text-xl sm:text-2xl font-light mb-1 flex items-center gap-2">
              <MapPin size={20} className="text-copper" />
              Profils à proximité
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Basé sur le matching intelligent et la distance
            </p>
          </div>

          {/* Distance slider */}
          <div className="glass-card rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-muted-foreground">Distance maximale</label>
              <span className="text-sm font-medium tabular-nums">{maxDistance} km</span>
            </div>
            <Slider
              value={[maxDistance]}
              min={5}
              max={200}
              step={5}
              onValueChange={handleDistanceChange}
              onValueCommit={handleDistanceCommit}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>5 km</span>
              <span>200 km</span>
            </div>
          </div>

          {matchLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : visibleMatches.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="Aucun profil à proximité"
              description="Élargissez votre rayon de recherche ou activez votre localisation pour découvrir des membres près de chez vous."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {visibleMatches.map((m) => (
                <div
                  key={m.user_id}
                  className="glass-card rounded-xl overflow-hidden hover:border-primary/30 transition-all duration-300 group"
                >
                  {/* Photo */}
                  <div className="aspect-[4/3] bg-secondary/30 relative">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-12 h-12 text-muted-foreground/20" />
                      </div>
                    )}

                    {/* Compatibility badge */}
                    <div className="absolute top-3 right-3">
                      <TrustBadge variant="compatibility" label={`${m.compatibility_score}%`} compact />
                    </div>

                    {/* Distance badge */}
                    {m.distance_km != null && (
                      <div className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1">
                        <MapPin size={11} className="text-muted-foreground" />
                        <span className="text-xs tabular-nums">
                          {m.distance_km < 1
                            ? "< 1 km"
                            : `${Math.round(m.distance_km)} km`}
                        </span>
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-card to-transparent" />
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-display text-lg font-medium mb-0.5">
                      <button
                        onClick={() => navigate(`/profile/${m.user_id}`)}
                        className="hover:text-primary transition-colors"
                      >
                        {m.display_name}
                      </button>
                      {m.age && (
                        <span className="text-muted-foreground font-light">, {m.age}</span>
                      )}
                    </h3>

                    {m.city && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                        <MapPin size={11} /> {m.city}
                      </p>
                    )}

                    {m.interests && m.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {m.interests.slice(0, 4).map((interest: string) => (
                          <span
                            key={interest}
                            className="px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-medium text-foreground/80"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    )}

                    <Button
                      variant="hero-outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`/profile/${m.user_id}`)}
                    >
                      <Heart size={14} /> Voir le profil
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
};

export default NearbyMap;
