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
  UserX,
  ShieldAlert,
  Crown,
  Briefcase,
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
import { getLimitErrorMessage, isUpgradeLimitError, PLANS_PATH, plansEnticement } from "@/lib/limits";
import BlurredPhoto from "@/components/BlurredPhoto";
import { lookingForLabel } from "@/lib/gender";
import { labelForReligion, labelForRelationship } from "@/lib/profile-options";

interface ProfileData {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  age: number | null;
  city: string | null;
  country: string | null;
  gender: string | null;
  looking_for: string | null;
  avatar_url: string | null;
  last_seen: string | null;
  interests: string[] | null;
  is_verified: boolean;
  created_at: string;
  occupation: string | null;
  religion: string | null;
  relationship_type: string | null;
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
  const [galleryLocked, setGalleryLocked] = useState(true);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [isMatch, setIsMatch] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
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
      setPhotos((ph as Photo[]) || []);

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
        if (isUpgradeLimitError(error)) navigate(PLANS_PATH);
        return;
      }
      setLiked(true);
      const { data: rev } = await supabase.rpc("has_liked_me", { p_user_id: userId });
      if (rev) {
        setIsMatch(true);
        toast.success("C'est un match !");
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
  const isOwn = userId === user?.id;
  const blurMainPhoto = !isOwn && galleryLocked;
  const place = [profile.city, profile.country].filter(Boolean).join(", ");

  const details: { label: string; value: string }[] = [];
  if (profile.occupation) details.push({ label: "Métier", value: profile.occupation });
  if (profile.looking_for) details.push({ label: "Recherche", value: lookingForLabel(profile.looking_for) });
  if (profile.relationship_type) {
    details.push({ label: "Relation", value: labelForRelationship(profile.relationship_type) });
  }
  if (profile.religion) details.push({ label: "Religion", value: labelForReligion(profile.religion) });

  return (
    <AppShell>
      {selectedPhoto && !blurMainPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-background/95 flex items-center justify-center p-3 sm:p-4 safe-area-top safe-area-bottom"
          onClick={() => setSelectedPhoto(null)}
        >
          <img src={selectedPhoto} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
        </div>
      )}

      <main className="container max-w-2xl py-4 sm:py-6 md:py-8 px-3 sm:px-4 md:px-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 sm:mb-6 touch-manipulation"
        >
          <ArrowLeft size={16} /> Retour
        </button>

        {/* Photo hero */}
        <div className="aspect-[4/5] sm:aspect-[4/3] bg-secondary/30 relative overflow-hidden rounded-xl mb-6 sm:mb-8">
          {profile.avatar_url ? (
            <BlurredPhoto
              src={profile.avatar_url}
              blurred={blurMainPhoto}
              className="w-full h-full cursor-pointer"
              onClick={() => {
                if (!blurMainPhoto) setSelectedPhoto(profile.avatar_url!);
                else {
                  toast.info(plansEnticement("Photos nettes"));
                  navigate(PLANS_PATH);
                }
              }}
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

          <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-background/80 to-transparent" />
        </div>

        {/* Identity */}
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight mb-2">
            {profile.display_name}
            {profile.age != null && (
              <span className="text-muted-foreground font-light">, {profile.age}</span>
            )}
          </h1>

          {place && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
              <MapPin size={14} className="shrink-0" /> {place}
            </p>
          )}

          {profile.occupation && (
            <p className="flex items-center gap-1.5 text-sm text-foreground/85 font-medium mb-3">
              <Briefcase size={14} className="shrink-0 text-brand" strokeWidth={1.75} />
              {profile.occupation}
            </p>
          )}

          <div className="mb-4">
            <BadgesDisplay userId={userId!} />
          </div>

          <p className="text-xs text-muted-foreground">
            Membre depuis {format(new Date(profile.created_at), "MMMM yyyy", { locale: fr })}
          </p>
        </div>

        {/* Bio */}
        {profile.bio && (
          <section className="mb-6 sm:mb-8">
            <h2 className="text-gold text-xs uppercase tracking-[0.18em] mb-3 font-body">À propos</h2>
            <p className="text-sm sm:text-base text-foreground/80 leading-relaxed">{profile.bio}</p>
          </section>
        )}

        {/* Details — editorial list, no cards */}
        {details.length > 0 && (
          <section className="mb-6 sm:mb-8 border-y border-border/40 py-5">
            <h2 className="text-gold text-xs uppercase tracking-[0.18em] mb-4 font-body">Profil</h2>
            <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
              {details.map((d) => (
                <div key={d.label}>
                  <dt className="text-[11px] text-muted-foreground mb-0.5">{d.label}</dt>
                  <dd className="text-sm text-foreground">{d.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Interests */}
        {profile.interests && profile.interests.length > 0 && (
          <section className="mb-6 sm:mb-8">
            <h2 className="text-gold text-xs uppercase tracking-[0.18em] mb-3 font-body">Centres d&apos;intérêt</h2>
            <div className="flex flex-wrap gap-1.5">
              {profile.interests.map((interest) => (
                <InterestTag key={interest}>{interest}</InterestTag>
              ))}
            </div>
          </section>
        )}

        {/* Actions */}
        {userId !== user?.id && (
          <div className="flex gap-2 sm:gap-3 mb-8">
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

        {/* Gallery */}
        {photos.length > 0 && (
          <section className="mb-6">
            <h2 className="text-gold text-xs uppercase tracking-[0.18em] mb-4 font-body">Photos</h2>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => {
                    if (galleryLocked) {
                      toast.info(plansEnticement("Galerie photos"));
                      navigate(PLANS_PATH);
                    } else setSelectedPhoto(photo.photo_url);
                  }}
                  className="aspect-square rounded-lg overflow-hidden bg-secondary/30 hover:opacity-90 transition-opacity touch-manipulation"
                >
                  <BlurredPhoto
                    src={photo.photo_url}
                    blurred={galleryLocked}
                    className="w-full h-full"
                    showLock={galleryLocked}
                  />
                </button>
              ))}
            </div>
          </section>
        )}

        {galleryLocked && userId !== user?.id && (
          <div className="mt-2 border border-brand/20 bg-brand/[0.04] p-5 sm:p-6 text-center space-y-3 rounded-xl">
            <Crown size={22} className="text-brand mx-auto" strokeWidth={1.5} />
            <div>
              <p className="font-display text-base font-medium">Photos protégées</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-sm mx-auto">
                Sur le plan Gratuit, les photos restent floutées jusqu&apos;à un match ou un abonnement Plus.
              </p>
            </div>
            <Button variant="hero" size="sm" onClick={() => navigate(PLANS_PATH)}>
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
