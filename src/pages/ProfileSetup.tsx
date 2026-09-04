import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DateOfBirthFields from "@/components/DateOfBirthFields";
import { parseDobParts, splitIsoDate } from "@/lib/date-of-birth";
import { isProfileComplete } from "@/hooks/useProfileComplete";
import { toast } from "sonner";
import { Camera, Loader2, ShieldCheck } from "lucide-react";

const ProfileSetup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [confirmAdult, setConfirmAdult] = useState(false);
  const [genderLocked, setGenderLocked] = useState(false);
  const [dobLocked, setDobLocked] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    display_name: "",
    gender: "",
    city: "",
    looking_for: "",
    bio: "",
    dobDay: "",
    dobMonth: "",
    dobYear: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, date_of_birth, gender, age, looking_for, city, avatar_url, bio")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (isProfileComplete(data)) {
          navigate("/dashboard", { replace: true });
          return;
        }
        if (data) {
          const dobParts = splitIsoDate(data.date_of_birth);
          const hasGender = Boolean(data.gender?.trim());
          const hasDob = Boolean(data.date_of_birth);
          setGenderLocked(hasGender);
          setDobLocked(hasDob);
          setForm((f) => ({
            ...f,
            display_name: data.display_name || f.display_name,
            gender: data.gender || f.gender,
            city: data.city || f.city,
            looking_for: data.looking_for || f.looking_for,
            bio: data.bio || f.bio,
            dobDay: dobParts.day || f.dobDay,
            dobMonth: dobParts.month || f.dobMonth,
            dobYear: dobParts.year || f.dobYear,
          }));
          if (data.avatar_url) setAvatarUrl(data.avatar_url);
        }
      });
  }, [user, navigate]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Choisissez une image (JPEG, PNG ou WebP)");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Photo trop volumineuse (max 8 Mo)");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar.${ext}`;

    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Erreur lors de l'upload");
      setUploading(false);
      return;
    }

    const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(`${publicUrl.publicUrl}?t=${Date.now()}`);
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!avatarUrl) {
      toast.error("Ajoutez une photo de profil pour continuer");
      return;
    }
    if (!form.gender) {
      toast.error("Indiquez votre genre — ce choix sera définitif");
      return;
    }
    if (!form.city.trim()) {
      toast.error("Indiquez votre ville");
      return;
    }
    if (!form.looking_for) {
      toast.error("Indiquez qui vous recherchez");
      return;
    }
    if (!confirmAdult) {
      toast.error("Confirmez que vous avez 18 ans ou plus");
      return;
    }

    const dob = parseDobParts(form.dobYear, form.dobMonth, form.dobDay);
    if ("error" in dob) {
      toast.error(dob.error);
      return;
    }

    setLoading(true);
    try {
      const profileData: Record<string, unknown> = {
        display_name: form.display_name.trim(),
        city: form.city.trim(),
        looking_for: form.looking_for,
        bio: form.bio.trim() || null,
        avatar_url: avatarUrl.split("?")[0],
      };

      if (!genderLocked) {
        profileData.gender = form.gender;
      }
      if (!dobLocked) {
        profileData.date_of_birth = dob.iso;
        profileData.age = dob.age;
      }

      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      let error;
      if (existing) {
        ({ error } = await supabase.from("profiles").update(profileData).eq("user_id", user.id));
      } else {
        ({ error } = await supabase.from("profiles").insert({
          ...profileData,
          gender: form.gender,
          date_of_birth: dob.iso,
          age: dob.age,
          user_id: user.id,
        }));
      }

      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["profile-complete"] });
      toast.success("Profil créé — bienvenue sur Amova");
      navigate("/dashboard");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erreur";
      if (msg.includes("gender_locked")) {
        toast.error("Le genre ne peut plus être modifié");
      } else if (msg.includes("date_of_birth_locked")) {
        toast.error("La date de naissance ne peut plus être modifiée");
      } else if (msg.includes("must_be_18")) {
        toast.error("Amova est réservé aux majeurs (18+)");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, value: string) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      // Amova is heterosexual: auto-set opposite looking_for
      if (key === "gender" && !genderLocked) {
        if (value === "homme") next.looking_for = "femme";
        if (value === "femme") next.looking_for = "homme";
      }
      return next;
    });
  };
  const genderOptions = [
    { value: "homme", label: "Homme" },
    { value: "femme", label: "Femme" },
  ];

  const canSubmit =
    Boolean(avatarUrl) &&
    Boolean(form.display_name.trim()) &&
    Boolean(form.gender) &&
    Boolean(form.dobDay && form.dobMonth && form.dobYear) &&
    Boolean(form.city.trim()) &&
    Boolean(form.looking_for) &&
    confirmAdult &&
    !loading &&
    !uploading;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 safe-area-top safe-area-bottom">
      <div className="w-full max-w-md">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-champagne/10 text-champagne text-xs font-medium mb-4 border border-champagne/20">
          <ShieldCheck size={14} />
          Inscription sécurisée · 18+
        </div>
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-light mb-1 sm:mb-2">
          Créez votre profil Amova
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mb-6 sm:mb-8">
          Informations essentielles pour une communauté premium et authentique. Le genre et la date
          de naissance sont définitifs après validation.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-secondary/50 border-2 border-dashed border-border/50 hover:border-primary/50 transition-colors flex items-center justify-center overflow-hidden relative group touch-manipulation"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : uploading ? (
                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
              )}
              {avatarUrl && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              )}
            </button>
            <p className="text-[10px] text-muted-foreground">Photo de profil obligatoire</p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUpload} />
          </div>

          <div>
            <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">
              Prénom ou pseudonyme
            </label>
            <Input
              value={form.display_name}
              onChange={(e) => update("display_name", e.target.value)}
              placeholder="Votre prénom"
              required
              maxLength={40}
              className="h-11 sm:h-12 bg-secondary/50 border-border/50 text-base"
            />
          </div>

          <div>
            <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">
              Vous êtes{" "}
              <span className="text-champagne">
                {genderLocked ? "(verrouillé)" : "(définitif)"}
              </span>
            </label>
            <div className="flex gap-2 sm:gap-3">
              {genderOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={genderLocked}
                  onClick={() => update("gender", opt.value)}
                  className={`flex-1 h-11 sm:h-12 rounded-lg border text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation active:scale-[0.97] disabled:opacity-80 disabled:cursor-not-allowed ${
                    form.gender === opt.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <DateOfBirthFields
            day={form.dobDay}
            month={form.dobMonth}
            year={form.dobYear}
            required
            disabled={dobLocked}
            onChange={({ day, month, year }) =>
              setForm((f) => ({ ...f, dobDay: day, dobMonth: month, dobYear: year }))
            }
          />

          <div>
            <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">Ville</label>
            <Input
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder="Abidjan, Dakar…"
              required
              className="h-11 sm:h-12 bg-secondary/50 border-border/50 text-base"
            />
          </div>

          <div>
            <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">
              Vous cherchez
            </label>
            <div className="h-11 sm:h-12 rounded-lg border border-border/50 bg-secondary/30 px-3 flex items-center text-sm text-muted-foreground">
              {form.gender === "homme"
                ? "Une femme (matching H↔F)"
                : form.gender === "femme"
                  ? "Un homme (matching H↔F)"
                  : "Choisissez d’abord votre genre"}
            </div>
          </div>

          <div>
            <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">
              Bio (optionnel)
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
              placeholder="Quelques mots sur vous..."
              maxLength={300}
              rows={3}
              className="w-full rounded-lg border border-border/50 bg-secondary/50 px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
            />
          </div>

          <label className="flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={confirmAdult}
              onChange={(e) => setConfirmAdult(e.target.checked)}
              className="mt-0.5 rounded border-border"
              required
            />
            <span>
              Je confirme avoir au moins 18 ans et accepter les{" "}
              <Link to="/conditions" className="text-champagne hover:underline">
                conditions d&apos;utilisation
              </Link>
              .
            </span>
          </label>

          <Button
            type="submit"
            variant="hero"
            size="xl"
            className="w-full touch-manipulation"
            disabled={!canSubmit}
          >
            {loading ? "Enregistrement..." : "Valider mon profil"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
