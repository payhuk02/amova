import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { CheckCircle, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
}

export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadReports() {
    setLoading(true);
    const { data } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) {
      setReports(data as any[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadReports();
  }, []);

  const handleResolve = async (reportId: string) => {
    const { error } = await supabase
      .from("reports")
      .update({ status: 'resolved' })
      .eq("id", reportId);
      
    if (error) {
      toast.error("Erreur lors de la résolution");
    } else {
      toast.success("Signalement résolu");
      setReports(reports.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
    }
  };
  
  const handleDeleteReportedUser = async (userId: string, reportId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer l'utilisateur signalé ?")) return;

    const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
    
    if (error) {
      toast.error("Erreur lors de la suppression de l'utilisateur");
    } else {
      // Mark as resolved
      await supabase.from("reports").update({ status: 'resolved' }).eq("id", reportId);
      toast.success("Utilisateur supprimé et signalement résolu");
      loadReports();
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-semibold mb-2">Signalements</h1>
        <p className="text-muted-foreground">Gérez les comportements inappropriés et les plaintes.</p>
      </div>

      <div className="bg-secondary/30 rounded-2xl border border-border/50 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Chargement...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground font-medium border-b border-border/50">
              <tr>
                <th className="px-6 py-4">ID Signalé</th>
                <th className="px-6 py-4">Raison</th>
                <th className="px-6 py-4">Détails</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs">{r.reported_id}</td>
                  <td className="px-6 py-4 font-medium text-foreground">{r.reason}</td>
                  <td className="px-6 py-4 text-muted-foreground max-w-xs truncate">{r.details || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      r.status === 'pending' ? 'bg-orange-500/20 text-orange-500' : 'bg-emerald-500/20 text-emerald-500'
                    }`}>
                      {r.status === 'pending' ? 'En attente' : 'Résolu'}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex justify-end gap-2">
                    {r.status === 'pending' && (
                      <button 
                        onClick={() => handleResolve(r.id)}
                        className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                        title="Marquer comme résolu"
                      >
                        <CheckCircle size={18} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteReportedUser(r.reported_id, r.id)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Bannir l'utilisateur"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    Aucun signalement trouvé
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
