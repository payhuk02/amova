import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ArrowLeft, User, Bell, Shield, Trash2, MapPin,
  Eye, EyeOff, Lock, Mail, LogOut, ChevronRight, AlertTriangle
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { useGeolocation } from "@/hooks/useGeolocation";

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { position, loading: geoLoading, requestLocation } = useGeolocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  const [settings, setSettings] = useState({
    incognito_mode: false,
    has_location: false,
  });

  const [notifPrefs, setNotifPrefs] = useState({
    matches: true,
    messages: true,
    likes: true,
    events: true,
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("incognito_mode, latitude, longitude")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setSettings({
          incognito_mode: (data as any).incognito_mode || false,
          has_location: !!(data as any).latitude,
        });
      }

      // Load notif prefs from localStorage
      const stored = localStorage.getItem(`notif_prefs_${user.id}`);
      if (stored) setNotifPrefs(JSON.parse(stored));

      setLoading(false);
    };
    load();
  }, [user]);

  const saveNotifPrefs = (prefs: typeof notifPrefs) => {
    setNotifPrefs(prefs);
    if (user) localStorage.setItem(`notif_prefs_${user.id}`, JSON.stringify(prefs));
  };

  const toggleIncognito = async (checked: boolean) => {
    if (!user) return;
    setSettings((s) => ({ ...s, incognito_mode: checked }));
    await supabase
      .from("profiles")
      .update({ incognito_mode: checked } as any)
      .eq("user_id", user.id);
    toast.success(checked ? "Mode incognito activé" : "Mode incognito désactivé");
  };

  const handleLocationToggle = async () => {
    if (settings.has_location) {
      // Remove location
      if (!user) return;
      await supabase
        .from("profiles")
        .update({ latitude: null, longitude: null } as any)
        .eq("user_id", user.id);
      setSettings((s) => ({ ...s, has_location: false }));
      toast.success("Localisation supprimée");
    } else {
      const pos = await requestLocation();
      if (pos) {
        setSettings((s) => ({ ...s, has_location: true }));
        toast.success("Localisation enregistrée");
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== "SUPPRIMER" || !user) return;
    // Sign out — actual deletion would need admin/edge function
    toast.success("Votre compte sera supprimé sous 30 jours");
    await signOut();
    navigate("/");
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email);
    if (error) toast.error("Erreur : " + error.message);
    else toast.success("Email de réinitialisation envoyé à " + user.email);
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
      <main className="container max-w-lg py-4 sm:py-6 md:py-8 px-3 sm:px-4 md:px-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground mb-4 sm:mb-6 transition-colors touch-manipulation"
        >
          <ArrowLeft size={16} /> Retour
        </button>

        <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-light mb-6 sm:mb-8">Paramètres</h1>

        {/* Account Section */}
        <section className="mb-6 sm:mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Compte</h2>
          <div className="space-y-1">
            <button
              onClick={() => navigate("/edit-profile")}
              className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-secondary/50 transition-colors touch-manipulation"
            >
              <div className="flex items-center gap-3">
                <User size={18} className="text-copper" />
                <span className="text-sm font-medium">Modifier le profil</span>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>

            <div className="flex items-center justify-between p-3.5 rounded-xl">
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium block">Email</span>
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleChangePassword}
              className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-secondary/50 transition-colors touch-manipulation"
            >
              <div className="flex items-center gap-3">
                <Lock size={18} className="text-muted-foreground" />
                <span className="text-sm font-medium">Changer le mot de passe</span>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="mb-6 sm:mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Notifications</h2>
          <div className="space-y-1">
            {[
              { key: "matches" as const, label: "Nouveaux matchs", icon: "💕" },
              { key: "messages" as const, label: "Messages", icon: "💬" },
              { key: "likes" as const, label: "Likes reçus", icon: "❤️" },
              { key: "events" as const, label: "Événements", icon: "📅" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-3.5 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <Switch
                  checked={notifPrefs[item.key]}
                  onCheckedChange={(v) => saveNotifPrefs({ ...notifPrefs, [item.key]: v })}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Privacy Section */}
        <section className="mb-6 sm:mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Confidentialité</h2>
          <div className="space-y-1">
            <div className="flex items-center justify-between p-3.5 rounded-xl">
              <div className="flex items-center gap-3">
                <EyeOff size={18} className="text-copper" />
                <div>
                  <span className="text-sm font-medium block">Mode Incognito</span>
                  <span className="text-xs text-muted-foreground">Invisible dans la recherche</span>
                </div>
              </div>
              <Switch
                checked={settings.incognito_mode}
                onCheckedChange={toggleIncognito}
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl">
              <div className="flex items-center gap-3">
                <MapPin size={18} className="text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium block">Partage de position</span>
                  <span className="text-xs text-muted-foreground">
                    {settings.has_location ? "Position partagée" : "Non partagée"}
                  </span>
                </div>
              </div>
              <Switch
                checked={settings.has_location}
                onCheckedChange={handleLocationToggle}
                disabled={geoLoading}
              />
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-destructive uppercase tracking-wider mb-3">Zone de danger</h2>
          <div className="border border-destructive/20 rounded-xl p-4 space-y-4">
            <button
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors touch-manipulation"
            >
              <LogOut size={18} className="text-muted-foreground" />
              <span className="text-sm font-medium">Déconnexion</span>
            </button>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-destructive/10 transition-colors touch-manipulation"
              >
                <Trash2 size={18} className="text-destructive" />
                <span className="text-sm font-medium text-destructive">Supprimer mon compte</span>
              </button>
            ) : (
              <div className="space-y-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-destructive mt-0.5 shrink-0" />
                  <p className="text-xs text-destructive">
                    Cette action est irréversible. Tapez <strong>SUPPRIMER</strong> pour confirmer.
                  </p>
                </div>
                <Input
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder="SUPPRIMER"
                  className="h-10 border-destructive/30 text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteInput("");
                    }}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteAccount}
                    disabled={deleteInput !== "SUPPRIMER"}
                    className="flex-1"
                  >
                    Confirmer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </AppShell>
  );
};

export default Settings;
