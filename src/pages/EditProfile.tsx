import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { getLimitErrorMessage } from "@/lib/limits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Camera, Loader2, Plus, X, ArrowLeft, Save, EyeOff, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import AppShell from "@/components/AppShell";
import VerificationRequest from "@/components/VerificationRequest";
import DateOfBirthFields from "@/components/DateOfBirthFields";
import { formatDobFr, parseDobParts, splitIsoDate } from "@/lib/date-of-birth";

interface Photo {
  id: string;
  photo_url: string;
  position: number;
}

const EditProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { limits } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    display_name: "",
    gender: "",
    age: "",
    date_of_birth: "" as string | null,
    city: "",
    looking_for: "",
    bio: "",
    avatar_url: "",
    interests: [] as string[],
    verification_status: "none",
    incognito_mode: false,
  });
  const [dobDraft, setDobDraft] = useState({ day: "", month: "", year: "" });
  const [newInterest, setNewInterest] = useState("");
  const genderLocked = Boolean(form.gender);
  const dobLocked = Boolean(form.date_of_birth);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setForm({
          display_name: profile.display_name || "",
          gender: profile.gender || "",
          age: profile.age?.toString() || "",
          date_of_birth: (profile as { date_of_birth?: string | null }).date_of_birth || null,
          city: profile.city || "",
          looking_for: profile.looking_for || "",
          bio: profile.bio || "",
          avatar_url: profile.avatar_url || "",
          interests: (profile as any).interests || [],
          verification_status: (profile as any).verification_status || "none",
          incognito_mode: (profile as any).incognito_mode || false,
        });
        setDobDraft(splitIsoDate((profile as { date_of_birth?: string | null }).date_of_birth));
      }

      const { data: photoData } = await supabase
        .from("profile_photos")
        .select("*")
        .eq("user_id", user.id)
        .order("position");

      setPhotos((photoData as Photo[]) || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error("Erreur upload"); setUploading(false); return; }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    setForm(f => ({ ...f, avatar_url: pub.publicUrl }));
    setUploading(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/photo_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error("Erreur upload"); setUploading(false); return; }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);

    const { data: inserted } = await supabase
      .from("profile_photos")
      .insert({ user_id: user.id, photo_url: pub.publicUrl, position: photos.length })
      .select()
      .single();

    if (inserted) setPhotos(prev => [...prev, inserted as Photo]);
    setUploading(false);
    if (inserted) {
      toast.success("Photo ajoutée");
    } else {
      toast.error("Impossible d'ajouter la photo");
    }
  };

  const handleDeletePhoto = async (photo: Photo) => {
    await supabase.from("profile_photos").delete().eq("id", photo.id);
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
    toast.success("Photo supprimée");
  };

  const addInterest = () => {
    const trimmed = newInterest.trim();
    if (trimmed && !form.interests.includes(trimmed) && form.interests.length < 10) {
      setForm(f => ({ ...f, interests: [...f.interests, trimmed] }));
      setNewInterest("");
    }
  };

  const removeInterest = (interest: string) => {
    setForm(f => ({ ...f, interests: f.interests.filter(i => i !== interest) }));
  };

  const handleSave = async () => {
    if (!user) return;
    if (form.incognito_mode && !limits.incognitoMode) {
      toast.error("Le mode incognito est réservé au plan VIP.");
      return;
    }

    const payload: Record<string, unknown> = {
      display_name: form.display_name,
      city: form.city,
      looking_for: form.looking_for,
      bio: form.bio,
      avatar_url: form.avatar_url || null,
      interests: form.interests,
      incognito_mode: form.incognito_mode && limits.incognitoMode,
    };

    // One-time set only (server enforces lock afterwards)
    if (!genderLocked && form.gender) {
      payload.gender = form.gender;
    }
    if (!dobLocked) {
      const dob = parseDobParts(dobDraft.year, dobDraft.month, dobDraft.day);
      if ("error" in dob) {
        toast.error(dob.error);
        return;
      }
      payload.date_of_birth = dob.iso;
      payload.age = dob.age;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update(payload as any)
      .eq("user_id", user.id);

    if (error) {
      toast.error(getLimitErrorMessage(error) || "Erreur de sauvegarde");
    } else {
      toast.success("Profil mis à jour !");
    }
    setSaving(false);
  };

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const genderOptions = [
    { value: "homme", label: "Homme" },
    { value: "femme", label: "Femme" },
  ];

  const lookingForOptions = [
    { value: "homme", label: "Un homme" },
    { value: "femme", label: "Une femme" },
    { value: "les deux", label: "Les deux" },
  ];

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
      <main className="container max-w-lg py-4 sm:py-6 md:py-8 px-3 sm:px-4 md:px-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground mb-4 sm:mb-6 transition-colors touch-manipulation active:scale-[0.97]">
          <ArrowLeft size={16} /> Retour
        </button>

        <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-light mb-5 sm:mb-6 md:mb-8">Modifier le profil</h1>

        {/* Avatar */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <button
            type="button"
            onClick={() => avatarFileRef.current?.click()}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-secondary/50 border-2 border-dashed border-border/50 hover:border-primary/50 transition-colors flex items-center justify-center overflow-hidden relative group touch-manipulation"
          >
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : uploading ? (
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            ) : (
              <Camera className="w-6 h-6 sm:w-7 sm:h-7 text-muted-foreground group-hover:text-foreground transition-colors" />
            )}
            {form.avatar_url && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
            )}
          </button>
          <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>

        {/* Photo gallery */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 sm:mb-3">Galerie photos ({photos.length}/6)</h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {photos.map(photo => (
              <div key={photo.id} className="aspect-square rounded-lg sm:rounded-xl overflow-hidden relative group">
                <img src={photo.photo_url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => handleDeletePhoto(photo)}
                  className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity touch-manipulation active:scale-95"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {photos.length < 6 && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="aspect-square rounded-lg sm:rounded-xl border-2 border-dashed border-border/50 hover:border-primary/50 flex items-center justify-center transition-colors touch-manipulation active:scale-[0.97]"
              >
                {uploading ? <Loader2 size={18} className="animate-spin text-muted-foreground" /> : <Plus size={18} className="text-muted-foreground" />}
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>

        {/* Form fields */}
        <div className="space-y-4 sm:space-y-5">
          <div>
            <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">Prénom</label>
            <Input value={form.display_name} onChange={e => update("display_name", e.target.value)} className="h-11 sm:h-12 bg-secondary/50 border-border/50 text-base" />
          </div>

          <div>
            <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block flex items-center gap-1.5">
              Genre {genderLocked && <Lock size={12} className="text-champagne" />}
            </label>
            {genderLocked ? (
              <div className="h-11 sm:h-12 rounded-lg border border-border/40 bg-secondary/20 px-3 flex items-center text-sm">
                <span className="capitalize">{form.gender}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">Non modifiable</span>
              </div>
            ) : (
              <div className="flex gap-2 sm:gap-3">
                {genderOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("gender", opt.value)}
                    className={`flex-1 h-11 sm:h-12 rounded-lg border text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation active:scale-[0.97] ${
                      form.gender === opt.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className={dobLocked ? "" : "sm:col-span-2"}>
              {dobLocked ? (
                <>
                  <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block flex items-center gap-1.5">
                    Date de naissance <Lock size={12} className="text-champagne" />
                  </label>
                  <div className="h-11 sm:h-12 rounded-lg border border-border/40 bg-secondary/20 px-3 flex items-center text-sm tabular-nums">
                    {formatDobFr(form.date_of_birth)}
                    {form.age ? (
                      <span className="ml-auto text-xs text-muted-foreground">{form.age} ans</span>
                    ) : null}
                  </div>
                </>
              ) : (
                <DateOfBirthFields
                  day={dobDraft.day}
                  month={dobDraft.month}
                  year={dobDraft.year}
                  required
                  onChange={setDobDraft}
                />
              )}
            </div>
            <div>
              <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">Ville</label>
              <Input
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className="h-11 sm:h-12 bg-secondary/50 border-border/50 text-base"
              />
            </div>
          </div>

          <div>
            <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">Vous cherchez</label>
            <div className="flex gap-2 sm:gap-3">
              {lookingForOptions.map(opt => (
                <button key={opt.value} type="button" onClick={() => update("looking_for", opt.value)}
                  className={`flex-1 h-11 sm:h-12 rounded-lg border text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation active:scale-[0.97] ${form.looking_for === opt.value ? "border-primary bg-primary/10 text-foreground" : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/30"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">Bio</label>
            <textarea value={form.bio} onChange={e => update("bio", e.target.value)} placeholder="Quelques mots sur vous..." maxLength={300} rows={3}
              className="w-full rounded-lg border border-border/50 bg-secondary/50 px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none" />
          </div>

          {/* Interests */}
          <div>
            <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">Centres d'intérêt ({form.interests.length}/10)</label>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
              {form.interests.map(interest => (
                <span key={interest} className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-primary/10 text-foreground text-[10px] sm:text-xs font-medium">
                  {interest}
                  <button onClick={() => removeInterest(interest)} className="hover:text-destructive transition-colors touch-manipulation active:scale-95"><X size={12} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newInterest} onChange={e => setNewInterest(e.target.value)} placeholder="Ajouter un intérêt..."
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addInterest())}
                className="h-10 bg-secondary/50 border-border/50 text-sm" />
              <Button variant="outline" size="sm" onClick={addInterest} disabled={!newInterest.trim()} className="h-10 px-3 sm:px-4 touch-manipulation">
                <Plus size={14} />
              </Button>
            </div>
          </div>

          {/* Incognito mode */}
          <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-secondary/30 border border-border/50">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <EyeOff size={16} className="text-copper shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-medium">Mode Incognito</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Parcourez les profils de manière invisible</p>
              </div>
            </div>
            <Switch
              checked={form.incognito_mode}
              onCheckedChange={(checked) => {
                if (checked && !limits.incognitoMode) {
                  toast.error("Le mode incognito est réservé au plan VIP.");
                  navigate("/premium");
                  return;
                }
                setForm((f) => ({ ...f, incognito_mode: checked }));
              }}
            />
          </div>

          {/* Verification */}
          <div className="space-y-2 sm:space-y-3">
            <label className="text-xs sm:text-sm font-medium block">Vérification du profil</label>
            <VerificationRequest
              currentStatus={form.verification_status}
              avatarUrl={form.avatar_url}
            />
          </div>

          <Button variant="hero" size="xl" className="w-full touch-manipulation" onClick={handleSave} disabled={saving}>
            <Save size={16} />
            {saving ? "Enregistrement..." : "Sauvegarder"}
          </Button>
        </div>
      </main>
    </AppShell>
  );
};

export default EditProfile;
