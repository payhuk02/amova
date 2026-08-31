import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  PhoneOff, Mic, MicOff, Volume2, VolumeX, User,
} from "lucide-react";

interface AudioCallProps {
  remoteUserId: string;
  remoteName: string;
  onEnd: () => void;
  isIncoming?: boolean;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.relay.metered.ca:80" },
  { urls: "turn:global.relay.metered.ca:80", username: "open", credential: "open" },
  { urls: "turn:global.relay.metered.ca:80?transport=tcp", username: "open", credential: "open" },
  { urls: "turn:global.relay.metered.ca:443", username: "open", credential: "open" },
  { urls: "turns:global.relay.metered.ca:443?transport=tcp", username: "open", credential: "open" },
];

type CallStatus = "connecting" | "ringing" | "connected" | "reconnecting" | "ended";

const AudioCall = ({ remoteUserId, remoteName, onEnd, isIncoming }: AudioCallProps) => {
  const { user } = useAuth();
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<CallStatus>("connecting");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Audio visualizer
  const [audioLevel, setAudioLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>();

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    localStream.current?.getTracks().forEach(t => t.stop());
    pc.current?.close();
    pc.current = null;
    setStatus("ended");
  }, []);

  const sendSignal = useCallback(async (type: string, data: any) => {
    if (!user) return;
    await supabase.from("call_signals").insert({
      caller_id: user.id,
      callee_id: remoteUserId,
      signal_type: type,
      signal_data: data,
    } as any);
  }, [user, remoteUserId]);

  // Audio level monitoring for visualizer
  const startAudioMonitoring = useCallback((stream: MediaStream) => {
    try {
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(Math.min(1, avg / 128));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch { /* ignore */ }
  }, []);

  const startCall = useCallback(async () => {
    if (!user) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      localStream.current = stream;

      const peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pc.current = peerConnection;

      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

      peerConnection.ontrack = (event) => {
        if (remoteAudio.current && event.streams[0]) {
          remoteAudio.current.srcObject = event.streams[0];
          setStatus("connected");
          if (!timerRef.current) {
            timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
          }
          startAudioMonitoring(event.streams[0]);
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal("ice-candidate", { candidate: event.candidate });
        }
      };

      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        if (state === "disconnected" || state === "failed") {
          if (reconnectAttempt < 3) {
            setStatus("reconnecting");
            setReconnectAttempt(prev => prev + 1);
            reconnectTimeout.current = setTimeout(() => {
              pc.current?.restartIce();
            }, 3000);
          } else {
            cleanup();
            onEnd();
          }
        } else if (state === "connected") {
          setStatus("connected");
          setReconnectAttempt(0);
          if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        }
      };

      if (!isIncoming) {
        setStatus("ringing");
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        await sendSignal("audio-offer", { sdp: offer });
      }
    } catch (err) {
      console.error("Failed to start audio call:", err);
      cleanup();
      onEnd();
    }
  }, [user, isIncoming, sendSignal, cleanup, onEnd, startAudioMonitoring, reconnectAttempt]);

  // Listen for signals
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`audiocall-${[user.id, remoteUserId].sort().join("-")}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "call_signals",
        filter: `callee_id=eq.${user.id}`,
      }, async (payload) => {
        const signal = payload.new as any;
        if (signal.caller_id === user.id) return;

        const peerConnection = pc.current;
        if (!peerConnection) return;

        try {
          if (signal.signal_type === "audio-offer") {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.signal_data.sdp));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            await sendSignal("answer", { sdp: answer });
          } else if (signal.signal_type === "answer") {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.signal_data.sdp));
          } else if (signal.signal_type === "ice-candidate") {
            await peerConnection.addIceCandidate(new RTCIceCandidate(signal.signal_data.candidate));
          } else if (signal.signal_type === "hangup") {
            cleanup();
            onEnd();
          }
        } catch (err) {
          console.error("Signal processing error:", err);
        }
      })
      .subscribe();

    startCall();

    return () => {
      supabase.removeChannel(channel);
      cleanup();
    };
  }, [user, remoteUserId]);

  const toggleAudio = () => {
    const audioTrack = localStream.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setAudioEnabled(audioTrack.enabled);
    }
  };

  const toggleSpeaker = () => {
    if (remoteAudio.current) {
      remoteAudio.current.muted = speakerOn;
      setSpeakerOn(!speakerOn);
    }
  };

  const hangUp = async () => {
    await sendSignal("hangup", {});
    cleanup();
    onEnd();
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const statusLabels: Record<CallStatus, string> = {
    connecting: "Connexion...",
    ringing: "Appel en cours...",
    connected: formatTime(callDuration),
    reconnecting: "Reconnexion...",
    ended: "Terminé",
  };

  // Pulsing ring scale based on audio level
  const pulseScale = 1 + audioLevel * 0.3;

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-900 flex flex-col items-center justify-between py-12">
      {/* Hidden audio element */}
      <audio ref={remoteAudio} autoPlay playsInline />

      {/* Top: status */}
      <div className="text-center">
        <p className="text-white/50 text-sm tracking-wide uppercase">
          {status === "connected" ? "Appel audio" : statusLabels[status]}
        </p>
      </div>

      {/* Center: avatar with audio visualizer */}
      <div className="flex flex-col items-center gap-6">
        {/* Avatar ring */}
        <div className="relative">
          {/* Outer pulsing rings */}
          <div
            className="absolute inset-[-20px] rounded-full border-2 border-primary/20 transition-transform duration-150"
            style={{ transform: `scale(${pulseScale + 0.15})` }}
          />
          <div
            className="absolute inset-[-10px] rounded-full border-2 border-primary/30 transition-transform duration-150"
            style={{ transform: `scale(${pulseScale})` }}
          />

          {/* Avatar */}
          <div className="w-32 h-32 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center">
            <User className="w-16 h-16 text-primary" />
          </div>

          {/* Audio level indicator dots */}
          {status === "connected" && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {[0.2, 0.4, 0.6, 0.8, 1].map((threshold, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors duration-150 ${
                    audioLevel >= threshold ? "bg-primary" : "bg-white/20"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-white text-2xl font-semibold">{remoteName}</p>
          <p className="text-white/50 text-sm mt-1">{statusLabels[status]}</p>
        </div>
      </div>

      {/* Bottom: controls */}
      <div className="flex items-center justify-center gap-6">
        {/* Mute */}
        <button
          onClick={toggleAudio}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${
            audioEnabled
              ? "bg-white/10 hover:bg-white/20"
              : "bg-red-500/80 hover:bg-red-500"
          }`}
        >
          {audioEnabled ? (
            <Mic size={22} className="text-white" />
          ) : (
            <MicOff size={22} className="text-white" />
          )}
        </button>

        {/* Hang up */}
        <button
          onClick={hangUp}
          className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors active:scale-95 shadow-lg shadow-red-500/30"
        >
          <PhoneOff size={26} className="text-white" />
        </button>

        {/* Speaker */}
        <button
          onClick={toggleSpeaker}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${
            speakerOn
              ? "bg-white/10 hover:bg-white/20"
              : "bg-red-500/80 hover:bg-red-500"
          }`}
        >
          {speakerOn ? (
            <Volume2 size={22} className="text-white" />
          ) : (
            <VolumeX size={22} className="text-white" />
          )}
        </button>
      </div>

      {/* Reconnecting overlay */}
      {status === "reconnecting" && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white">Reconnexion... (tentative {reconnectAttempt}/3)</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioCall;
