import { useState, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Camera, Clock, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface VerificationRequestProps {
  currentStatus: string;
  avatarUrl?: string | null;
}

const POSE_CHALLENGES = [
  "Souriez naturellement",
  "Inclinez légèrement la tête à gauche",
  "Regardez l'objectif en levant le menton",
];

const VerificationRequest = ({ currentStatus, avatarUrl }: VerificationRequestProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const poseChallenge = useMemo(
    () => POSE_CHALLENGES[Math.floor(Math.random() * POSE_CHALLENGES.length)],
    [],
  );

  const handleSubmit = async (file: File) => {
    if (!user) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage.from("verifications").upload(path, file, {
      contentType: file.type,
    });

    if (upErr) {
      toast.error("Erreur lors de l'upload");
      setUploading(false);
      return;
    }

    const { data: url } = supabase.storage.from("verifications").getPublicUrl(path);

    const { data: request, error } = await supabase
      .from("verification_requests")
      .insert({
        user_id: user.id,
        selfie_url: url.publicUrl,
        pose_challenge: poseChallenge,
        status: "pending",
        auto_review_status: "processing",
      } as never)
      .select("id")
      .single();

    if (error || !request) {
      toast.error("Erreur lors de l'envoi");
      setUploading(false);
      return;
    }

    await supabase
      .from("profiles")
      .update({
        verification_status: "pending",
        verification_photo_url: url.publicUrl,
      } as never)
      .eq("user_id", user.id);

    setUploading(false);
    setAnalyzing(true);

    try {
      const { data, error: verifyError } = await supabase.functions.invoke("verify-identity", {
        body: {
          requestId: request.id,
          selfieUrl: url.publicUrl,
          avatarUrl: avatarUrl || undefined,
          poseChallenge,
        },
      });

      if (verifyError) throw verifyError;
      if (data?.error) throw new Error(data.error);

      if (data?.autoApproved) {
        toast.success("Profil vérifié automatiquement !");
        window.location.reload();
      } else {
        toast.success(data?.message || "Demande envoyée — examen sous 24h");
        window.location.reload();
      }
    } catch {
      toast.success("Selfie reçu — notre équipe l'examinera sous 24h");
      window.location.reload();
    } finally {
      setAnalyzing(false);
    }
  };

  if (currentStatus === "verified") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <ShieldCheck size={18} className="text-emerald-500" />
        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Profil vérifié</span>
      </div>
    );
  }

  if (currentStatus === "pending" || analyzing) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <Clock size={18} className="text-amber-500 animate-pulse" />
        <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
          {analyzing ? "Analyse IA en cours..." : "Vérification en cours..."}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-secondary/50 border border-border/30">
        <Sparkles size={18} className="text-champagne mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">Vérification intelligente</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Prenez un selfie en direct avec le défi : <strong className="text-foreground">{poseChallenge}</strong>
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            L&apos;IA compare votre visage à votre photo de profil pour un badge vérifié instantané.
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        onClick={() => fileInput.current?.click()}
        disabled={uploading || analyzing}
        className="w-full"
      >
        {uploading || analyzing ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            {uploading ? "Envoi..." : "Analyse..."}
          </span>
        ) : (
          <>
            <Camera size={14} />
            Prendre le selfie de vérification
          </>
        )}
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleSubmit(file);
          e.target.value = "";
        }}
      />
    </div>
  );
};

export default VerificationRequest;
