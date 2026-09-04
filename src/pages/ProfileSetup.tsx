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
import {
  COUNTRIES_FR,
  OCCUPATION_SECTORS,
  PARTNER_PREFERENCE_OPTIONS,
  RELATIONSHIP_TYPES,
  RELIGIONS,
} from "@/lib/profile-options";
import { toast } from "sonner";
import { Camera, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const SELECT_CLASS =
  "h-11 sm:h-12 w-full rounded-lg border border-border/50 bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:border-primary/50";

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
    country: "",
    looking_for: "",
    bio: "",
    religion: "",
    relationship_type: "",
    occupation: "",
    occupation_sector: "",
    partner_preferences: [] as string[],
    dobDay: "",
    dobMonth: "",
    dobYear: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select(
        "display_name, date_of_birth, gender, age, looking_for, city, country, avatar_url, bio, religion, relationship_type, occupation, occupation_sector, partner_preferences",
      )
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (isProfileComplete(data as Parameters<typeof isProfileComplete>[0])) {
          navigate("/dashboard", { replace: true });
          return;
        }
        if (data) {
          const dobParts = splitIsoDate(data.date_of_birth);
          const row = data as Record<string, unknown>;
          setGenderLocked(Boolean(data.gender?.trim()));
          setDobLocked(Boolean(data.date_of_birth));
          setForm((f) => ({
            ...f,
            display_name: data.display_name || f.display_name,
            gender: data.gender || f.gender,
            city: data.city || f.city,
            country: (row.country as string) || f.country,
            looking_for: data.looking_for || f.looking_for,
            bio: data.bio || f.bio,
            religion: (row.religion as string) || f.religion,
            relationship_type: (row.relationship_type as string) || f.relationship_type,
            occupation: (row.occupation as string) || f.occupation,
            occupation_sector: (row.occupation_sector as string) || f.occupation_sector,
            partner_preferences: Array.isArray(row.partner_preferences)
              ? (row.partner_preferences as string[])
              : f.partner_preferences,
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

  const togglePref = (pref: string) => {
    setForm((f) => {
      const has = f.partner_preferences.includes(pref);
      if (has) return { ...f, partner_preferences: f.partner_preferences.filter((p) => p !== pref) };
      if (f.partner_preferences.length >= 6) {
        toast.error("Choisissez au plus 6 critères");
        return f;
      }
      return { ...f, partner_preferences: [...f.partner_preferences, pref] };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!avatarUrl) return toast.error("Ajoutez une photo de profil pour continuer");
    if (!form.gender) return toast.error("Indiquez votre genre — ce choix sera définitif");
    if (!form.country) return toast.error("Indiquez votre pays");
    if (!form.city.trim()) return toast.error("Indiquez votre ville");
    if (!form.religion) return toast.error("Indiquez votre religion");
    if (!form.relationship_type) return toast.error("Indiquez le type de relation recherché");
    if (!form.occupation_sector) return toast.error("Indiquez votre secteur d'activité");
    if (!form.occupation.trim()) return toast.error("Indiquez votre métier / fonction");
    if (form.partner_preferences.length < 1) {
      return toast.error("Choisissez au moins un critère pour le profil recherché");
    }
    if (!confirmAdult) return toast.error("Confirmez que vous avez 18 ans ou plus");

    const dob = parseDobParts(form.dobYear, form.dobMonth, form.dobDay);
    if ("error" in dob) return toast.error(dob.error);

    const lookingFor = form.gender === "homme" ? "femme" : "homme";

    setLoading(true);
    try {
      const profileData: Record<string, unknown> = {
        display_name: form.display_name.trim(),
        city: form.city.trim(),
        country: form.country,
        looking_for: lookingFor,
        bio: form.bio.trim() || null,
        avatar_url: avatarUrl.split("?")[0],
        religion: form.religion,
        relationship_type: form.relationship_type,
        occupation: form.occupation.trim(),
        occupation_sector: form.occupation_sector,
        partner_preferences: form.partner_preferences,
      };
      if (!genderLocked) profileData.gender = form.gender;
      if (!dobLocked) {
        profileData.date_of_birth = dob.iso;
        profileData.age = dob.age;
      }

      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

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
      if (msg.includes("gender_locked")) toast.error("Le genre ne peut plus être modifié");
      else if (msg.includes("date_of_birth_locked")) toast.error("La date de naissance ne peut plus être modifiée");
      else if (msg.includes("must_be_18")) toast.error("Amova est réservé aux majeurs (18+)");
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, value: string) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "gender" && !genderLocked) {
        if (value === "homme") next.looking_for = "femme";
        if (value === "femme") next.looking_for = "homme";
      }
      return next;
    });
  };

  const canSubmit =
    Boolean(avatarUrl) &&
    Boolean(form.display_name.trim()) &&
    Boolean(form.gender) &&
    Boolean(form.dobDay && form.dobMonth && form.dobYear) &&
    Boolean(form.country) &&
    Boolean(form.city.trim()) &&
    Boolean(form.religion) &&
    Boolean(form.relationship_type) &&
    Boolean(form.occupation_sector) &&
    Boolean(form.occupation.trim()) &&
    form.partner_preferences.length > 0 &&
    confirmAdult &&
    !loading &&
    !uploading;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 safe-area-top safe-area-bottom">
      <div className="w-full max-w-md">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-champagne/10 text-champagne text-xs font-medium mb-4 border border-champagne/20">
          <ShieldCheck size={14} />
          Inscription sécurisée · 18+ · Matching H↔F
        </div>
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-light mb-1 sm:mb-2">
          Créez votre profil Amova
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mb-6 sm:mb-8">
          Genre et date de naissance sont définitifs. Renseignez aussi votre situation et vos critères.
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
            </button>
            <p className="text-[10px] text-muted-foreground">Photo de profil obligatoire</p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUpload} />
          </div>

          <div>
            <label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">Prénom ou pseudonyme</label>
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
            <label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">
              Vous êtes <span className="text-champagne">{genderLocked ? "(verrouillé)" : "(définitif)"}</span>
            </label>
            <div className="flex gap-2 sm:gap-3">
              {[
                { value: "homme", label: "Homme" },
                { value: "femme", label: "Femme" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={genderLocked}
                  onClick={() => update("gender", opt.value)}
                  className={cn(
                    "flex-1 h-11 sm:h-12 rounded-lg border text-xs sm:text-sm font-medium transition-all touch-manipulation disabled:opacity-80",
                    form.gender === opt.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/50 bg-secondary/30 text-muted-foreground",
                  )}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">Pays</label>
              <select
                value={form.country}
                onChange={(e) => update("country", e.target.value)}
                required
                className={SELECT_CLASS}
              >
                <option value="">Choisir…</option>
                {COUNTRIES_FR.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">Ville</label>
              <Input
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder="Ouagadougou, Abidjan…"
                required
                className="h-11 sm:h-12 bg-secondary/50 border-border/50 text-base"
              />
            </div>
          </div>

          <div>
            <label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">Religion</label>
            <div className="grid grid-cols-2 gap-2">
              {RELIGIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("religion", opt.value)}
                  className={cn(
                    "h-10 rounded-lg border text-xs font-medium",
                    form.religion === opt.value
                      ? "border-primary bg-primary/10"
                      : "border-border/50 bg-secondary/30 text-muted-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">
              Type de relation recherchée
            </label>
            <div className="flex flex-col gap-2">
              {RELATIONSHIP_TYPES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("relationship_type", opt.value)}
                  className={cn(
                    "h-11 rounded-lg border text-sm font-medium text-left px-3",
                    form.relationship_type === opt.value
                      ? "border-primary bg-primary/10"
                      : "border-border/50 bg-secondary/30 text-muted-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">Secteur d&apos;activité</label>
            <select
              value={form.occupation_sector}
              onChange={(e) => update("occupation_sector", e.target.value)}
              required
              className={SELECT_CLASS}
            >
              <option value="">Choisir…</option>
              {OCCUPATION_SECTORS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">Métier / fonction</label>
            <Input
              value={form.occupation}
              onChange={(e) => update("occupation", e.target.value)}
              placeholder="Ex. Enseignant, Infirmière, Commerçant…"
              required
              maxLength={80}
              className="h-11 sm:h-12 bg-secondary/50 border-border/50 text-base"
            />
          </div>

          <div>
            <label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">
              Vous cherchez{" "}
              {form.gender === "homme" ? "une femme" : form.gender === "femme" ? "un homme" : "…"} — critères
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PARTNER_PREFERENCE_OPTIONS.map((pref) => {
                const on = form.partner_preferences.includes(pref);
                return (
                  <button
                    key={pref}
                    type="button"
                    onClick={() => togglePref(pref)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-full text-[11px] border transition-colors",
                      on
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border/40 bg-secondary/40 text-muted-foreground",
                    )}
                  >
                    {pref}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">1 à 6 critères</p>
          </div>

          <div>
            <label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">Bio (optionnel)</label>
            <textarea
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
              placeholder="Quelques mots sur vous..."
              maxLength={300}
              rows={3}
              className="w-full rounded-lg border border-border/50 bg-secondary/50 px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-primary/50"
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

          <Button type="submit" variant="hero" size="xl" className="w-full" disabled={!canSubmit}>
            {loading ? "Enregistrement..." : "Valider mon profil"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
