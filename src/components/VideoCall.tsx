import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  applyCallSignal,
  fetchLatestCallSignal,
  insertCallSignal,
  isRemoteCallSignal,
  subscribeToPeerCallSignals,
  type CallSignalRow,
} from "@/lib/call-signaling";
import {
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff,
  Volume2, VolumeX, Maximize, Minimize, RotateCcw,
  Monitor, MonitorOff, WifiOff, RefreshCw,
} from "lucide-react";

interface VideoCallProps {
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
type ConnectionQuality = "excellent" | "good" | "poor" | "disconnected";

const VideoCall = ({ remoteUserId, remoteName, onEnd, isIncoming }: VideoCallProps) => {
  const { user } = useAuth();
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const screenStream = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<CallStatus>("connecting");
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [quality, setQuality] = useState<ConnectionQuality>("good");
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // Draggable PiP state
  const [pipPos, setPipPos] = useState({ x: -1, y: -1 }); // -1 = default
  const pipRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const controlsTimeout = useRef<ReturnType<typeof setTimeout>>();
  const statsInterval = useRef<ReturnType<typeof setInterval>>();
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();
  const pendingSignals = useRef<CallSignalRow[]>([]);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (statsInterval.current) clearInterval(statsInterval.current);
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    screenStream.current?.getTracks().forEach(t => t.stop());
    localStream.current?.getTracks().forEach(t => t.stop());
    pc.current?.close();
    pc.current = null;
    setStatus("ended");
  }, []);

  const sendSignal = useCallback(async (type: string, data: Record<string, unknown>) => {
    if (!user) return;
    await insertCallSignal({
      callerId: user.id,
      calleeId: remoteUserId,
      signalType: type,
      signalData: data,
    });
  }, [user, remoteUserId]);

  const processRemoteSignal = useCallback(async (signal: CallSignalRow) => {
    if (!user || !isRemoteCallSignal(signal, user.id)) return;

    const peerConnection = pc.current;
    if (!peerConnection) {
      pendingSignals.current.push(signal);
      return;
    }

    try {
      const result = await applyCallSignal(peerConnection, signal, sendSignal, ["offer"]);
      if (result === "hangup") {
        cleanup();
        onEndRef.current();
      } else if (result === "answered") {
        setStatus((current) => (current === "connecting" || current === "ringing" ? "ringing" : current));
      }
    } catch (err) {
      console.error("Signal processing error:", err);
    }
  }, [user, sendSignal, cleanup]);

  // Monitor connection quality
  const startStatsMonitoring = useCallback(() => {
    if (statsInterval.current) clearInterval(statsInterval.current);
    let prevBytesReceived = 0;
    let prevTimestamp = 0;

    statsInterval.current = setInterval(async () => {
      if (!pc.current) return;
      try {
        const stats = await pc.current.getStats();
        stats.forEach((report) => {
          if (report.type === "inbound-rtp" && report.kind === "video") {
            const now = report.timestamp;
            const bytes = report.bytesReceived || 0;
            if (prevTimestamp > 0) {
              const elapsed = (now - prevTimestamp) / 1000;
              const bitrate = ((bytes - prevBytesReceived) * 8) / elapsed;
              if (bitrate > 500000) setQuality("excellent");
              else if (bitrate > 150000) setQuality("good");
              else if (bitrate > 50000) setQuality("poor");
              else setQuality("disconnected");
            }
            prevBytesReceived = bytes;
            prevTimestamp = now;
          }
        });
      } catch { /* ignore */ }
    }, 3000);
  }, []);

  const startCall = useCallback(async () => {
    if (!user) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStream.current = stream;
      if (localVideo.current) localVideo.current.srcObject = stream;

      const peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pc.current = peerConnection;

      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

      peerConnection.ontrack = (event) => {
        if (remoteVideo.current && event.streams[0]) {
          remoteVideo.current.srcObject = event.streams[0];
          setStatus("connected");
          if (!timerRef.current) {
            timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
          }
          startStatsMonitoring();
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal("ice-candidate", { candidate: event.candidate });
        }
      };

      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        if (state === "disconnected") {
          setStatus("reconnecting");
          setQuality("disconnected");
          // Auto-reconnect after 5s if still disconnected
          reconnectTimeout.current = setTimeout(() => {
            if (pc.current?.connectionState === "disconnected" || pc.current?.connectionState === "failed") {
              if (reconnectAttempt < 3) {
                setReconnectAttempt(prev => prev + 1);
                // ICE restart
                pc.current?.restartIce();
              } else {
                cleanup();
                onEndRef.current();
              }
            }
          }, 5000);
        } else if (state === "failed") {
          if (reconnectAttempt < 3) {
            setReconnectAttempt(prev => prev + 1);
            peerConnection.restartIce();
            setStatus("reconnecting");
          } else {
            cleanup();
            onEndRef.current();
          }
        } else if (state === "connected") {
          setStatus("connected");
          setReconnectAttempt(0);
          if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        }
      };

      peerConnection.oniceconnectionstatechange = () => {
        if (peerConnection.iceConnectionState === "failed") {
          peerConnection.restartIce();
        }
      };

      if (!isIncoming) {
        setStatus("ringing");
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        await sendSignal("offer", { sdp: offer });
      } else {
        const pendingOffer = await fetchLatestCallSignal({
          userId: user.id,
          remoteUserId,
          signalType: "offer",
          fromRemote: true,
        });
        if (pendingOffer) {
          await processRemoteSignal(pendingOffer);
        } else {
          setStatus("ringing");
        }
      }

      const queued = [...pendingSignals.current];
      pendingSignals.current = [];
      for (const signal of queued) {
        await processRemoteSignal(signal);
      }
    } catch (err) {
      console.error("Failed to start call:", err);
      cleanup();
      onEndRef.current();
    }
  }, [user, isIncoming, sendSignal, cleanup, startStatsMonitoring, remoteUserId, processRemoteSignal]);

  const processRemoteSignalRef = useRef(processRemoteSignal);
  processRemoteSignalRef.current = processRemoteSignal;
  const startCallRef = useRef(startCall);
  startCallRef.current = startCall;
  const hasStartedRef = useRef(false);

  // Listen for signals
  useEffect(() => {
    if (!user || hasStartedRef.current) return;
    hasStartedRef.current = true;

    const channel = subscribeToPeerCallSignals({
      userId: user.id,
      remoteUserId,
      channelName: `call-${[user.id, remoteUserId].sort().join("-")}`,
      onSignal: (signal) => {
        void processRemoteSignalRef.current(signal);
      },
    });

    void startCallRef.current();

    return () => {
      hasStartedRef.current = false;
      supabase.removeChannel(channel);
      cleanup();
    };
  }, [user, remoteUserId, cleanup]);

  // Screen sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen share, restore camera
      screenStream.current?.getTracks().forEach(t => t.stop());
      screenStream.current = null;
      const videoTrack = localStream.current?.getVideoTracks()[0];
      const sender = pc.current?.getSenders().find(s => s.track?.kind === "video");
      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStream.current = screen;
        const screenTrack = screen.getVideoTracks()[0];
        const sender = pc.current?.getSenders().find(s => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(screenTrack);
        }
        screenTrack.onended = () => {
          // User stopped sharing via browser UI
          toggleScreenShare();
        };
        setIsScreenSharing(true);
      } catch {
        // User cancelled
      }
    }
  };

  const toggleVideo = () => {
    const videoTrack = localStream.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setVideoEnabled(videoTrack.enabled);
    }
  };

  const toggleAudio = () => {
    const audioTrack = localStream.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setAudioEnabled(audioTrack.enabled);
    }
  };

  const toggleSpeaker = () => {
    if (remoteVideo.current) {
      remoteVideo.current.muted = speakerOn;
      setSpeakerOn(!speakerOn);
    }
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const switchCamera = async () => {
    const videoTrack = localStream.current?.getVideoTracks()[0];
    if (!videoTrack) return;
    const facingMode = videoTrack.getSettings().facingMode;
    const newFacing = facingMode === "user" ? "environment" : "user";
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing },
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      const sender = pc.current?.getSenders().find(s => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(newVideoTrack);
      localStream.current?.removeTrack(videoTrack);
      videoTrack.stop();
      localStream.current?.addTrack(newVideoTrack);
      if (localVideo.current) localVideo.current.srcObject = localStream.current;
    } catch (err) {
      console.error("Camera switch failed:", err);
    }
  };

  const hangUp = async () => {
    await sendSignal("hangup", {});
    cleanup();
    onEndRef.current();
  };

  const handleTap = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 4000);
  };

  useEffect(() => {
    controlsTimeout.current = setTimeout(() => setShowControls(false), 5000);
    return () => { if (controlsTimeout.current) clearTimeout(controlsTimeout.current); };
  }, []);

  // Draggable PiP handlers
  const handlePipPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    dragging.current = true;
    const rect = pipRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePipPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    e.stopPropagation();
    const x = Math.max(0, Math.min(window.innerWidth - 140, e.clientX - dragOffset.current.x));
    const y = Math.max(0, Math.min(window.innerHeight - 200, e.clientY - dragOffset.current.y));
    setPipPos({ x, y });
  };

  const handlePipPointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    dragging.current = false;
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const qualityColors: Record<ConnectionQuality, string> = {
    excellent: "bg-green-500",
    good: "bg-green-400",
    poor: "bg-yellow-500",
    disconnected: "bg-red-500",
  };

  const qualityLabels: Record<ConnectionQuality, string> = {
    excellent: "Excellente",
    good: "Bonne",
    poor: "Faible",
    disconnected: "Déconnecté",
  };

  const pipStyle = pipPos.x >= 0
    ? { left: pipPos.x, top: pipPos.y }
    : { right: 16, top: 16 };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col" onClick={handleTap}>
      {/* Remote video (full screen) */}
      <video
        ref={remoteVideo}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Remote video off placeholder */}
      {status === "connected" && !remoteVideo.current?.srcObject && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          <div className="w-24 h-24 rounded-full bg-zinc-700 flex items-center justify-center">
            <span className="text-3xl font-bold text-white/60">{remoteName[0]?.toUpperCase()}</span>
          </div>
        </div>
      )}

      {/* Local video (PiP) - draggable */}
      <div
        ref={pipRef}
        onPointerDown={handlePipPointerDown}
        onPointerMove={handlePipPointerMove}
        onPointerUp={handlePipPointerUp}
        style={pipStyle}
        className="absolute w-28 h-40 sm:w-36 sm:h-48 rounded-2xl overflow-hidden bg-zinc-900 border-2 border-white/20 z-20 transition-shadow duration-200 cursor-grab active:cursor-grabbing shadow-xl shadow-black/40 touch-none select-none"
      >
        <video
          ref={localVideo}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {!videoEnabled && (
          <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center">
            <VideoOff size={24} className="text-white/40" />
          </div>
        )}
        {isScreenSharing && (
          <div className="absolute bottom-0 inset-x-0 bg-blue-500/80 text-white text-[10px] text-center py-0.5 font-medium">
            Partage d'écran
          </div>
        )}
      </div>

      {/* Status overlay */}
      {(status === "connecting" || status === "ringing") && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/60 backdrop-blur-sm">
          <div className="text-center">
            <div className="relative w-28 h-28 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping" />
              <div className="absolute inset-3 rounded-full border-2 border-white/30 animate-pulse" />
              <div className="absolute inset-0 rounded-full bg-white/10 flex items-center justify-center">
                <Phone className="w-10 h-10 text-white animate-bounce" />
              </div>
            </div>
            <p className="text-white text-2xl font-semibold">{remoteName}</p>
            <p className="text-white/50 text-sm mt-2">
              {status === "connecting" ? "Connexion en cours..." : "Ça sonne..."}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); hangUp(); }}
              className="mt-10 w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mx-auto hover:bg-red-600 transition-all active:scale-90 shadow-lg shadow-red-500/30"
            >
              <PhoneOff size={24} className="text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Reconnecting overlay */}
      {status === "reconnecting" && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/70 backdrop-blur-sm">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-yellow-400 mx-auto mb-4 animate-spin" />
            <p className="text-white text-lg font-medium">Reconnexion en cours...</p>
            <p className="text-white/50 text-sm mt-1">Tentative {reconnectAttempt}/3</p>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 transition-all duration-300 ${
          showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center gap-3">
            {/* Avatar placeholder */}
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
              <span className="text-white text-sm font-semibold">{remoteName[0]?.toUpperCase()}</span>
            </div>
            <div>
              <p className="text-white text-sm font-medium">{remoteName}</p>
              <div className="flex items-center gap-1.5">
                {status === "connected" && (
                  <>
                    <p className="text-white/50 text-xs tabular-nums">{formatTime(callDuration)}</p>
                    <span className="text-white/30 text-xs">•</span>
                    <div className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${qualityColors[quality]}`} />
                      <span className="text-white/50 text-[10px]">{qualityLabels[quality]}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {quality !== "excellent" && quality !== "good" && status === "connected" && (
              <div className="flex items-center gap-1 bg-red-500/20 rounded-full px-2 py-1">
                <WifiOff size={12} className="text-red-400" />
                <span className="text-red-400 text-[10px] font-medium">Instable</span>
              </div>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              {isFullscreen ? <Minimize size={16} className="text-white" /> : <Maximize size={16} className="text-white" />}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 transition-all duration-300 ${
          showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <div className="bg-gradient-to-t from-black/80 to-transparent pt-16 pb-8 px-4">
          {/* Labels row */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
            {[
              { label: "Caméra", icon: null },
              { label: "Micro", icon: null },
              { label: "Vidéo", icon: null },
              { label: "Écran", icon: null },
              { label: "Son", icon: null },
              { label: "", icon: null },
            ].map((_, i) => (
              <div key={i} className="w-12 sm:w-14" />
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            {/* Switch camera */}
            <ControlButton
              onClick={switchCamera}
              active={false}
              icon={<RotateCcw size={18} />}
              label="Caméra"
            />

            {/* Mic */}
            <ControlButton
              onClick={toggleAudio}
              active={!audioEnabled}
              icon={audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
              activeColor="bg-red-500"
              label="Micro"
            />

            {/* Video */}
            <ControlButton
              onClick={toggleVideo}
              active={!videoEnabled}
              icon={videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
              activeColor="bg-red-500"
              label="Vidéo"
            />

            {/* Screen share */}
            <ControlButton
              onClick={toggleScreenShare}
              active={isScreenSharing}
              icon={isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
              activeColor="bg-blue-500"
              label="Écran"
            />

            {/* Speaker */}
            <ControlButton
              onClick={toggleSpeaker}
              active={!speakerOn}
              icon={speakerOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
              activeColor="bg-yellow-500"
              label="Son"
            />

            {/* Hang up */}
            <button
              onClick={(e) => { e.stopPropagation(); hangUp(); }}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-all active:scale-90 shadow-lg shadow-red-500/30">
                <PhoneOff size={22} className="text-white" />
              </div>
              <span className="text-white/40 text-[10px]">Fin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable control button
function ControlButton({
  onClick,
  active,
  icon,
  activeColor = "bg-white/30",
  label,
}: {
  onClick: () => void;
  active: boolean;
  icon: React.ReactNode;
  activeColor?: string;
  label: string;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="flex flex-col items-center gap-1"
    >
      <div
        className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center transition-all active:scale-90 ${
          active
            ? `${activeColor} shadow-lg`
            : "bg-white/15 hover:bg-white/25"
        }`}
      >
        <span className="text-white">{icon}</span>
      </div>
      <span className="text-white/40 text-[10px]">{label}</span>
    </button>
  );
}

export default VideoCall;
