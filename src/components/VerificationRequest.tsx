import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock, ShieldCheck, FileWarning, ArrowRight } from "lucide-react";

interface VerificationRequestProps {
  currentStatus: string;
  avatarUrl?: string | null;
}

const VerificationRequest = ({ currentStatus }: VerificationRequestProps) => {
  if (currentStatus === "verified") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <ShieldCheck size={18} className="text-emerald-500" />
        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          Profil vérifié
        </span>
      </div>
    );
  }

  if (currentStatus === "pending") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <Clock size={18} className="text-amber-500 animate-pulse" />
        <div>
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
            Vérification en cours
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Revue humaine sous 24–48h
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-secondary/50 border border-border/30">
        <ShieldCheck size={18} className="text-champagne mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">Vérification d&apos;identité professionnelle</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Pièce d&apos;identité recto + verso (lisibles), selfie caméra en direct, et deux photos
            récentes. Validation manuelle par notre équipe de conformité.
          </p>
        </div>
      </div>
      {currentStatus === "rejected" && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs">
          <FileWarning size={14} />
          Demande précédente refusée — vous pouvez resoumettre un dossier.
        </div>
      )}
      <Button variant="outline" className="w-full" asChild>
        <Link to="/verification">
            Ouvrir le dossier KYC (recto + verso + selfie caméra)
          <ArrowRight size={14} />
        </Link>
      </Button>
    </div>
  );
};

export default VerificationRequest;
