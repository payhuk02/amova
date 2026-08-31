import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  isSender: boolean;
}

const AudioPlayer = ({ src, isSender }: AudioPlayerProps) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animRef = useRef<number>();

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
    });

    audio.addEventListener("ended", () => {
      setPlaying(false);
      setProgress(0);
    });

    return () => {
      audio.pause();
      audio.src = "";
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [src]);

  useEffect(() => {
    const tick = () => {
      if (audioRef.current) {
        setProgress(audioRef.current.currentTime / (audioRef.current.duration || 1));
      }
      if (playing) animRef.current = requestAnimationFrame(tick);
    };

    if (playing) {
      animRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [playing]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = ratio * audioRef.current.duration;
    setProgress(ratio);
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`flex items-center gap-2.5 min-w-[180px] ${isSender ? "flex-row-reverse" : ""}`}>
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 ${
          isSender
            ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
            : "bg-foreground/10 text-foreground hover:bg-foreground/15"
        }`}
      >
        {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        {/* Waveform bars */}
        <div className="flex items-center gap-[2px] h-6 cursor-pointer" onClick={handleSeek}>
          {Array.from({ length: 28 }).map((_, i) => {
            const barProgress = i / 28;
            const filled = barProgress <= progress;
            // Deterministic "random" heights for visual waveform
            const height = [14, 20, 10, 24, 16, 22, 8, 18, 24, 12, 20, 14, 22, 10, 18, 24, 14, 20, 10, 16, 22, 8, 18, 24, 14, 20, 12, 16][i] || 14;
            return (
              <div
                key={i}
                className={`w-[3px] rounded-full transition-colors duration-75 ${
                  filled
                    ? isSender ? "bg-primary-foreground/80" : "bg-foreground/60"
                    : isSender ? "bg-primary-foreground/20" : "bg-foreground/15"
                }`}
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>

        <span className={`text-[10px] tabular-nums ${isSender ? "text-primary-foreground/60 text-right" : "text-muted-foreground/60"}`}>
          {playing ? formatTime(progress * duration) : formatTime(duration)}
        </span>
      </div>
    </div>
  );
};

export default AudioPlayer;
