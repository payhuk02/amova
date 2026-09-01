import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";

const ProfileSetup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    display_name: "",
    gender: "",
    age: "",
    city: "",
    looking_for: "",
    bio: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) {
          navigate("/dashboard");
        }
      });
  }, [user, navigate]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Erreur lors de l'upload");
      setUploading(false);
      return;
    }

    const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(publicUrl.publicUrl);
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const profileData = {
        display_name: form.display_name,
        gender: form.gender,
        age: parseInt(form.age),
        city: form.city,
        looking_for: form.looking_for,
        bio: form.bio,
        avatar_url: avatarUrl,
      };

      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      let error;
      if (existing) {
        ({ error } = await supabase
          .from("profiles")
          .update(profileData)
          .eq("user_id", user.id));
      } else {
        ({ error } = await supabase
          .from("profiles")
          .insert({ ...profileData, user_id: user.id }));
      }

      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["profile-complete"] });
      toast.success("Profil créé avec succès !");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const genderOptions = [
    { value: "homme", label: "Homme" },
    { value: "femme", label: "Femme" },
    { value: "autre", label: "Autre" },
  ];

  const lookingForOptions = [
    { value: "homme", label: "Un homme" },
    { value: "femme", label: "Une femme" },
    { value: "les deux", label: "Les deux" },
  ];

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 safe-area-top safe-area-bottom">
      <div className="w-full max-w-md">
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-light mb-1 sm:mb-2">Complétez votre profil</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mb-6 sm:mb-8">
          Ces informations restent confidentielles et vous aident à trouver la bonne personne.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Avatar upload */}
          <div className="flex justify-center">
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
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </div>

          <div>
            <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">Prénom ou pseudonyme</label>
            <Input
              value={form.display_name}
              onChange={(e) => update("display_name", e.target.value)}
              placeholder="Votre prénom"
              required
              className="h-11 sm:h-12 bg-secondary/50 border-border/50 text-base"
            />
          </div>

          <div>
            <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">Vous êtes</label>
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
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">Âge</label>
              <Input
                type="number"
                min={18}
                max={120}
                value={form.age}
                onChange={(e) => update("age", e.target.value)}
                placeholder="28"
                required
                className="h-11 sm:h-12 bg-secondary/50 border-border/50 tabular-nums text-base"
              />
            </div>
            <div>
              <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">Ville</label>
              <Input
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder="Paris"
                className="h-11 sm:h-12 bg-secondary/50 border-border/50 text-base"
              />
            </div>
          </div>

          <div>
            <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">Vous cherchez</label>
            <div className="flex gap-2 sm:gap-3">
              {lookingForOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("looking_for", opt.value)}
                  className={`flex-1 h-11 sm:h-12 rounded-lg border text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation active:scale-[0.97] ${
                    form.looking_for === opt.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5 block">Bio (optionnel)</label>
            <textarea
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
              placeholder="Quelques mots sur vous..."
              maxLength={300}
              rows={3}
              className="w-full rounded-lg border border-border/50 bg-secondary/50 px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
            />
          </div>

          <Button
            variant="hero"
            size="xl"
            className="w-full touch-manipulation"
            disabled={loading || !form.display_name || !form.gender || !form.age || !form.looking_for}
          >
            {loading ? "Enregistrement..." : "Commencer l'aventure"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
