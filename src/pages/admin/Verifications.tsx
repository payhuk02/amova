import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout, { AdminPageHeader, AdminTable, StatusBadge } from "@/components/AdminLayout";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface VerificationRequest {
  id: string;
  user_id: string;
  selfie_url: string;
  selfie_display_url?: string;
  status: string;
  created_at: string;
  display_name?: string;
  liveness_score?: number | null;
  face_match_score?: number | null;
  auto_review_status?: string | null;
  pose_challenge?: string | null;
  rejection_reason?: string | null;
}

function extractStoragePath(selfieRef: string): string {
  if (selfieRef.startsWith("http")) {
    const parts = selfieRef.split("/verifications/");
    return parts[parts.length - 1].split("?")[0];
  }
  return selfieRef;
}

async function resolveSelfieUrl(selfieRef: string): Promise<string> {
  if (selfieRef.startsWith("http")) return selfieRef;
  const { data } = await supabase.storage
    .from("verifications")
    .createSignedUrl(extractStoragePath(selfieRef), 3600);
  return data?.signedUrl ?? "";
}

export default function AdminVerifications() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending">("pending");

  async function load() {
    setLoading(true);
    let query = supabase
      .from("verification_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter === "pending") {
      query = query.eq("status", "pending");
    }

    const { data } = await query;
    if (!data) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(data.map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);

    const nameMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.display_name]));

    const withUrls = await Promise.all(
      data.map(async (r) => ({
        ...r,
        display_name: nameMap[r.user_id] || "Anonyme",
        selfie_display_url: await resolveSelfieUrl(r.selfie_url),
      })),
    );

    setRequests(withUrls);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [filter]);

  const handleReview = async (id: string, approved: boolean) => {
    const { error } = await supabase.rpc("admin_review_verification", {
      p_request_id: id,
      p_approved: approved,
    });

    if (error) {
      toast.error("Erreur lors de la revue");
      console.error(error);
      return;
    }

    toast.success(approved ? "Vérification approuvée" : "Vérification rejetée");
    load();
  };

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Vérifications"
        description="Examinez les demandes de vérification d'identité"
      />

      <div className="flex gap-2 mb-6">
        {(["pending", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground"
            }`}
          >
            {f === "pending" ? "En attente" : "Toutes"}
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
                <th className="px-6 py-4">Selfie</th>
                <th className="px-6 py-4">Scores IA</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/20">
                  <td className="px-6 py-4 font-medium">{r.display_name}</td>
                  <td className="px-6 py-4">
                    {r.selfie_display_url ? (
                      <a href={r.selfie_display_url} target="_blank" rel="noopener noreferrer">
                        <img src={r.selfie_display_url} alt="Selfie" className="w-16 h-16 rounded-lg object-cover border border-border/50" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Indisponible</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    {r.liveness_score != null && (
                      <div>Liveness: {Math.round(r.liveness_score * 100)}%</div>
                    )}
                    {r.face_match_score != null && (
                      <div>Match: {Math.round(r.face_match_score * 100)}%</div>
                    )}
                    {r.auto_review_status && <div>{r.auto_review_status}</div>}
                    {r.pose_challenge && <div className="italic">{r.pose_challenge}</div>}
                  </td>
                  <td className="px-6 py-4">{new Date(r.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                  <td className="px-6 py-4">
                    {r.status === "pending" && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleReview(r.id, true)}
                          className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg"
                          title="Approuver"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button
                          onClick={() => handleReview(r.id, false)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                          title="Rejeter"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Aucune demande de vérification
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
