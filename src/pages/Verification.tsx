import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const POSE_CHALLENGES = [
  "Souriez naturellement face à la caméra",
  "Inclinez légèrement la tête à gauche",
  "Regardez l'objectif en levant légèrement le menton",
];

const DOC_TYPES = [
  { value: "cni", label: "Carte nationale d'identité" },
  { value: "passport", label: "Passeport" },
  { value: "permis", label: "Permis de conduire" },
  { value: "other", label: "Autre pièce officielle" },
] as const;

type SlotKey = "id_document" | "selfie" | "recent_1" | "recent_2";

interface SlotState {
  file: File | null;
  preview: string | null;
}

const emptySlot = (): SlotState => ({ file: null, preview: null });

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) return "Formats acceptés : JPEG, PNG ou WebP";
  if (file.size > MAX_BYTES) return "Fichier trop volumineux (max 8 Mo)";
  return null;
}

export default function VerificationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("none");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [documentType, setDocumentType] = useState("cni");
  const [slots, setSlots] = useState<Record<SlotKey, SlotState>>({
    id_document: emptySlot(),
    selfie: emptySlot(),
    recent_1: emptySlot(),
    recent_2: emptySlot(),
  });
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState("");

  const poseChallenge = useMemo(
    () => POSE_CHALLENGES[Math.floor(Math.random() * POSE_CHALLENGES.length)],
    [],
  );

  const idRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);
  const recent1Ref = useRef<HTMLInputElement>(null);
  const recent2Ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("verification_status")
        .eq("user_id", user.id)
        .maybeSingle();

      const vs = profile?.verification_status || "none";
      setStatus(vs);

      if (vs === "rejected") {
        const { data: last } = await supabase
          .from("verification_requests")
          .select("rejection_reason")
          .eq("user_id", user.id)
          .eq("status", "rejected")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setRejectionReason(last?.rejection_reason || null);
      }

      setLoadingProfile(false);
    };
    void load();
  }, [user]);

  const setSlotFile = (key: SlotKey, file: File | null) => {
    setSlots((prev) => {
      if (prev[key].preview) URL.revokeObjectURL(prev[key].preview!);
      return {
        ...prev,
        [key]: file
          ? { file, preview: URL.createObjectURL(file) }
          : emptySlot(),
      };
    });
  };

  const onPick = (key: SlotKey, fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    setSlotFile(key, file);
  };

  const uploadSlot = async (key: SlotKey, file: File) => {
    if (!user) throw new Error("Non authentifié");
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${key}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("verifications").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    return path;
  };

  const handleSubmit = async () => {
    if (!user) return;
    const missing = (Object.keys(slots) as SlotKey[]).filter((k) => !slots[k].file);
    if (missing.length) {
      toast.error("Veuillez fournir la pièce d'identité, le selfie et deux photos récentes");
      return;
    }

    setSubmitting(true);
    try {
      setProgress("Envoi de la pièce d'identité…");
      const idPath = await uploadSlot("id_document", slots.id_document.file!);
      setProgress("Envoi du selfie…");
      const selfiePath = await uploadSlot("selfie", slots.selfie.file!);
      setProgress("Envoi des photos récentes…");
      const photo1Path = await uploadSlot("recent_1", slots.recent_1.file!);
      const photo2Path = await uploadSlot("recent_2", slots.recent_2.file!);

      setProgress("Création du dossier…");
      const { data: requestId, error } = await supabase.rpc("submit_verification_request", {
        p_selfie_url: selfiePath,
        p_id_document_url: idPath,
        p_recent_photo_1_url: photo1Path,
        p_recent_photo_2_url: photo2Path,
        p_document_type: documentType,
        p_pose_challenge: poseChallenge,
      });

      if (error) throw error;

      setProgress("Pré-analyse de conformité…");
      await supabase.functions.invoke("verify-identity", {
        body: { requestId },
      });

      toast.success("Dossier envoyé — examen sous 24–48h");
      setStatus("pending");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Envoi impossible";
      toast.error(msg);
    } finally {
      setSubmitting(false);
      setProgress("");
    }
  };

  const SlotCard = ({
    title,
    hint,
    icon: Icon,
    slotKey,
    inputRef,
    capture,
  }: {
    title: string;
    hint: string;
    icon: typeof FileText;
    slotKey: SlotKey;
    inputRef: RefObject<HTMLInputElement>;
    capture?: "user" | "environment";
  }) => {
    const slot = slots[slotKey];
    return (
      <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon size={18} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
          </div>
        </div>
        {slot.preview ? (
          <div className="relative">
            <img
              src={slot.preview}
              alt={title}
              className="w-full h-40 object-cover rounded-lg border border-border/40"
            />
            <button
              type="button"
              onClick={() => setSlotFile(slotKey, null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/90 border border-border flex items-center justify-center"
              aria-label="Retirer"
            >
              <XCircle size={16} />
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => inputRef.current?.click()}
            disabled={submitting}
          >
            <Upload size={14} />
            Choisir un fichier
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture={capture}
          className="hidden"
          onChange={(e) => {
            onPick(slotKey, e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    );
  };

  if (loadingProfile) {
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
      <main className="container max-w-2xl py-6 px-4 pb-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft size={16} /> Retour
        </button>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            <ShieldCheck size={14} />
            Conformité & sécurité
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-light mb-2">
            Vérification d&apos;identité
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Pour un environnement de rencontres sérieux, nous vérifions chaque dossier
            manuellement : pièce d&apos;identité officielle, selfie en direct, et deux photos
            récentes de vous.
          </p>
        </div>

        {status === "verified" && (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-5 flex gap-3">
            <CheckCircle2 className="text-emerald-500 shrink-0" size={22} />
            <div>
              <p className="font-medium text-emerald-600 dark:text-emerald-400">Profil vérifié</p>
              <p className="text-sm text-muted-foreground mt-1">
                Votre identité a été confirmée par notre équipe de conformité.
              </p>
            </div>
          </div>
        )}

        {status === "pending" && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-5 flex gap-3">
            <Clock className="text-amber-500 shrink-0 animate-pulse" size={22} />
            <div>
              <p className="font-medium text-amber-600 dark:text-amber-400">Examen en cours</p>
              <p className="text-sm text-muted-foreground mt-1">
                Votre dossier est en revue humaine (24–48h). Vous serez notifié dès la décision.
              </p>
            </div>
          </div>
        )}

        {(status === "none" || status === "rejected") && (
          <div className="space-y-6">
            {status === "rejected" && (
              <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-4">
                <p className="text-sm font-medium text-destructive">Demande précédente refusée</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {rejectionReason || "Documents non conformes. Vous pouvez soumettre un nouveau dossier."}
                </p>
              </div>
            )}

            <div className="rounded-xl border border-border/40 bg-secondary/20 p-4 space-y-2">
              <Label htmlFor="doc-type">Type de pièce d&apos;identité</Label>
              <select
                id="doc-type"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                disabled={submitting}
              >
                {DOC_TYPES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <SlotCard
              title="1. Pièce d'identité"
              hint="Photo nette du recto (CNI, passeport ou permis). Masquez le numéro si vous le souhaitez, le visage doit rester visible."
              icon={FileText}
              slotKey="id_document"
              inputRef={idRef}
              capture="environment"
            />

            <div className="rounded-xl border border-champagne/20 bg-champagne/5 p-4 text-sm">
              <p className="font-medium flex items-center gap-2">
                <Camera size={16} className="text-champagne" />
                Défi selfie
              </p>
              <p className="text-muted-foreground mt-1">
                Prenez un selfie en direct : <strong className="text-foreground">{poseChallenge}</strong>
              </p>
            </div>

            <SlotCard
              title="2. Selfie en direct"
              hint="Visage bien éclairé, sans filtre lourd, sans lunettes de soleil."
              icon={Camera}
              slotKey="selfie"
              inputRef={selfieRef}
              capture="user"
            />

            <SlotCard
              title="3. Photo récente n°1"
              hint="Une photo de vous prise récemment (hors selfie de vérification)."
              icon={ImageIcon}
              slotKey="recent_1"
              inputRef={recent1Ref}
            />

            <SlotCard
              title="4. Photo récente n°2"
              hint="Une seconde photo récente, idéalement dans un autre contexte."
              icon={ImageIcon}
              slotKey="recent_2"
              inputRef={recent2Ref}
            />

            <div className="rounded-xl border border-border/30 p-4 text-xs text-muted-foreground space-y-1">
              <p>• Vos documents sont stockés de façon privée et accessibles uniquement à la conformité.</p>
              <p>• Aucune approbation automatique : un humain valide chaque dossier.</p>
              <p>• Formats JPEG / PNG / WebP · 8 Mo max par fichier.</p>
            </div>

            <Button
              variant="hero"
              size="lg"
              className="w-full"
              disabled={submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  {progress || "Envoi…"}
                </span>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Soumettre mon dossier KYC
                </>
              )}
            </Button>
          </div>
        )}
      </main>
    </AppShell>
  );
}
