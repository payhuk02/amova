import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  Timer,
  User,
  Heart,
  X,
  Zap,
  MapPin,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { toast } from "sonner";
import { getLimitErrorMessage } from "@/lib/limits";

const SESSION_DURATION = 180;

interface PartnerProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  age: number | null;
  city: string | null;
  bio: string | null;
  interests: string[] | null;
}

const SpeedDating = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"idle" | "waiting" | "active" | "ended">("idle");
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
  const [messages, setMessages] = useState<Array<{ id: string; sender_id: string; content: string }>>([]);
  const [newMessage, setNewMessage] = useState("");
  const [queueId, setQueueId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (status !== "waiting" || !queueId || !user) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("speed_dating_queue")
        .select("*")
        .eq("id", queueId)
        .single();

      if (data && (data as any).status === "matched" && (data as any).matched_with) {
        const partnerId = (data as any).matched_with;
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, age, city, bio, interests")
          .eq("user_id", partnerId)
          .single();

        if (profile) {
          setPartner(profile as PartnerProfile);
          setStatus("active");
          setTimeLeft(SESSION_DURATION);
          toast.success("Partenaire trouvé ! 🎉");
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [status, queueId, user]);

  useEffect(() => {
    if (status !== "active") return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setStatus("ended");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [status]);

  useEffect(() => {
    if (status !== "active" || !partner || !user) return;

    const channelName = `speed-${[user.id, partner.user_id].sort().join("-")}`;
    const channel = supabase.channel(channelName);

    channel
      .on("broadcast", { event: "message" }, ({ payload }) => {
        setMessages((prev) => [...prev, payload as any]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [status, partner, user]);

  const joinQueue = async () => {
    if (!user) return;
    setStatus("waiting");
    setMessages([]);
    setPartner(null);
    setTimeLeft(SESSION_DURATION);

    const { data, error } = await supabase.rpc("join_speed_dating_queue");

    if (error) {
      toast.error(getLimitErrorMessage(error) || "Impossible de rejoindre la file d'attente");
      setStatus("idle");
      return;
    }

    const result = data as { status: string; queue_id: string; partner_id?: string };
    setQueueId(result.queue_id);

    if (result.status === "matched" && result.partner_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, age, city, bio, interests")
        .eq("user_id", result.partner_id)
        .single();

      if (profile) {
        setPartner(profile as PartnerProfile);
        setStatus("active");
        toast.success("Partenaire trouvé ! 🎉");
      }
    }
  };

  const leaveQueue = async () => {
    if (queueId) {
      await supabase.from("speed_dating_queue").delete().eq("id", queueId);
    }
    setStatus("idle");
    setQueueId(null);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !partner) return;
    const msg = { id: crypto.randomUUID(), sender_id: user.id, content: newMessage.trim() };

    setMessages((prev) => [...prev, msg]);
    setNewMessage("");

    const channelName = `speed-${[user.id, partner.user_id].sort().join("-")}`;
    const channel = supabase.channel(channelName);
    await channel.send({ type: "broadcast", event: "message", payload: msg });
  };

  const handleLikePartner = async () => {
    if (!user || !partner) return;
    const { error } = await supabase
      .from("likes")
      .insert({ from_user_id: user.id, to_user_id: partner.user_id });
    if (error) {
      toast.error(getLimitErrorMessage(error) || "Impossible d'envoyer ce like");
      return;
    }
    toast.success("Like envoyé ! Si c'est réciproque, vous aurez un match 💕");
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const timerColor =
    timeLeft <= 30 ? "text-destructive" : timeLeft <= 60 ? "text-gold-soft" : "text-foreground";

  return (
    <AppShell>
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        {status === "idle" && (
          <div className="flex-1 flex items-center justify-center px-4 sm:px-6">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-accent/15 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Zap className="w-7 h-7 sm:w-9 sm:h-9 text-accent" strokeWidth={1.5} />
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-light mb-2 sm:mb-3">
                Speed <span className="text-gradient-copper italic">Dating</span>
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm mb-6 sm:mb-8 leading-relaxed">
                Discutez pendant 3 minutes avec un inconnu. Si vous accrochez, likez-vous
                mutuellement pour continuer la conversation !
              </p>
              <Button variant="hero" size="xl" onClick={joinQueue} className="touch-manipulation">
                <Zap size={18} /> Commencer
              </Button>
            </div>
          </div>
        )}

        {status === "waiting" && (
          <div className="flex-1 flex items-center justify-center px-4 sm:px-6">
            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <div className="w-7 h-7 sm:w-8 sm:h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <h3 className="font-display text-lg sm:text-xl mb-2">Recherche en cours...</h3>
              <p className="text-muted-foreground text-xs sm:text-sm mb-6 sm:mb-8">
                Nous cherchons quelqu'un pour vous. Patience !
              </p>
              <Button variant="outline" onClick={leaveQueue} className="touch-manipulation">
                Annuler
              </Button>
            </div>
          </div>
        )}

        {(status === "active" || status === "ended") && partner && (
          <>
            {/* Header with timer + partner info */}
            <div className="p-3 sm:p-4 border-b border-border/30 bg-background/80 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden">
                    {partner.avatar_url ? (
                      <img src={partner.avatar_url} alt="" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover" />
                    ) : (
                      <User size={16} className="text-copper" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-medium">
                      {partner.display_name}
                      {partner.age && <span className="text-muted-foreground font-light">, {partner.age}</span>}
                    </p>
                    {partner.city && (
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground flex items-center gap-1">
                        <MapPin size={9} /> {partner.city}
                      </p>
                    )}
                  </div>
                </div>

                {/* Timer */}
                <div className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-secondary/50 border border-border/30 ${timerColor}`}>
                  <Timer size={13} />
                  <span className="font-medium tabular-nums text-xs sm:text-sm">{formatTime(timeLeft)}</span>
                </div>
              </div>

              {/* Partner interests */}
              {partner.interests && partner.interests.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {partner.interests.slice(0, 4).map((i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-primary/10 text-[9px] sm:text-[10px] font-medium text-foreground/70">
                      {i}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5 sm:space-y-2">
              {messages.map((msg) => {
                const isSender = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isSender ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] sm:max-w-[80%] px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm ${
                        isSender
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-secondary/70 text-foreground rounded-bl-md"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEnd} />
            </div>

            {/* Input or end actions */}
            {status === "active" ? (
              <div className="p-2.5 sm:p-3 border-t border-border/30 bg-background/80 safe-area-bottom">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Message..."
                    className="flex-1 h-10 sm:h-11 bg-secondary/50 border-border/50 text-base"
                  />
                  <Button type="submit" size="icon" className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 touch-manipulation" disabled={!newMessage.trim()}>
                    <Send size={16} />
                  </Button>
                </form>
              </div>
            ) : (
              <div className="p-4 sm:p-6 border-t border-border/30 bg-background/80 text-center safe-area-bottom">
                <p className="font-display text-base sm:text-lg mb-3 sm:mb-4">Le temps est écoulé !</p>
                <p className="text-muted-foreground text-xs sm:text-sm mb-4 sm:mb-6">
                  Vous avez aimé discuter avec {partner.display_name} ?
                </p>
                <div className="flex gap-2 sm:gap-3 justify-center">
                  <Button variant="outline" size="lg" onClick={joinQueue} className="touch-manipulation h-10 sm:h-12 text-sm">
                    <X size={16} /> Suivant
                  </Button>
                  <Button variant="hero" size="lg" onClick={handleLikePartner} className="touch-manipulation h-10 sm:h-12 text-sm">
                    <Heart size={16} /> J'aime
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
};

export default SpeedDating;
