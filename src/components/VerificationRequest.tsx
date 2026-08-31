import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle, Clock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface VerificationRequestProps {
  currentStatus: string;
}

const VerificationRequest = ({ currentStatus }: VerificationRequestProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

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

    const { error } = await supabase.from("verification_requests").insert({
      user_id: user.id,
      selfie_url: url.publicUrl,
    } as any);

    if (error) {
      toast.error("Erreur lors de l'envoi");
    } else {
      // Update profile verification status
      await supabase.from("profiles").update({
        verification_status: "pending",
        verification_photo_url: url.publicUrl,
      } as any).eq("user_id", user.id);
      
      toast.success("Demande de vérification envoyée !");
    }
    setUploading(false);
  };

  if (currentStatus === "verified") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <ShieldCheck size={18} className="text-emerald-500" />
        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Profil vérifié</span>
      </div>
    );
  }

  if (currentStatus === "pending") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <Clock size={18} className="text-amber-500" />
        <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Vérification en cours...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-secondary/50 border border-border/30">
        <Camera size={18} className="text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">Vérifiez votre profil</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Prenez un selfie pour obtenir le badge vérifié et inspirer confiance.
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        onClick={() => fileInput.current?.click()}
        disabled={uploading}
        className="w-full"
      >
        {uploading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Envoi...
          </span>
        ) : (
          <>
            <Camera size={14} />
            Envoyer un selfie
          </>
        )}
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleSubmit(file);
          e.target.value = "";
        }}
      />
    </div>
  );
};

export default VerificationRequest;
