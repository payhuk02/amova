import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface IcebreakerButtonProps {
  userProfile: any;
  targetProfile: any;
  onSelect?: (text: string) => void;
}

const IcebreakerButton = ({ userProfile, targetProfile, onSelect }: IcebreakerButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ text: string; emoji: string }>>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const generate = async () => {
    setLoading(true);
    setShowPanel(true);

    try {
      const { data, error } = await supabase.functions.invoke("icebreaker", {
        body: { userProfile, targetProfile },
      });

      if (error) throw error;
      if (data?.messages?.length) {
        setSuggestions(data.messages);
      } else {
        toast.error("Pas de suggestions disponibles");
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la génération");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (text: string, index: number) => {
    if (onSelect) {
      onSelect(text);
      setShowPanel(false);
    } else {
      navigator.clipboard.writeText(text);
      setCopied(index);
      setTimeout(() => setCopied(null), 2000);
      toast.success("Copié !");
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={generate}
        disabled={loading}
        className="text-copper hover:text-copper-light gap-1.5"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        Icebreaker IA
      </Button>

      {showPanel && (
        <div className="absolute bottom-full left-0 right-0 mb-2 glass-card rounded-xl p-4 z-50 min-w-[280px] max-w-sm animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium flex items-center gap-1.5">
              <Sparkles size={13} className="text-copper" />
              Suggestions IA
            </h4>
            <button
              onClick={() => setShowPanel(false)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Fermer
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-copper" />
            </div>
          ) : suggestions.length > 0 ? (
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(s.text, i)}
                  className="w-full text-left p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors text-sm leading-relaxed group"
                >
                  <span className="mr-1.5">{s.emoji}</span>
                  {s.text}
                  <span className="float-right mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {copied === i ? <Check size={14} className="text-primary" /> : <Copy size={14} className="text-muted-foreground" />}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-3">Aucune suggestion</p>
          )}

          {!loading && suggestions.length > 0 && (
            <Button variant="ghost" size="sm" onClick={generate} className="w-full mt-2 text-xs text-muted-foreground">
              <Sparkles size={12} /> Régénérer
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default IcebreakerButton;
