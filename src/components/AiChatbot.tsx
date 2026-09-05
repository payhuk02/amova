import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { HelpCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const GUEST_SUGGESTIONS = [
  "Comment s'inscrire ?",
  "Quels sont les tarifs ?",
  "Comment se faire vérifier ?",
];

const MEMBER_SUGGESTIONS = [
  "Améliorer mon profil",
  "Premier message",
  "Gratuit vs Plus",
];

const MARKETING_PATHS = new Set([
  "/",
  "/confidentialite",
  "/conditions",
  "/faq",
  "/contact",
]);

function parseSseChunk(buffer: string): { events: string[]; rest: string } {
  const events: string[] = [];
  let textBuffer = buffer;
  let newlineIndex: number;
  while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
    let line = textBuffer.slice(0, newlineIndex);
    textBuffer = textBuffer.slice(newlineIndex + 1);
    if (line.endsWith("\r")) line = line.slice(0, -1);
    if (line.startsWith(":") || line.trim() === "") continue;
    if (!line.startsWith("data: ")) continue;
    const jsonStr = line.slice(6).trim();
    if (jsonStr === "[DONE]") continue;
    events.push(jsonStr);
  }
  return { events, rest: textBuffer };
}

export default function AiChatbot() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Bonjour. Posez vos questions sur l'inscription, les abonnements ou la vérification d'identité.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const hide =
    MARKETING_PATHS.has(location.pathname) ||
    location.pathname.startsWith("/admin") ||
    location.pathname === "/coach" ||
    location.pathname === "/auth" ||
    location.pathname.startsWith("/premium/callback");

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    void supabase
      .from("profiles")
      .select("display_name, age, city, looking_for, bio, interests, gender")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  if (hide) return null;

  const suggestions = user ? MEMBER_SUGGESTIONS : GUEST_SUGGESTIONS;

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Msg = { role: "user", content: trimmed };
    const history = [...messages, userMsg].filter(
      (m, i) => !(i === 0 && m.role === "assistant"),
    );
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    let assistantSoFar = "";

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chatbot`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            messages: history.map(({ role, content }) => ({ role, content })),
            userProfile: profile,
            mode: user ? "coach" : "support",
          }),
        },
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        toast.error(err.error || "Aide indisponible pour le moment");
        setLoading(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) {
        toast.error("Réponse invalide");
        setLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { events, rest } = parseSseChunk(buffer);
        buffer = rest;
        for (const raw of events) {
          try {
            const json = JSON.parse(raw);
            const delta = json.choices?.[0]?.delta?.content;
            if (typeof delta === "string") {
              assistantSoFar += delta;
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.role === "assistant") {
                  copy[copy.length - 1] = { ...last, content: assistantSoFar };
                }
                return copy;
              });
            }
          } catch {
            /* ignore partial JSON */
          }
        }
      }

      if (!assistantSoFar.trim()) {
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant" && !last.content) {
            copy[copy.length - 1] = {
              role: "assistant",
              content: "Consultez la FAQ ou la page Contact pour une réponse détaillée.",
            };
          }
          return copy;
        });
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-20 right-3 sm:bottom-6 sm:right-6 z-[90] flex flex-col items-end gap-2 pointer-events-none">
      {open && (
        <div
          className={cn(
            "pointer-events-auto w-[min(100vw-1.5rem,360px)] h-[min(65vh,480px)]",
            "rounded-xl border border-border/50 bg-background shadow-premium",
            "flex flex-col overflow-hidden",
          )}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/40">
            <div className="min-w-0">
              <p className="text-sm font-medium">Aide Amova</p>
              <p className="text-[11px] text-muted-foreground">Inscription, tarifs, vérification</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              aria-label="Fermer l'aide"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((m, i) => (
              <div
                key={`${i}-${m.role}`}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-foreground",
                  )}
                >
                  {m.content || (loading && i === messages.length - 1 ? "…" : "")}
                </div>
              </div>
            ))}
            {messages.length <= 2 && !loading && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="text-[11px] px-2.5 py-1.5 rounded-md border border-border/50 bg-secondary/30 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            className="p-3 border-t border-border/40 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Votre question…"
              disabled={loading}
              className="h-10 bg-secondary/40 border-border/50 text-sm"
              maxLength={500}
            />
            <Button
              type="submit"
              size="icon"
              variant="default"
              disabled={loading || !input.trim()}
              className="h-10 w-10 shrink-0"
              aria-label="Envoyer"
            >
              <Send size={16} />
            </Button>
          </form>
        </div>
      )}

      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto h-11 w-11 rounded-xl border border-border/50 shadow-premium-sm p-0"
        aria-label={open ? "Fermer l'aide" : "Ouvrir l'aide Amova"}
      >
        {open ? <X size={18} /> : <HelpCircle size={18} />}
      </Button>
    </div>
  );
}
