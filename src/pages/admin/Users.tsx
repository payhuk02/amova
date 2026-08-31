import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Trash2, User, Search } from "lucide-react";
import { toast } from "sonner";
import type { PlanType } from "@/hooks/useSubscription";

interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  age: number;
  city: string;
  created_at: string;
  avatar_url: string;
}

const PLAN_OPTIONS: { value: PlanType; label: string }[] = [
  { value: "free", label: "Gratuit" },
  { value: "premium", label: "Premium" },
  { value: "vip", label: "VIP" },
];

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [plans, setPlans] = useState<Record<string, PlanType>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadUsers() {
    setLoading(true);
    let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });

    if (search) {
      query = query.ilike("display_name", `%${search}%`);
    }

    const { data: profiles } = await query;
    if (profiles) {
      setUsers(profiles as Profile[]);

      const userIds = profiles.map((p) => p.user_id);
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("user_id, plan")
        .in("user_id", userIds);

      const planMap: Record<string, PlanType> = {};
      userIds.forEach((id) => {
        planMap[id] = "free";
      });
      subscriptions?.forEach((s) => {
        planMap[s.user_id] = s.plan as PlanType;
      });
      setPlans(planMap);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, [search]);

  const handlePlanChange = async (userId: string, plan: PlanType) => {
    const expiresAt = plan === "free" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.rpc("admin_set_subscription", {
      p_user_id: userId,
      p_plan: plan,
      p_expires_at: expiresAt,
    });

    if (error) {
      toast.error("Erreur lors de la mise à jour du plan");
      console.error(error);
      return;
    }

    setPlans((prev) => ({ ...prev, [userId]: plan }));
    toast.success(`Plan ${plan} activé`);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet utilisateur ? Cette action est irréversible.")) return;

    const { error } = await supabase.from("profiles").delete().eq("user_id", userId);

    if (error) {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    } else {
      toast.success("Utilisateur supprimé");
      setUsers(users.filter((u) => u.user_id !== userId));
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-display font-semibold mb-2">Utilisateurs</h1>
          <p className="text-muted-foreground">Gérez les membres et leurs abonnements</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Rechercher un nom..."
            className="pl-10 pr-4 py-2 bg-secondary/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-secondary/30 rounded-2xl border border-border/50 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Chargement...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground font-medium border-b border-border/50">
              <tr>
                <th className="px-6 py-4">Utilisateur</th>
                <th className="px-6 py-4">Âge</th>
                <th className="px-6 py-4">Ville</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Inscription</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {users.map((u) => (
                <tr key={u.user_id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground"><User size={18} /></div>
                      )}
                    </div>
                    <span className="font-medium text-foreground">{u.display_name || "Anonyme"}</span>
                  </td>
                  <td className="px-6 py-4">{u.age || "-"}</td>
                  <td className="px-6 py-4">{u.city || "-"}</td>
                  <td className="px-6 py-4">
                    <select
                      value={plans[u.user_id] || "free"}
                      onChange={(e) => handlePlanChange(u.user_id, e.target.value as PlanType)}
                      className="bg-secondary/50 border border-border/50 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {PLAN_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">{new Date(u.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(u.user_id)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
