import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Phone, PhoneOff } from "lucide-react";
import VideoCall from "./VideoCall";
import AudioCall from "./AudioCall";

interface IncomingCall {
  callerId: string;
  callerName: string;
  isAudioOnly: boolean;
}

const IncomingCallOverlay = () => {
  const { user } = useAuth();
  
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("incoming-calls-global")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_signals",
          filter: `callee_id=eq.${user.id}`,
        },
        async (payload) => {
          const signal = payload.new as {
            signal_type: string;
            caller_id: string;
          };
          if (signal.signal_type !== "offer" && signal.signal_type !== "audio-offer") return;
          if (incoming || accepted) return;

          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", signal.caller_id)
            .single();

          setIncoming({
            callerId: signal.caller_id,
            callerName: profile?.display_name || "Quelqu'un",
            isAudioOnly: signal.signal_type === "audio-offer",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, incoming, accepted]);

  const handleAccept = useCallback(() => {
    if (!incoming) return;
    setAccepted(true);
  }, [incoming]);

  const handleReject = useCallback(async () => {
    if (!incoming || !user) return;
    // Send hangup signal
    await supabase.from("call_signals").insert({
      caller_id: user.id,
      callee_id: incoming.callerId,
      signal_type: "hangup",
      signal_data: {},
    } as any);
    setIncoming(null);
    setAccepted(false);
  }, [incoming, user]);

  const handleEnd = useCallback(() => {
    setIncoming(null);
    setAccepted(false);
  }, []);

  // Show VideoCall when accepted
  if (accepted && incoming) {
    if (incoming.isAudioOnly) {
      return (
        <AudioCall
          remoteUserId={incoming.callerId}
          remoteName={incoming.callerName}
          onEnd={handleEnd}
          isIncoming
        />
      );
    }
    return (
      <VideoCall
        remoteUserId={incoming.callerId}
        remoteName={incoming.callerName}
        onEnd={handleEnd}
        isIncoming
      />
    );
  }

  // Show ringing UI
  if (!incoming) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="text-center">
        {/* Animated rings */}
        <div className="relative w-28 h-28 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full border-2 border-green-400/30 animate-ping" />
          <div className="absolute inset-3 rounded-full border-2 border-green-400/40 animate-pulse" />
          <div className="absolute inset-0 rounded-full bg-white/10 flex items-center justify-center">
            <Phone className="w-10 h-10 text-green-400 animate-bounce" />
          </div>
        </div>

        <p className="text-white text-2xl font-semibold mb-1">{incoming.callerName}</p>
        <p className="text-white/60 text-sm mb-10">
          {incoming.isAudioOnly ? "Appel audio entrant..." : "Appel vidéo entrant..."}
        </p>

        <div className="flex items-center justify-center gap-8">
          {/* Reject */}
          <button
            onClick={handleReject}
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors active:scale-95 shadow-lg shadow-red-500/30"
          >
            <PhoneOff size={26} className="text-white" />
          </button>

          {/* Accept */}
          <button
            onClick={handleAccept}
            className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors active:scale-95 shadow-lg shadow-green-500/30"
          >
            <Phone size={26} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallOverlay;
