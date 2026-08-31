import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2, X, Heart, AlertTriangle, Lightbulb, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface CompatibilityReport {
  overall_score: number;
  categories: Array<{ name: string; score: number; description: string }>;
  strengths: string[];
  challenges: string[];
  advice: string;
}

interface CompatibilityModalProps {
  userProfile: any;
  targetProfile: any;
  open: boolean;
  onClose: () => void;
}

const CompatibilityModal = ({ userProfile, targetProfile, open, onClose }: CompatibilityModalProps) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CompatibilityReport | null>(null);

  const analyze = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("compatibility", {
        body: { userProfile, targetProfile },
      });

      if (error) throw error;
      if (data?.overall_score !== undefined) {
        setReport(data as CompatibilityReport);
      } else {
        toast.error("Analyse impossible");
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur d'analyse");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-primary";
    if (score >= 50) return "text-gold-soft";
    return "text-muted-foreground";
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-xl p-6">
      <div className="w-full max-w-md glass-card rounded-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-border/30 flex items-center justify-between shrink-0">
          <h2 className="font-display text-xl font-medium flex items-center gap-2">
            <Sparkles size={18} className="text-copper" />
            Compatibilité
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {!report && !loading && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Heart className="w-10 h-10 text-copper" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-lg mb-2">
                {userProfile.display_name} & {targetProfile.display_name}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Découvrez votre compatibilité détaillée grâce à l'IA
              </p>
              <Button variant="hero" size="lg" onClick={analyze}>
                <Sparkles size={16} />
                Analyser la compatibilité
              </Button>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-copper mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Analyse en cours...</p>
            </div>
          )}

          {report && (
            <>
              {/* Overall score */}
              <div className="text-center">
                <div className={`font-display text-5xl font-light ${getScoreColor(report.overall_score)}`}>
                  {report.overall_score}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">Score global</p>
              </div>

              {/* Categories */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-1.5">
                  <TrendingUp size={14} />
                  Détail par catégorie
                </h4>
                {report.categories.map((cat, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground/80">{cat.name}</span>
                      <span className={`font-medium tabular-nums ${getScoreColor(cat.score)}`}>
                        {cat.score}%
                      </span>
                    </div>
                    <Progress value={cat.score} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">{cat.description}</p>
                  </div>
                ))}
              </div>

              {/* Strengths */}
              {report.strengths.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-1.5 text-primary">
                    <Heart size={14} />
                    Points forts
                  </h4>
                  <ul className="space-y-1.5">
                    {report.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-foreground/70 flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Challenges */}
              {report.challenges.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-1.5 text-gold-soft">
                    <AlertTriangle size={14} />
                    Points d'attention
                  </h4>
                  <ul className="space-y-1.5">
                    {report.challenges.map((c, i) => (
                      <li key={i} className="text-sm text-foreground/70 flex items-start gap-2">
                        <span className="text-gold-soft mt-0.5">•</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Advice */}
              {report.advice && (
                <div className="bg-primary/5 rounded-xl p-4">
                  <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                    <Lightbulb size={14} className="text-copper" />
                    Conseil
                  </h4>
                  <p className="text-sm text-foreground/70 leading-relaxed">{report.advice}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompatibilityModal;
