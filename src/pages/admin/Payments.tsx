import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout, { AdminPageHeader, AdminTable, StatusBadge } from "@/components/AdminLayout";
import { formatFcfa } from "@/lib/admin";

interface PaymentOrder {
  id: string;
  user_id: string;
  plan: string;
  amount: number;
  status: string;
  client_name: string | null;
  client_phone: string | null;
  created_at: string;
  display_name?: string;
}

export default function AdminPayments() {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("payment_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (!data) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(data.map((o) => o.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const nameMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.display_name]));

      const enriched = data.map((o) => ({
        ...o,
        display_name: nameMap[o.user_id] || "Anonyme",
      }));

      setOrders(enriched);
      setTotalRevenue(
        enriched.filter((o) => o.status === "paid").reduce((sum, o) => sum + o.amount, 0),
      );
      setLoading(false);
    }
    load();
  }, []);

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Paiements"
        description="Historique des transactions Moneyfusion"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-4 rounded-xl">
          <p className="text-xs text-muted-foreground">Revenus totaux</p>
          <p className="text-xl font-bold text-emerald-500">{formatFcfa(totalRevenue)}</p>
        </div>
        <div className="glass-card p-4 rounded-xl">
          <p className="text-xs text-muted-foreground">Commandes payées</p>
          <p className="text-xl font-bold">{orders.filter((o) => o.status === "paid").length}</p>
        </div>
        <div className="glass-card p-4 rounded-xl">
          <p className="text-xs text-muted-foreground">En attente</p>
          <p className="text-xl font-bold">{orders.filter((o) => o.status === "pending").length}</p>
        </div>
      </div>

      <AdminTable>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Chargement...</div>
        ) : (
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="bg-secondary/50 text-muted-foreground font-medium border-b border-border/50">
              <tr>
                <th className="px-6 py-4">Utilisateur</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Montant</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Téléphone</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-secondary/20">
                  <td className="px-6 py-4 font-medium">{o.display_name}</td>
                  <td className="px-6 py-4 capitalize">{o.plan}</td>
                  <td className="px-6 py-4">{formatFcfa(o.amount)}</td>
                  <td className="px-6 py-4">{o.client_name || "-"}</td>
                  <td className="px-6 py-4">{o.client_phone || "-"}</td>
                  <td className="px-6 py-4"><StatusBadge status={o.status} /></td>
                  <td className="px-6 py-4">{new Date(o.created_at).toLocaleDateString("fr-FR")}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    Aucun paiement enregistré
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
