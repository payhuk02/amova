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
  Eye, EyeOff, Lock, Mail, LogOut, ChevronRight, AlertTriangle, Download, Ban,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { useAdmin } from "@/hooks/useAdmin";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useSubscription } from "@/hooks/useSubscription";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { getLimitErrorMessage } from "@/lib/limits";
import type { ProfileUpdate } from "@/lib/supabase-helpers";

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { position, loading: geoLoading, requestLocation } = useGeolocation();
  const { limits } = useSubscription();
  const { isAdmin } = useAdmin();
  const { unblock } = useBlockedUsers();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [exporting, setExporting] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<
    Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>
  >([]);

  const loadBlockedUsers = async () => {
    const { data } = await supabase.rpc("get_my_blocked_users");
    setBlockedUsers((data as typeof blockedUsers) ?? []);
  };

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
        .select("incognito_mode, latitude, longitude, notif_matches, notif_messages, notif_likes, notif_events")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setSettings({
          incognito_mode: data.incognito_mode || false,
          has_location: data.latitude != null,
        });
        setNotifPrefs({
          matches: data.notif_matches ?? true,
          messages: data.notif_messages ?? true,
          likes: data.notif_likes ?? true,
          events: data.notif_events ?? true,
        });
      }

      setLoading(false);
      await loadBlockedUsers();
    };
    load();
  }, [user]);

  const handleUnblock = async (blockedId: string, name: string | null) => {
    await unblock(blockedId);
    setBlockedUsers((prev) => prev.filter((u) => u.user_id !== blockedId));
    toast.success(`${name || "Utilisateur"} débloqué`);
  };

  const saveNotifPrefs = async (prefs: typeof notifPrefs) => {
    setNotifPrefs(prefs);
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        notif_matches: prefs.matches,
        notif_messages: prefs.messages,
        notif_likes: prefs.likes,
        notif_events: prefs.events,
      } satisfies ProfileUpdate)
      .eq("user_id", user.id);
    if (error) toast.error("Impossible d'enregistrer les préférences");
  };

  const handleExportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const { data, error } = await supabase.rpc("export_my_data");
      if (error) throw error;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `amova-export-${user.id.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export téléchargé");
    } catch {
      toast.error("Impossible d'exporter vos données");
    } finally {
      setExporting(false);
    }
  };

  const toggleIncognito = async (checked: boolean) => {
    if (!user) return;
    if (checked && !limits.incognitoMode) {
      toast.error("Le mode incognito est réservé au plan VIP.");
      return;
    }
    setSettings((s) => ({ ...s, incognito_mode: checked }));
    const { error } = await supabase
      .from("profiles")
      .update({ incognito_mode: checked } satisfies ProfileUpdate)
      .eq("user_id", user.id);
    if (error) {
      const limitMsg = getLimitErrorMessage(error);
      toast.error(limitMsg || "Impossible d'activer le mode incognito");
      setSettings((s) => ({ ...s, incognito_mode: !checked }));
      return;
    }
    toast.success(checked ? "Mode incognito activé" : "Mode incognito désactivé");
  };

  const handleLocationToggle = async () => {
    if (settings.has_location) {
      // Remove location
      if (!user) return;
      await supabase
        .from("profiles")
        .update({ latitude: null, longitude: null } satisfies ProfileUpdate)
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
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée");

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        },
      );

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || "Suppression impossible");
      }

      toast.success("Votre compte a été supprimé");
      await signOut();
      navigate("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression");
    } finally {
      setSaving(false);
    }
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

        {isAdmin && (
          <section className="mb-6 sm:mb-8">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Administration</h2>
            <button
              onClick={() => navigate("/admin")}
              className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-secondary/50 transition-colors touch-manipulation border border-primary/20"
            >
              <div className="flex items-center gap-3">
                <Shield size={18} className="text-primary" />
                <span className="text-sm font-medium">Panneau d&apos;administration</span>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          </section>
        )}

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

            <button
              onClick={handleExportData}
              disabled={exporting}
              className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-secondary/50 transition-colors touch-manipulation"
            >
              <div className="flex items-center gap-3">
                <Download size={18} className="text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium block">Exporter mes données</span>
                  <span className="text-xs text-muted-foreground">Conformité RGPD</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>

            {blockedUsers.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3.5">
                  Utilisateurs bloqués
                </p>
                <div className="space-y-1">
                  {blockedUsers.map((blocked) => (
                    <div
                      key={blocked.user_id}
                      className="flex items-center justify-between p-3.5 rounded-xl"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                          {blocked.avatar_url ? (
                            <img src={blocked.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Ban size={14} className="text-muted-foreground" />
                          )}
                        </div>
                        <span className="text-sm font-medium truncate">
                          {blocked.display_name || "Utilisateur"}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 h-8 text-xs"
                        onClick={() => void handleUnblock(blocked.user_id, blocked.display_name)}
                      >
                        Débloquer
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                    disabled={deleteInput !== "SUPPRIMER" || saving}
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
