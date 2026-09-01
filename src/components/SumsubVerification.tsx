import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    snsWebSdk?: {
      init: (
        accessToken: string,
        updateAccessToken: () => Promise<string>,
      ) => {
        withConf: (config: Record<string, unknown>) => {
          withOptions: (options: Record<string, unknown>) => {
            on: (event: string, cb: (payload: unknown) => void) => {
              build: () => { launch: (selector: string) => void };
            };
          };
        };
      };
    };
  }
}

const SUMSUB_SDK_URL = "https://static.sumsub.com/idensic/static/sns-websdk-builder.js";

function loadSumsubScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.snsWebSdk) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = SUMSUB_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Impossible de charger Sumsub SDK"));
    document.body.appendChild(script);
  });
}

interface SumsubVerificationProps {
  onComplete?: () => void;
}

const SumsubVerification = ({ onComplete }: SumsubVerificationProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const launchedRef = useRef(false);

  const startVerification = async () => {
    if (!user || launchedRef.current) return;
    setLoading(true);

    try {
      await loadSumsubScript();

      const fetchToken = async () => {
        const { data, error } = await supabase.functions.invoke("sumsub-token");
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (!data?.accessToken) throw new Error("Token Sumsub indisponible");
        return data.accessToken as string;
      };

      const initialToken = await fetchToken();
      launchedRef.current = true;

      const snsWebSdk = window.snsWebSdk!.init(initialToken, fetchToken);

      snsWebSdk
        .withConf({ lang: "fr" })
        .withOptions({ addViewportTag: false, adaptIframeHeight: true })
        .on("idCheck.onApplicantSubmitted", () => {
          toast.success("Documents envoyés — vérification en cours");
        })
        .on("idCheck.onApplicantStatusChanged", (payload: unknown) => {
          const status = (payload as { reviewStatus?: string })?.reviewStatus;
          if (status === "completed") {
            toast.success("Vérification terminée");
            onComplete?.();
            window.location.reload();
          }
        })
        .on("idCheck.onError", () => {
          toast.error("Erreur lors de la vérification Sumsub");
        })
        .build()
        .launch("#sumsub-websdk-container");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur Sumsub");
      launchedRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      launchedRef.current = false;
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-secondary/50 border border-border/30">
        <ShieldCheck size={18} className="text-emerald-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">Vérification Sumsub</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Vérification d&apos;identité professionnelle avec pièce d&apos;identité et selfie en direct.
          </p>
        </div>
      </div>

      {!launchedRef.current && (
        <Button variant="outline" onClick={() => void startVerification()} disabled={loading} className="w-full">
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Chargement...
            </span>
          ) : (
            "Démarrer la vérification Sumsub"
          )}
        </Button>
      )}

      <div
        id="sumsub-websdk-container"
        ref={containerRef}
        className="min-h-[420px] rounded-xl overflow-hidden border border-border/30"
      />
    </div>
  );
};

export default SumsubVerification;
