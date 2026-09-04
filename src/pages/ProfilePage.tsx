import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Heart,
  MessageCircle,
  MapPin,
  User,
  ArrowLeft,
  Calendar,
  UserX,
  ShieldAlert,
  Crown,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import BadgesDisplay from "@/components/BadgesDisplay";
import BlockReportDialog from "@/components/BlockReportDialog";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { useSubscription } from "@/hooks/useSubscription";
import EmptyState from "@/components/ui/empty-state";
import { TrustBadge, OnlineStatus, InterestTag } from "@/components/TrustBadge";
import { isOnline } from "@/hooks/useOnlineStatus";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getLimitErrorMessage } from "@/lib/limits";

interface ProfileData {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  age: number | null;
  city: string | null;
  gender: string | null;
  looking_for: string | null;
  avatar_url: string | null;
  last_seen: string | null;
  interests: string[] | null;
  is_verified: boolean;
  created_at: string;
}

interface Photo {
  id: string;
  photo_url: string;
  position: number;
}

const ProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { limits } = useSubscription();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [galleryLocked, setGalleryLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [isMatch, setIsMatch] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [stats, setStats] = useState({ likes: 0, matches: 0 });
  const [showBlockReport, setShowBlockReport] = useState(false);
  const { blockedIds } = useBlockedUsers();

  useEffect(() => {
    if (!userId || !user) return;

    const load = async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      setProfile(p as ProfileData);

      const { data: ph } = await supabase
        .from("profile_photos")
        .select("id, photo_url, position")
        .eq("user_id", userId)
        .order("position");
      const photoRows = (ph as Photo[]) || [];
      setPhotos(photoRows);

      const { data: myLike } = await supabase
        .from("likes")
        .select("id")
        .eq("from_user_id", user.id)
        .eq("to_user_id", userId)
        .maybeSingle();
      setLiked(!!myLike);

      let matched = false;
      if (myLike) {
        const { data: rev } = await supabase.rpc("has_liked_me", { p_user_id: userId });
        matched = !!rev;
        setIsMatch(matched);
      } else {
        setIsMatch(false);
      }

      const isOwn = userId === user.id;
      const unlocked = isOwn || limits.canViewFullGallery || matched;
      setGalleryLocked(!unlocked);

      const { data: stats } = await supabase.rpc("get_public_profile_stats", {
        p_user_id: userId,
      });
      if (stats && stats.length > 0) {
        setStats({ likes: Number(stats[0].like_count) || 0, matches: Number(stats[0].match_count) || 0 });
      } else {
        setStats({ likes: 0, matches: 0 });
      }

      setLoading(false);
    };

    load();
  }, [userId, user, limits.canViewFullGallery]);

  const handleLike = async () => {
    if (!user || !userId) return;
    if (liked) {
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("from_user_id", user.id)
        .eq("to_user_id", userId);
      if (error) {
        toast.error("Impossible de retirer ce like");
        return;
      }
      setLiked(false);
      setIsMatch(false);
    } else {
      const { error } = await supabase
        .from("likes")
        .insert({ from_user_id: user.id, to_user_id: userId });
      if (error) {
        const limitMsg = getLimitErrorMessage(error);
        toast.error(limitMsg || "Impossible d'envoyer ce like");
        return;
      }
      setLiked(true);
      const { data: rev } = await supabase.rpc("has_liked_me", { p_user_id: userId });
      if (rev) {
        setIsMatch(true);
        toast.success("C'est un match ! 🎉");
      }
    }
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

  if (!profile) {
    return (
      <AppShell>
        <main className="container max-w-2xl py-8 px-4">
          <EmptyState
            icon={UserX}
            title="Profil introuvable"
            description="Ce profil n'existe plus ou a été supprimé."
            action={{ label: "Retour", onClick: () => navigate(-1), variant: "hero-outline" }}
          />
        </main>
      </AppShell>
    );
  }

  const online = isOnline(profile.last_seen);

  return (
    <AppShell>
      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-background/95 flex items-center justify-center p-3 sm:p-4 safe-area-top safe-area-bottom"
          onClick={() => setSelectedPhoto(null)}
        >
          <img
            src={selectedPhoto}
            alt=""
            className="max-w-full max-h-full object-contain rounded-xl"
          />
        </div>
      )}

      <main className="container max-w-2xl py-4 sm:py-6 md:py-8 px-3 sm:px-4 md:px-6">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 sm:mb-6 touch-manipulation"
        >
          <ArrowLeft size={16} /> Retour
        </button>

        {/* Hero section */}
        <div className="glass-card rounded-xl sm:rounded-2xl overflow-hidden mb-4 sm:mb-6">
          {/* Main photo */}
          <div className="aspect-[4/3] sm:aspect-[4/3] bg-secondary/30 relative">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setSelectedPhoto(profile.avatar_url!)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-16 h-16 sm:w-20 sm:h-20 text-muted-foreground/30" strokeWidth={1} />
              </div>
            )}

            <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
              <OnlineStatus online={online} compact />
            </div>

            {profile.is_verified && (
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                <TrustBadge variant="verified" />
              </div>
            )}

            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-card to-transparent" />
          </div>

          <div className="p-4 sm:p-6 -mt-4 sm:-mt-6 relative">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-medium mb-0.5 sm:mb-1 flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {profile.display_name}
              {profile.age && (
                <span className="text-muted-foreground font-light">, {profile.age}</span>
              )}
            </h1>

            {profile.city && (
              <p className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                <MapPin size={13} /> {profile.city}
              </p>
            )}

            {/* Badges */}
            <div className="mb-3 sm:mb-4">
              <BadgesDisplay userId={userId!} />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="text-center p-1.5 sm:p-2 rounded-lg bg-secondary/30">
                <p className="font-display text-lg sm:text-xl md:text-2xl font-medium">{stats.likes}</p>
                <p className="text-[9px] sm:text-[10px] md:text-[11px] text-muted-foreground">Likes reçus</p>
              </div>
              <div className="text-center p-1.5 sm:p-2 rounded-lg bg-secondary/30">
                <p className="font-display text-lg sm:text-xl md:text-2xl font-medium">{stats.matches}</p>
                <p className="text-[9px] sm:text-[10px] md:text-[11px] text-muted-foreground">Matchs</p>
              </div>
              <div className="text-center p-1.5 sm:p-2 rounded-lg bg-secondary/30">
                <p className="font-display text-sm sm:text-base md:text-2xl font-medium">
                  {format(new Date(profile.created_at), "MMM yyyy", { locale: fr })}
                </p>
                <p className="text-[9px] sm:text-[10px] md:text-[11px] text-muted-foreground">Membre depuis</p>
              </div>
            </div>

            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
              <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-3 sm:mb-4">
                {profile.interests.map((interest) => (
                  <InterestTag key={interest}>{interest}</InterestTag>
                ))}
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <p className="text-xs sm:text-sm text-foreground/70 leading-relaxed mb-4 sm:mb-6">{profile.bio}</p>
            )}

            {/* Info */}
            <div className="flex flex-wrap gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground mb-4 sm:mb-6">
              {profile.gender && (
                <span className="flex items-center gap-1">
                  <User size={11} />
                  {profile.gender === "homme" ? "Homme" : profile.gender === "femme" ? "Femme" : profile.gender}
                </span>
              )}
              {profile.looking_for && (
                <span>
                  Cherche : {profile.looking_for === "homme" ? "Hommes" : profile.looking_for === "femme" ? "Femmes" : "Les deux"}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                Inscrit {format(new Date(profile.created_at), "d MMMM yyyy", { locale: fr })}
              </span>
            </div>

            {/* Action buttons */}
            {userId !== user?.id && (
              <div className="flex gap-2 sm:gap-3">
                <Button
                  variant={liked ? "default" : "hero"}
                  size="lg"
                  className="flex-1 touch-manipulation h-11 sm:h-12"
                  onClick={handleLike}
                  disabled={blockedIds.has(userId!)}
                >
                  <Heart size={16} className={liked ? "fill-current" : ""} />
                  {liked ? "Aimé" : "J'aime"}
                </Button>
                {isMatch && !blockedIds.has(userId!) && (
                  <Button
                    variant="trust"
                    size="lg"
                    className="touch-manipulation h-11 sm:h-12"
                    onClick={() => navigate(`/messages?with=${userId}`)}
                  >
                    <MessageCircle size={16} />
                    <span className="hidden sm:inline">Message</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="lg"
                  className="touch-manipulation h-11 sm:h-12 px-3"
                  onClick={() => setShowBlockReport(true)}
                  title="Bloquer ou signaler"
                >
                  <ShieldAlert size={16} />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Photo gallery */}
        {photos.length > 0 && (
          <div>
            <h2 className="font-display text-lg sm:text-xl font-medium mb-3 sm:mb-4">Photos</h2>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo.photo_url)}
                  className="aspect-square rounded-lg sm:rounded-xl overflow-hidden bg-secondary/30 hover:opacity-90 transition-opacity touch-manipulation"
                >
                  <img
                    src={photo.photo_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {galleryLocked && userId !== user?.id && (
          <div className="mt-4 rounded-xl border border-champagne/25 bg-champagne/5 p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-champagne/15 flex items-center justify-center mx-auto">
              <Crown size={22} className="text-champagne" />
            </div>
            <div>
              <p className="font-medium">Galerie réservée aux abonnés</p>
              <p className="text-xs text-muted-foreground mt-1">
                L&apos;avatar reste visible. Passez Plus pour voir toutes les photos en HD,
                ou matchez pour débloquer ce profil.
              </p>
            </div>
            <Button variant="hero" size="sm" onClick={() => navigate("/premium")}>
              Voir les offres
            </Button>
          </div>
        )}
      </main>

      {profile && userId && userId !== user?.id && (
        <BlockReportDialog
          open={showBlockReport}
          onClose={() => setShowBlockReport(false)}
          targetUserId={userId}
          targetName={profile.display_name || "Utilisateur"}
          onBlocked={() => navigate(-1)}
        />
      )}
    </AppShell>
  );
};

export default ProfilePage;
