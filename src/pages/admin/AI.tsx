import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout, { AdminPageHeader, AdminTable, StatusBadge } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Bot, Key, Plus, RefreshCw, Trash2, RotateCcw, Zap, CheckCircle2, AlertTriangle,
} from "lucide-react";

interface AiKeyRow {
  id: string;
  label: string;
  key_prefix: string;
  priority: number;
  is_active: boolean;
  status: string;
  usage_count: number;
  last_used_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
  created_at: string;
}

interface AiSettingsRow {
  enabled: boolean;
  model_match: string;
  model_compatibility: string;
  model_icebreaker: string;
  model_coach: string;
  model_kyc: string;
}

const FREE_MODELS = [
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.0-flash-lite-001",
  "meta-llama/llama-3.2-3b-instruct:free",
  "qwen/qwen-2.5-7b-instruct:free",
];

const FEATURES = [
  { key: "model_match" as const, label: "Matching IA (Discover)" },
  { key: "model_compatibility" as const, label: "Compatibilité" },
  { key: "model_icebreaker" as const, label: "Icebreakers" },
  { key: "model_coach" as const, label: "Coach Dating" },
  { key: "model_kyc" as const, label: "Vérification KYC" },
];

export default function AdminAI() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [keys, setKeys] = useState<AiKeyRow[]>([]);
  const [settings, setSettings] = useState<AiSettingsRow>({
    enabled: true,
    model_match: FREE_MODELS[0],
    model_compatibility: FREE_MODELS[0],
    model_icebreaker: FREE_MODELS[0],
    model_coach: FREE_MODELS[0],
    model_kyc: FREE_MODELS[0],
  });

  const [newKey, setNewKey] = useState({ label: "", apiKey: "", priority: 0 });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_get_ai_config");
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const payload = data as { settings: AiSettingsRow; keys: AiKeyRow[] };
    if (payload.settings) setSettings(payload.settings);
    setKeys(payload.keys ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    const { error } = await supabase.rpc("admin_update_ai_settings", {
      p_enabled: settings.enabled,
      p_model_match: settings.model_match,
      p_model_compatibility: settings.model_compatibility,
      p_model_icebreaker: settings.model_icebreaker,
      p_model_coach: settings.model_coach,
      p_model_kyc: settings.model_kyc,
    });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Configuration IA enregistrée");
  };

  const handleAddKey = async () => {
    if (!newKey.apiKey.trim()) {
      toast.error("Collez une clé OpenRouter (sk-or-v1-...)");
      return;
    }

    const { error } = await supabase.rpc("admin_add_ai_key", {
      p_label: newKey.label || "Clé OpenRouter",
      p_api_key: newKey.apiKey.trim(),
      p_priority: newKey.priority,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Clé ajoutée");
    setNewKey({ label: "", apiKey: "", priority: keys.length });
    load();
  };

  const handleResetKey = async (id: string) => {
    const { error } = await supabase.rpc("admin_reset_ai_key", { p_id: id });
    if (error) toast.error(error.message);
    else {
      toast.success("Clé réactivée");
      load();
    }
  };

  const handleToggleKey = async (key: AiKeyRow) => {
    const { error } = await supabase.rpc("admin_update_ai_key", {
      p_id: key.id,
      p_is_active: !key.is_active,
    });
    if (error) toast.error(error.message);
    else load();
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm("Supprimer cette clé API ?")) return;
    const { error } = await supabase.rpc("admin_delete_ai_key", { p_id: id });
    if (error) toast.error(error.message);
    else {
      toast.success("Clé supprimée");
      load();
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("icebreaker", {
        body: {
          userProfile: {
            display_name: "Test",
            age: 28,
            city: "Abidjan",
            bio: "Passionné de voyage",
            interests: ["musique", "sport"],
          },
          targetProfile: {
            display_name: "Demo",
            age: 26,
            city: "Abidjan",
            bio: "Amoureuse de la cuisine",
            interests: ["cuisine", "danse"],
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.messages?.length > 0) {
        toast.success(`IA connectée — ${data.messages.length} icebreaker(s) généré(s)`);
      } else {
        toast.warning("IA répond mais sans résultat — vérifiez les modèles");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test IA échoué");
    } finally {
      setTesting(false);
      load();
    }
  };

  const activeKeys = keys.filter((k) => k.is_active && k.status === "active").length;
  const exhaustedKeys = keys.filter((k) => k.status === "exhausted").length;

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Intelligence artificielle"
        description="OpenRouter — modèles gratuits, rotation automatique des clés API"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Key className="text-primary" size={20} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Clés actives</p>
            <p className="text-2xl font-bold">{activeKeys}</p>
          </div>
        </div>
        <div className="glass-card p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="text-amber-500" size={20} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Crédits épuisés</p>
            <p className="text-2xl font-bold">{exhaustedKeys}</p>
          </div>
        </div>
        <div className="glass-card p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Bot className="text-emerald-500" size={20} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Statut global</p>
            <p className="text-lg font-bold">{settings.enabled ? "Activé" : "Désactivé"}</p>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="glass-card p-6 rounded-2xl mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap size={20} className="text-primary" />
            Modèles par fonctionnalité
          </h2>
          <div className="flex items-center gap-3">
            <Label htmlFor="ai-enabled" className="text-sm text-muted-foreground">IA activée</Label>
            <Switch
              id="ai-enabled"
              checked={settings.enabled}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, enabled: v }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {FEATURES.map(({ key, label }) => (
            <div key={key}>
              <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
              <select
                value={settings[key]}
                onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
                className="w-full h-10 px-3 rounded-xl bg-secondary/50 border border-border/50 text-sm"
              >
                {FREE_MODELS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <Input
                className="mt-2 text-xs"
                placeholder="Ou modèle personnalisé OpenRouter"
                value={settings[key]}
                onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer la configuration"}
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            <CheckCircle2 size={16} className="mr-2" />
            {testing ? "Test en cours..." : "Tester la connexion IA"}
          </Button>
        </div>
      </div>

      {/* Add key */}
      <div className="glass-card p-6 rounded-2xl mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus size={20} className="text-primary" />
          Ajouter une clé OpenRouter
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Ajoutez plusieurs clés gratuites OpenRouter. En cas d&apos;épuisement des crédits,
          le système bascule automatiquement sur la clé suivante (par priorité).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Nom (ex: Clé gratuite #1)"
            value={newKey.label}
            onChange={(e) => setNewKey((k) => ({ ...k, label: e.target.value }))}
          />
          <Input
            placeholder="sk-or-v1-..."
            type="password"
            value={newKey.apiKey}
            onChange={(e) => setNewKey((k) => ({ ...k, apiKey: e.target.value }))}
          />
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Priorité"
              value={newKey.priority}
              onChange={(e) => setNewKey((k) => ({ ...k, priority: Number(e.target.value) }))}
              className="w-24"
            />
            <Button onClick={handleAddKey} className="flex-1">
              <Plus size={16} className="mr-1" />
              Ajouter
            </Button>
          </div>
        </div>
      </div>

      {/* Keys list */}
      <h2 className="text-lg font-semibold mb-4">Pool de clés API</h2>
      <AdminTable>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Chargement...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground font-medium border-b border-border/50">
              <tr>
                <th className="px-6 py-4">Nom</th>
                <th className="px-6 py-4">Clé</th>
                <th className="px-6 py-4">Priorité</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Utilisations</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {keys.map((key) => (
                <tr key={key.id} className="hover:bg-secondary/20">
                  <td className="px-6 py-4 font-medium">{key.label}</td>
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{key.key_prefix}</td>
                  <td className="px-6 py-4">{key.priority}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={key.status} />
                    {!key.is_active && (
                      <span className="ml-2 text-xs text-muted-foreground">(désactivée)</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span>{key.usage_count}</span>
                    {key.last_error_message && (
                      <p className="text-xs text-red-400 mt-1 truncate max-w-[200px]" title={key.last_error_message}>
                        {key.last_error_message}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-1">
                    {key.status !== "active" && (
                      <button
                        onClick={() => handleResetKey(key.id)}
                        className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg"
                        title="Réactiver (crédits rechargés)"
                      >
                        <RotateCcw size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleKey(key)}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg"
                      title={key.is_active ? "Désactiver" : "Activer"}
                    >
                      <RefreshCw size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteKey(key.id)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {keys.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Aucune clé en base — ajoutez-en une ou configurez OPENROUTER_API_KEY côté Supabase
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </AdminTable>
    </AdminLayout>
  );
}
