import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout, { AdminPageHeader, AdminTable, StatusBadge } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface VerificationRequest {
  id: string;
  user_id: string;
  selfie_url: string;
  id_document_url: string | null;
  recent_photo_1_url: string | null;
  recent_photo_2_url: string | null;
  document_type: string | null;
  status: string;
  created_at: string;
  display_name?: string;
  avatar_url?: string | null;
  liveness_score?: number | null;
  face_match_score?: number | null;
  auto_review_status?: string | null;
  pose_challenge?: string | null;
  rejection_reason?: string | null;
  admin_notes?: string | null;
  provider?: string | null;
  urls?: {
    selfie?: string;
    id_document?: string;
    recent_1?: string;
    recent_2?: string;
    avatar?: string;
  };
}

const DOC_LABELS: Record<string, string> = {
  cni: "CNI",
  passport: "Passeport",
  permis: "Permis",
  other: "Autre",
};

function extractStoragePath(ref: string): string {
  if (ref.startsWith("http")) {
    const parts = ref.split("/verifications/");
    return parts[parts.length - 1].split("?")[0];
  }
  return ref;
}

async function resolveUrl(ref: string | null | undefined): Promise<string> {
  if (!ref || ref === "sumsub") return "";
  if (ref.startsWith("http")) return ref;
  const { data } = await supabase.storage
    .from("verifications")
    .createSignedUrl(extractStoragePath(ref), 3600);
  return data?.signedUrl ?? "";
}

