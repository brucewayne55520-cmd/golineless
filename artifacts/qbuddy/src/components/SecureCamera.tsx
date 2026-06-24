import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Camera, CameraOff, RotateCcw, Check, Loader2 } from "lucide-react";

/**
 * SecureCamera — Forces camera capture via getUserMedia API.
 *
 * Instead of <input type="file"> which allows any file, this component:
 * 1. Opens the device camera directly via getUserMedia
 * 2. Captures a frame from the live video stream
 * 3. Returns the captured image as a base64 data URL
 *
 * On mobile browsers, this triggers the native camera UI.
 * On desktop, it opens the webcam feed.
 */

interface SecureCameraProps {
  onCapture: (imageDataUrl: string) => void;
  onError?: (error: string) => void;
  facingMode?: "environment" | "user";
  maxResolution?: number; // Max width in pixels (default 1600)
  quality?: number;       // JPEG quality 0-1 (default 0.85)
}

type CameraState = "idle" | "requesting" | "streaming" | "capturing" | "captured" | "error";

export function SecureCamera({
  onCapture,
  onError,
  facingMode = "environment",
  maxResolution = 1600,
  quality = 0.85,
}: SecureCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>("idle");
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [facing, setFacing] = useState(facingMode);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopStream(); };
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setState("requesting");
    setErrorMsg(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: maxResolution },
          height: { ideal: Math.round(maxResolution * 0.75) },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("streaming");
    } catch (err) {
      const msg = err instanceof DOMException && err.name === "NotAllowedError"
        ? "Camera permission denied. Please allow camera access in your browser settings."
        : err instanceof DOMException && err.name === "NotFoundError"
          ? "No camera found on this device."
          : `Camera error: ${err instanceof Error ? err.message : "Unknown"}`;
      setErrorMsg(msg);
      setState("error");
      onError?.(msg);
      toast.error(msg);
    }
  }, [facing, maxResolution, onError]);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    setState("capturing");
    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Get actual video dimensions
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // Scale down if needed
    const scale = Math.min(1, maxResolution / vw);
    canvas.width = Math.round(vw * scale);
    canvas.height = Math.round(vh * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setState("error");
      return;
    }

    // Draw current video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 data URL
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    setCapturedUrl(dataUrl);
    setState("captured");

    // Stop camera after capture
    stopStream();
  }, [maxResolution, quality, stopStream]);

  const handleConfirm = useCallback(() => {
    if (capturedUrl) {
      onCapture(capturedUrl);
    }
  }, [capturedUrl, onCapture]);

  const handleRetake = useCallback(() => {
    setCapturedUrl(null);
    startCamera();
  }, [startCamera]);

  const toggleFacing = useCallback(() => {
    stopStream();
    const newFacing = facing === "environment" ? "user" : "environment";
    setFacing(newFacing);
    // Use setTimeout to allow state update, but start camera with the NEW facing directly
    setTimeout(async () => {
      try {
        setState("requesting");
        setErrorMsg(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newFacing, width: { ideal: maxResolution }, height: { ideal: Math.round(maxResolution * 0.75) } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setState("streaming");
      } catch (err) {
        const msg = err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera permission denied." : "Camera error.";
        setErrorMsg(msg); setState("error"); onError?.(msg);
      }
    }, 50);
  }, [stopStream, facing, maxResolution, onError]);

  return (
    <div className="relative">
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {state === "idle" && (
        <button
          onClick={startCamera}
          className="w-full py-4 rounded-xl border-2 border-dashed border-blue-400 bg-blue-500/10 text-blue-400 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-500/20 transition-all"
        >
          <Camera size={18} /> Open Camera
        </button>
      )}

      {state === "requesting" && (
        <div className="w-full py-4 rounded-xl bg-white/5 text-white/50 text-sm flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" /> Requesting camera access...
        </div>
      )}

      {state === "error" && (
        <div className="w-full py-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center justify-center gap-2">
          <CameraOff size={16} /> {errorMsg || "Camera unavailable"}
        </div>
      )}

      {/* Live video stream */}
      {(state === "streaming" || state === "capturing") && (
        <div className="relative rounded-xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-xl"
            style={{ maxHeight: "300px", objectFit: "cover" }}
          />
          {/* Capture overlay */}
          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-3">
            <button
              onClick={toggleFacing}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={captureFrame}
              disabled={state === "capturing"}
              className="w-16 h-16 rounded-full bg-white border-4 border-red-500 hover:bg-red-50 transition-all active:scale-95"
            >
              <div className="w-12 h-12 rounded-full bg-red-500 mx-auto" />
            </button>
            <div className="w-10 h-10" /> {/* Spacer for alignment */}
          </div>
        </div>
      )}

      {/* Captured preview */}
      {state === "captured" && capturedUrl && (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden">
            <img src={capturedUrl} alt="Captured" className="w-full rounded-xl" style={{ maxHeight: "300px", objectFit: "cover" }} />
            <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Check size={10} /> Captured
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRetake}
              className="flex-1 py-3 rounded-xl border border-white/20 text-white/70 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
            >
              <RotateCcw size={14} /> Retake
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 rounded-xl bg-green-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-600 transition-colors"
            >
              <Check size={14} /> Use Photo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecureCamera;
