import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppShell from "@/components/AppShell";
import SelfieCamera from "@/components/SelfieCamera";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
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

type SlotKey = "id_recto" | "id_verso" | "selfie" | "recent_1" | "recent_2";

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
    id_recto: emptySlot(),
    id_verso: emptySlot(),
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

  const idRectoRef = useRef<HTMLInputElement>(null);
  const idVersoRef = useRef<HTMLInputElement>(null);
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

  const setSlotFile = (key: SlotKey, file: File | null, previewUrl?: string | null) => {
    setSlots((prev) => {
      if (prev[key].preview) URL.revokeObjectURL(prev[key].preview!);
      return {
        ...prev,
        [key]: file
          ? { file, preview: previewUrl ?? URL.createObjectURL(file) }
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

  const uploadSlot = async (key: string, file: File) => {
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
    const required: SlotKey[] = ["id_recto", "id_verso", "selfie", "recent_1", "recent_2"];
    const missing = required.filter((k) => !slots[k].file);
    if (missing.length) {
      toast.error(
        "Fournissez le recto et le verso de la pièce, un selfie caméra, et deux photos récentes",
      );
      return;
    }

    setSubmitting(true);
    try {
      setProgress("Envoi du recto…");
      const idRectoPath = await uploadSlot("id_recto", slots.id_recto.file!);
      setProgress("Envoi du verso…");
      const idVersoPath = await uploadSlot("id_verso", slots.id_verso.file!);
      setProgress("Envoi du selfie…");
      const selfiePath = await uploadSlot("selfie", slots.selfie.file!);
      setProgress("Envoi des photos récentes…");
      const photo1Path = await uploadSlot("recent_1", slots.recent_1.file!);
      const photo2Path = await uploadSlot("recent_2", slots.recent_2.file!);

      setProgress("Création du dossier…");
      const { data: requestId, error } = await supabase.rpc("submit_verification_request", {
        p_selfie_url: selfiePath,
        p_id_document_url: idRectoPath,
        p_id_document_verso_url: idVersoPath,
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
    buttonLabel = "Choisir un fichier",
  }: {
    title: string;
    hint: string;
    icon: typeof FileText;
    slotKey: Exclude<SlotKey, "selfie">;
    inputRef: RefObject<HTMLInputElement>;
    capture?: "user" | "environment";
    buttonLabel?: string;
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
              className="w-full h-40 object-contain bg-black/20 rounded-lg border border-border/40"
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
            {buttonLabel}
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
            Dossier complet exigé : pièce d&apos;identité <strong className="text-foreground">recto et verso</strong>,
            selfie capturé <strong className="text-foreground">en direct via la caméra</strong>, et deux photos
            récentes. Tout doit être net, visible et lisible.
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

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground text-sm">Exigences de lisibilité</p>
              <p>• Cadrez toute la pièce (bords visibles), sans reflet ni flou.</p>
              <p>• Texte, photo et mentions doivent être lisibles à l&apos;œil nu.</p>
              <p>• Évitez les doigts qui masquent le document.</p>
            </div>

            <SlotCard
              title="1a. Pièce d'identité — Recto"
              hint="Face avant complète et nette. Visage et informations clairement lisibles."
              icon={FileText}
              slotKey="id_recto"
              inputRef={idRectoRef}
              capture="environment"
              buttonLabel="Photographier / choisir le recto"
            />

            <SlotCard
              title="1b. Pièce d'identité — Verso"
              hint="Face arrière complète et nette. Pour un passeport : page des données ou page suivante."
              icon={FileText}
              slotKey="id_verso"
              inputRef={idVersoRef}
              capture="environment"
              buttonLabel="Photographier / choisir le verso"
            />

            <SelfieCamera
              poseChallenge={poseChallenge}
              previewUrl={slots.selfie.preview}
              disabled={submitting}
              onCaptured={(file, previewUrl) => setSlotFile("selfie", file, previewUrl)}
              onClear={() => setSlotFile("selfie", null)}
            />

            <SlotCard
              title="3. Photo récente n°1"
              hint="Une photo de vous prise récemment (hors selfie de vérification), visage visible."
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
              <p>• Documents stockés en privé, accessibles uniquement à la conformité.</p>
              <p>• Validation humaine uniquement — pas d&apos;approbation automatique.</p>
              <p>• Selfie : caméra obligatoire (pas d&apos;upload galerie).</p>
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
