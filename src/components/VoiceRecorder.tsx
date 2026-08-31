import { useState, useRef, useCallback } from "react";
import { Mic, Square, Loader2 } from "lucide-react";

interface VoiceRecorderProps {
  onRecorded: (blob: Blob, durationMs: number) => void;
  disabled?: boolean;
}

const VoiceRecorder = ({ onRecorded, disabled }: VoiceRecorderProps) => {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef(0);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorder.current = recorder;
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        const elapsed = Date.now() - startTimeRef.current;
        stream.getTracks().forEach((t) => t.stop());
        if (elapsed > 500) {
          onRecorded(blob, elapsed);
        }
        setRecording(false);
        setDuration(0);
      };

      startTimeRef.current = Date.now();
      recorder.start(250);
      setRecording(true);

      timerRef.current = setInterval(() => {
        setDuration(Date.now() - startTimeRef.current);
      }, 100);
    } catch {
      // Permission denied or not supported
    }
  }, [onRecorded]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorder.current?.stop();
  }, []);

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (recording) {
    return (
      <button
        type="button"
        onClick={stopRecording}
        className="h-12 px-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-3 transition-all active:scale-[0.97] hover:bg-destructive/20"
      >
        <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
        <span className="text-sm font-medium tabular-nums text-destructive">
          {formatDuration(duration)}
        </span>
        <Square size={16} className="text-destructive" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled}
      className="h-12 w-12 rounded-xl bg-secondary/50 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all active:scale-95 disabled:opacity-50 shrink-0"
      title="Envoyer un vocal"
    >
      <Mic size={18} />
    </button>
  );
};

export default VoiceRecorder;
