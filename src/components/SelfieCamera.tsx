import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, SwitchCamera, XCircle } from "lucide-react";
import { toast } from "sonner";

interface SelfieCameraProps {
  poseChallenge: string;
  previewUrl: string | null;
  disabled?: boolean;
  onCaptured: (file: File, previewUrl: string) => void;
  onClear: () => void;
}

async function blobToFile(blob: Blob, name: string): Promise<File> {
  return new File([blob], name, { type: blob.type || "image/jpeg" });
}

export default function SelfieCamera({
  poseChallenge,
  previewUrl,
  disabled,
  onCaptured,
  onClear,
}: SelfieCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = async (facing: "user" | "environment" = facingMode) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Caméra non supportée sur cet appareil / navigateur");
      return;
    }
    setStarting(true);
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      setFacingMode(facing);
      setCameraOpen(true);
      // Wait for video element to mount
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
      });
    } catch {
      toast.error("Impossible d'accéder à la caméra. Autorisez l'accès dans le navigateur.");
      setCameraOpen(false);
    } finally {
      setStarting(false);
    }
  };

  // Attach stream when camera opens
  useEffect(() => {
    if (!cameraOpen || !streamRef.current || !videoRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch(() => undefined);
  }, [cameraOpen]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      toast.error("Caméra pas encore prête");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror selfie for natural look when using front camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!blob) {
      toast.error("Capture impossible");
      return;
    }

    const file = await blobToFile(blob, `selfie-${Date.now()}.jpg`);
    const url = URL.createObjectURL(blob);
    onCaptured(file, url);
    stopCamera();
  };

  if (previewUrl) {
    return (
      <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Camera size={18} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">2. Selfie en direct (caméra)</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Capturé via la caméra — pas d&apos;upload depuis la galerie.
            </p>
          </div>
        </div>
        <div className="relative">
          <img
            src={previewUrl}
            alt="Selfie capturé"
            className="w-full h-56 object-cover rounded-lg border border-border/40"
          />
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/90 border border-border flex items-center justify-center"
            aria-label="Reprendre"
          >
            <XCircle size={16} />
          </button>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={disabled}
          onClick={() => {
            onClear();
            void startCamera("user");
          }}
        >
          <RefreshCw size={14} />
          Reprendre avec la caméra
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Camera size={18} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">2. Selfie en direct (caméra obligatoire)</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Défi : <strong className="text-foreground">{poseChallenge}</strong>. Visage bien
            éclairé, sans filtre, sans lunettes de soleil.
          </p>
        </div>
      </div>

      {cameraOpen ? (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-lg border border-border/40 bg-black aspect-[3/4] sm:aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="flex-1" onClick={() => void capture()} disabled={disabled}>
              <Camera size={14} />
              Capturer le selfie
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void startCamera(facingMode === "user" ? "environment" : "user")}
              disabled={disabled || starting}
              title="Changer de caméra"
            >
              <SwitchCamera size={14} />
            </Button>
            <Button type="button" variant="ghost" onClick={stopCamera} disabled={disabled}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={disabled || starting}
          onClick={() => void startCamera("user")}
        >
          <Camera size={14} />
          {starting ? "Ouverture de la caméra…" : "Ouvrir la caméra frontale"}
        </Button>
      )}
    </div>
  );
}
