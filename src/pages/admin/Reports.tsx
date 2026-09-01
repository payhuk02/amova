import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout, { AdminPageHeader, AdminTable, StatusBadge } from "@/components/AdminLayout";
import { CheckCircle, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter_name?: string;
  reported_name?: string;
}

export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("pending");

  async function loadReports() {
    setLoading(true);
    let query = supabase.from("reports").select("*").order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query;

    if (!data) {
      setReports([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(data.flatMap((r) => [r.reporter_id, r.reported_id]))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);

    const nameMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.display_name]));

    setReports(
      data.map((r) => ({
        ...r,
        reporter_name: nameMap[r.reporter_id] || "Inconnu",
        reported_name: nameMap[r.reported_id] || "Inconnu",
      })) as Report[],
    );
    setLoading(false);
  }

  useEffect(() => {
    void loadReports();
  }, [filter]);

  const handleResolve = async (reportId: string) => {
    const { error } = await supabase.from("reports").update({ status: "resolved" }).eq("id", reportId);

    if (error) {
      toast.error("Erreur lors de la résolution");
    } else {
      toast.success("Signalement résolu");
      void loadReports();
    }
  };

  const handleDeleteReportedUser = async (userId: string, reportId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer l'utilisateur signalé ?")) return;

    const { error } = await supabase.from("profiles").delete().eq("user_id", userId);

    if (error) {
      toast.error("Erreur lors de la suppression de l'utilisateur");
    } else {
      await supabase.from("reports").update({ status: "resolved" }).eq("id", reportId);
      toast.success("Utilisateur supprimé et signalement résolu");
      void loadReports();
    }
  };

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Signalements"
        description="Gérez les comportements inappropriés et les plaintes"
      />

      <div className="flex gap-2 mb-6">
        {(["pending", "resolved", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground"
            }`}
          >
            {f === "pending" ? "En attente" : f === "resolved" ? "Résolus" : "Tous"}
          </button>
        ))}
      </div>

      <AdminTable>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Chargement...</div>
        ) : (
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="bg-secondary/50 text-muted-foreground font-medium border-b border-border/50">
              <tr>
                <th className="px-6 py-4">Signalé</th>
                <th className="px-6 py-4">Par</th>
                <th className="px-6 py-4">Raison</th>
                <th className="px-6 py-4">Détails</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium">{r.reported_name}</div>
                    <Link
                      to={`/profile/${r.reported_id}`}
                      className="text-xs text-champagne hover:underline inline-flex items-center gap-1"
                    >
                      Voir profil <ExternalLink size={12} />
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{r.reporter_name}</td>
                  <td className="px-6 py-4 font-medium text-foreground">{r.reason}</td>
                  <td className="px-6 py-4 text-muted-foreground max-w-xs truncate">{r.details || "-"}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      {r.status === "pending" && (
                        <button
                          onClick={() => void handleResolve(r.id)}
                          className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                          title="Marquer comme résolu"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => void handleDeleteReportedUser(r.reported_id, r.id)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Supprimer le profil signalé"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    Aucun signalement trouvé
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
