import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Phone, PhoneOff } from "lucide-react";
import VideoCall from "./VideoCall";
import AudioCall from "./AudioCall";
import { insertCallSignal, type CallSignalRow } from "@/lib/call-signaling";
import { createIncomingCallRingtone } from "@/lib/incoming-call-ringtone";

interface IncomingCall {
  callerId: string;
  callerName: string;
  isAudioOnly: boolean;
}

const IncomingCallOverlay = () => {
  const { user } = useAuth();

  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [accepted, setAccepted] = useState(false);
  const incomingRef = useRef<IncomingCall | null>(null);
  const acceptedRef = useRef(false);
  const ringtoneRef = useRef<ReturnType<typeof createIncomingCallRingtone> | null>(null);

  useEffect(() => {
    incomingRef.current = incoming;
  }, [incoming]);

  useEffect(() => {
    acceptedRef.current = accepted;
  }, [accepted]);

  useEffect(() => {
    if (!incoming || accepted) {
      ringtoneRef.current?.stop();
      ringtoneRef.current = null;
      return;
    }

    const ringtone = createIncomingCallRingtone();
    ringtoneRef.current = ringtone;
    void ringtone.start();

    return () => {
      ringtone.stop();
      if (ringtoneRef.current === ringtone) {
        ringtoneRef.current = null;
      }
    };
  }, [incoming, accepted]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("incoming-calls-global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_signals" },
        async (payload) => {
          const signal = payload.new as CallSignalRow;
          if (signal.callee_id !== user.id) return;

          if (signal.signal_type === "hangup") {
            if (incomingRef.current?.callerId === signal.caller_id) {
              setIncoming(null);
              setAccepted(false);
            }
            return;
          }

          if (signal.signal_type !== "offer" && signal.signal_type !== "audio-offer") return;
          if (incomingRef.current || acceptedRef.current) return;

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
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleAccept = useCallback(() => {
    if (!incoming) return;
    setAccepted(true);
  }, [incoming]);

  const handleReject = useCallback(async () => {
    if (!incoming || !user) return;
    await insertCallSignal({
      callerId: user.id,
      calleeId: incoming.callerId,
      signalType: "hangup",
      signalData: {},
    });
    setIncoming(null);
    setAccepted(false);
  }, [incoming, user]);

  const handleEnd = useCallback(() => {
    setIncoming(null);
    setAccepted(false);
  }, []);

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

  if (!incoming) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="text-center">
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
          <button
            onClick={handleReject}
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors active:scale-95 shadow-lg shadow-red-500/30"
          >
            <PhoneOff size={26} className="text-white" />
          </button>

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
