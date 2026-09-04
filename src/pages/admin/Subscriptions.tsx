import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout, { AdminPageHeader, AdminTable, StatusBadge } from "@/components/AdminLayout";
import { toast } from "sonner";
import type { PlanType } from "@/hooks/useSubscription";

interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  display_name?: string;
}

const PLAN_OPTIONS: { value: PlanType; label: string }[] = [
  { value: "free", label: "Gratuit" },
  { value: "plus", label: "Plus" },
  { value: "premium", label: "Premium" },
  { value: "vip", label: "VIP" },
];

export default function AdminSubscriptions() {
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "expiring">("all");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (!data) {
      setSubs([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(data.map((s) => s.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);

    const nameMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.display_name]));

    let rows = data.map((s) => ({
      ...s,
      display_name: nameMap[s.user_id] || "Anonyme",
    }));

    if (filter === "active") {
      rows = rows.filter((s) => s.status === "active" && s.plan !== "free");
    } else if (filter === "expiring") {
      const week = Date.now() + 7 * 24 * 60 * 60 * 1000;
      rows = rows.filter(
        (s) => s.expires_at && new Date(s.expires_at).getTime() < week && s.plan !== "free",
      );
    }

    setSubs(rows);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [filter]);

  const handlePlanChange = async (userId: string, plan: PlanType) => {
    const expiresAt = plan === "free" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.rpc("admin_set_subscription", {
      p_user_id: userId,
      p_plan: plan,
      p_expires_at: expiresAt,
    });

    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }

    toast.success(`Plan ${plan} activé`);
    load();
  };

  const isExpired = (expiresAt: string | null) =>
    expiresAt && new Date(expiresAt) < new Date();

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Abonnements"
        description="Gérez les abonnements Plus, Premium et VIP"
      />

      <div className="flex gap-2 mb-6 flex-wrap">
        {([
          { key: "all", label: "Tous" },
          { key: "active", label: "Actifs" },
          { key: "expiring", label: "Expire bientôt" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === key ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <AdminTable>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Chargement...</div>
        ) : (
          <table className="w-full text-sm text-left min-w-[700px]">
            <thead className="bg-secondary/50 text-muted-foreground font-medium border-b border-border/50">
              <tr>
                <th className="px-6 py-4">Utilisateur</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Début</th>
                <th className="px-6 py-4">Expiration</th>
                <th className="px-6 py-4">Modifier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {subs.map((s) => (
                <tr key={s.id} className="hover:bg-secondary/20">
                  <td className="px-6 py-4 font-medium">{s.display_name}</td>
                  <td className="px-6 py-4 capitalize font-medium">{s.plan}</td>
                  <td className="px-6 py-4"><StatusBadge status={s.status} /></td>
                  <td className="px-6 py-4">{new Date(s.started_at).toLocaleDateString("fr-FR")}</td>
                  <td className="px-6 py-4">
                    {s.expires_at ? (
                      <span className={isExpired(s.expires_at) ? "text-red-500" : ""}>
                        {new Date(s.expires_at).toLocaleDateString("fr-FR")}
                      </span>
                    ) : "-"}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={s.plan}
                      onChange={(e) => handlePlanChange(s.user_id, e.target.value as PlanType)}
                      className="bg-secondary/50 border border-border/50 rounded-lg px-2 py-1 text-xs"
                    >
                      {PLAN_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {subs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Aucun abonnement trouvé
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