export default function AdminVerifications() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending">("pending");
  const [selected, setSelected] = useState<VerificationRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [reviewing, setReviewing] = useState(false);

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
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);

    const profileMap = Object.fromEntries(
      (profiles || []).map((p) => [p.user_id, p]),
    );

    const withUrls = await Promise.all(
      data.map(async (r) => {
        const profile = profileMap[r.user_id];
        const [selfie, id_document, recent_1, recent_2] = await Promise.all([
          resolveUrl(r.selfie_url),
          resolveUrl((r as VerificationRequest).id_document_url),
          resolveUrl((r as VerificationRequest).recent_photo_1_url),
          resolveUrl((r as VerificationRequest).recent_photo_2_url),
        ]);
        return {
          ...(r as VerificationRequest),
          display_name: profile?.display_name || "Anonyme",
          avatar_url: profile?.avatar_url,
          urls: {
            selfie,
            id_document,
            recent_1,
            recent_2,
            avatar: profile?.avatar_url || undefined,
          },
        };
      }),
    );

    setRequests(withUrls);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [filter]);

  const openDetail = (r: VerificationRequest) => {
    setSelected(r);
    setRejectReason("");
    setAdminNotes(r.admin_notes || "");
  };

  const handleReview = async (approved: boolean) => {
    if (!selected) return;
    setReviewing(true);
    const { error } = await supabase.rpc("admin_review_verification", {
      p_request_id: selected.id,
      p_approved: approved,
      p_rejection_reason: approved ? null : rejectReason || null,
      p_admin_notes: adminNotes || null,
    });
    setReviewing(false);

    if (error) {
      toast.error("Erreur lors de la revue");
      console.error(error);
      return;
    }

    toast.success(approved ? "Dossier approuvé" : "Dossier rejeté");
    setSelected(null);
    void load();
  };

  const Evidence = ({
    label,
    url,
  }: {
    label: string;
    url?: string;
  }) => (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block group relative">
          <img
            src={url}
            alt={label}
            className="w-full h-44 object-cover rounded-lg border border-border/50 group-hover:border-primary/40 transition-colors"
          />
          <ExternalLink
            size={14}
            className="absolute top-2 right-2 text-white drop-shadow opacity-80"
          />
        </a>
      ) : (
        <div className="h-44 rounded-lg border border-dashed border-border/50 flex items-center justify-center text-xs text-muted-foreground">
          Indisponible
        </div>
      )}
    </div>
  );

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Vérifications KYC"
        description="Examinez pièce d'identité, selfie et photos récentes avant validation"
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
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="bg-secondary/50 text-muted-foreground font-medium border-b border-border/50">
              <tr>
                <th className="px-6 py-4">Utilisateur</th>
                <th className="px-6 py-4">Dossier</th>
                <th className="px-6 py-4">Pré-analyse IA</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/20">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {r.urls?.avatar ? (
                        <img
                          src={r.urls.avatar}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-secondary" />
                      )}
                      <span className="font-medium">{r.display_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1.5">
                      {[r.urls?.id_document, r.urls?.selfie, r.urls?.recent_1, r.urls?.recent_2]
                        .filter(Boolean)
                        .slice(0, 4)
                        .map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt=""
                            className="w-10 h-10 rounded object-cover border border-border/40"
                          />
                        ))}
                      {!r.urls?.id_document && !r.urls?.selfie && (
                        <span className="text-xs text-muted-foreground">
                          {r.provider === "sumsub" ? "Sumsub" : "Incomplet"}
                        </span>
                      )}
                    </div>
                    {r.document_type && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {DOC_LABELS[r.document_type] || r.document_type}
                      </p>
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
                  </td>
                  <td className="px-6 py-4">{new Date(r.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="outline" size="sm" onClick={() => openDetail(r)}>
                      Examiner
                    </Button>
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

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-background border-b border-border/50 px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg">Revue KYC — {selected.display_name}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {DOC_LABELS[selected.document_type || ""] || selected.document_type || "Document"}{" "}
                  · {new Date(selected.created_at).toLocaleString("fr-FR")}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Evidence label="Pièce d'identité" url={selected.urls?.id_document} />
                <Evidence label="Selfie live" url={selected.urls?.selfie} />
                <Evidence label="Photo récente 1" url={selected.urls?.recent_1} />
                <Evidence label="Photo récente 2" url={selected.urls?.recent_2} />
              </div>

              {selected.urls?.avatar && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                  <img
                    src={selected.urls.avatar}
                    alt="Avatar"
                    className="w-14 h-14 rounded-full object-cover border border-border"
                  />
                  <div className="text-sm">
                    <p className="font-medium">Photo de profil actuelle</p>
                    <p className="text-xs text-muted-foreground">Comparer avec le dossier</p>
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3 text-xs text-muted-foreground p-3 rounded-xl border border-border/40">
                <div>
                  Liveness IA:{" "}
                  {selected.liveness_score != null
                    ? `${Math.round(selected.liveness_score * 100)}%`
                    : "—"}
                </div>
                <div>
                  Face match IA:{" "}
                  {selected.face_match_score != null
                    ? `${Math.round(selected.face_match_score * 100)}%`
                    : "—"}
                </div>
                {selected.pose_challenge && (
                  <div className="sm:col-span-2 italic">Défi: {selected.pose_challenge}</div>
                )}
                {selected.admin_notes && (
                  <div className="sm:col-span-2">Résumé IA: {selected.admin_notes}</div>
                )}
              </div>

              {selected.status === "pending" && (
                <div className="space-y-3 border-t border-border/40 pt-4">
                  <div>
                    <label className="text-xs font-medium block mb-1">Notes internes (optionnel)</label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-full min-h-[70px] rounded-md border border-border bg-background px-3 py-2 text-sm"
                      placeholder="Notes pour l'équipe…"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">
                      Motif de refus (si rejet)
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full min-h-[70px] rounded-md border border-border bg-background px-3 py-2 text-sm"
                      placeholder="Ex. pièce illisible, visage non concordant…"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Button
                      variant="outline"
                      disabled={reviewing}
                      onClick={() => void handleReview(false)}
                      className="text-destructive border-destructive/30"
                    >
                      <XCircle size={16} />
                      Rejeter
                    </Button>
                    <Button
                      disabled={reviewing}
                      onClick={() => void handleReview(true)}
                      className="bg-emerald-600 hover:bg-emerald-600/90 text-white"
                    >
                      <CheckCircle size={16} />
                      Approuver &amp; badger
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
