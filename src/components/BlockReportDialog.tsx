import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldAlert, Ban } from "lucide-react";

interface BlockReportDialogProps {
  open: boolean;
  onClose: () => void;
  targetUserId: string;
  targetName: string;
  onBlocked?: () => void;
}

const reportReasons = [
  "Profil inapproprié",
  "Comportement offensant",
  "Spam ou arnaque",
  "Photos trompeuses",
  "Harcèlement",
  "Autre",
];

const BlockReportDialog = ({ open, onClose, targetUserId, targetName, onBlocked }: BlockReportDialogProps) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<"choose" | "report">("choose");
  const [selectedReason, setSelectedReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleBlock = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("blocked_users").insert({ blocker_id: user.id, blocked_id: targetUserId } as any);
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") toast.info("Utilisateur déjà bloqué");
      else toast.error("Erreur");
    } else {
      toast.success(`${targetName} a été bloqué`);
      onBlocked?.();
    }
    onClose();
    setMode("choose");
  };

  const handleReport = async () => {
    if (!user || !selectedReason) return;
    setSubmitting(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_id: targetUserId,
      reason: selectedReason,
      details: details || null,
    } as any);
    setSubmitting(false);
    if (error) toast.error("Erreur");
    else toast.success("Signalement envoyé. Merci.");
    onClose();
    setMode("choose");
    setSelectedReason("");
    setDetails("");
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); setMode("choose"); } }}>
      <DialogContent className="sm:max-w-md">
        {mode === "choose" ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl">{targetName}</DialogTitle>
              <DialogDescription>Que souhaitez-vous faire ?</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-4">
              <button onClick={handleBlock} disabled={submitting}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-secondary/50 hover:bg-secondary/80 border border-border/50 text-left transition-colors active:scale-[0.98]">
                <Ban size={18} className="text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-medium">Bloquer</p>
                  <p className="text-xs text-muted-foreground">Cette personne ne pourra plus vous contacter ni voir votre profil</p>
                </div>
              </button>
              <button onClick={() => setMode("report")}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-secondary/50 hover:bg-secondary/80 border border-border/50 text-left transition-colors active:scale-[0.98]">
                <ShieldAlert size={18} className="text-accent shrink-0" />
                <div>
                  <p className="text-sm font-medium">Signaler</p>
                  <p className="text-xs text-muted-foreground">Signaler un comportement inapproprié à notre équipe</p>
                </div>
              </button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Signaler {targetName}</DialogTitle>
              <DialogDescription>Sélectionnez la raison du signalement</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 mt-4">
              {reportReasons.map(reason => (
                <button key={reason} onClick={() => setSelectedReason(reason)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all active:scale-[0.98] ${selectedReason === reason ? "bg-primary/10 border border-primary/30 text-foreground" : "bg-secondary/50 border border-border/50 text-muted-foreground hover:border-primary/20"}`}>
                  {reason}
                </button>
              ))}
            </div>
            <textarea value={details} onChange={e => setDetails(e.target.value)} placeholder="Détails supplémentaires (optionnel)..."
              rows={2} maxLength={500}
              className="w-full mt-3 rounded-lg border border-border/50 bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none" />
            <div className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setMode("choose")}>Retour</Button>
              <Button variant="destructive" className="flex-1" onClick={handleReport} disabled={!selectedReason || submitting}>
                Envoyer le signalement
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BlockReportDialog;
