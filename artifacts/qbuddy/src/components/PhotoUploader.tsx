import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Camera, Shield, CheckCircle, AlertTriangle, RotateCcw } from "lucide-react";
import { SecureCamera } from "./SecureCamera";
import type { PhotoVerificationResult } from "./VerificationSession";

/**
 * PhotoUploader — Combined photo capture + verification upload component.
 *
 * Supports two modes:
 * 1. "quick" — Simple camera capture with client-side watermark (legacy)
 * 2. "verified" — Full verification session with server-side anti-fraud pipeline
 *
 * Default is "verified" mode for maximum security.
 */

interface PhotoUploaderProps {
  taskId: number;
  proofType: string;
  mode?: "quick" | "verified";
  onPhotoUploaded: (result: PhotoUploaderResult) => void;
  onError?: (error: string) => void;
  getAuthHeaders: () => Record<string, string>;
}

export interface PhotoUploaderResult {
  imageUrl: string;
  riskScore?: number;
  riskLevel?: "trusted" | "review" | "suspicious";
  verificationId?: string;
  blocked?: boolean;
  // For quick mode compat
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
}

type UploadState = "idle" | "capturing" | "gps_collecting" | "uploading" | "done" | "error";

export function PhotoUploader({
  taskId,
  proofType,
  mode = "verified",
  onPhotoUploaded,
  onError,
  getAuthHeaders,
}: PhotoUploaderProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<PhotoUploaderResult | null>(null);

  // Quick mode: capture + client-side watermark + upload (legacy compat)
  const handleQuickCapture = useCallback(async (imageDataUrl: string) => {
    setState("gps_collecting");
    let lat: number | null = null;
    let lng: number | null = null;

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 });
      });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      // GPS not available — continue without it
    }

    setState("uploading");

    try {
      // Apply client-side watermark (legacy)
      let imageUrl = imageDataUrl;
      try {
        const { applyWatermark } = await import("@/lib/utils");
        imageUrl = await applyWatermark(imageUrl, {
          taskId,
          proofType,
          lat, lng,
          address: lat && lng ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : null,
          timestamp: new Date().toISOString(),
        });
      } catch {
        // Watermark failed — continue with original
      }

      // Upload via existing proof-photo endpoint
      const res = await fetch(`/api/tasks/${taskId}/proof-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          imageUrl,
          proofType,
          lat: lat ?? undefined,
          lng: lng ?? undefined,
          address: lat && lng ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const photoResult: PhotoUploaderResult = {
        imageUrl,
        lat, lng,
        address: lat && lng ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : null,
      };

      setResult(photoResult);
      setState("done");
      toast.success("Photo uploaded!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setErrorMsg(msg);
      setState("error");
      onError?.(msg);
      toast.error(msg);
    }
  }, [taskId, proofType, getAuthHeaders, onError]);

  // Verified mode: full verification session flow
  const handleVerifiedCapture = useCallback(async (imageDataUrl: string) => {
    setState("uploading");

    try {
      // Create verification session
      let gpsLat: number | null = null;
      let gpsLng: number | null = null;
      let gpsAccuracy: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
        });
        gpsLat = pos.coords.latitude;
        gpsLng = pos.coords.longitude;
        gpsAccuracy = pos.coords.accuracy;
      } catch {
        // GPS not available
      }

      // Create session
      const sessionRes = await fetch("/api/verification/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ taskId, gpsLat, gpsLng, gpsAccuracy }),
      });

      if (!sessionRes.ok) {
        const err = await sessionRes.json();
        throw new Error(err.error || "Failed to create verification session");
      }

      const sessionData = await sessionRes.json();

      // Upload photo
      const uploadRes = await fetch(`/api/verification/sessions/${sessionData.sessionId}/photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          imageData: imageDataUrl,
          proofType,
          gpsLat,
          gpsLng,
          gpsAccuracy,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            screen: `${screen.width}x${screen.height}`,
          },
        }),
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "Photo verification failed");
      }

      const uploadData = await uploadRes.json();

      const photoResult: PhotoUploaderResult = {
        imageUrl: uploadData.url,
        riskScore: uploadData.riskScore,
        riskLevel: uploadData.riskLevel,
        verificationId: uploadData.verificationId,
        blocked: uploadData.blocked,
      };

      setResult(photoResult);
      setState("done");

      if (uploadData.blocked) {
        toast.error("Photo flagged as suspicious — admin review required");
      } else {
        toast.success("Photo verified!");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      setErrorMsg(msg);
      setState("error");
      onError?.(msg);
      toast.error(msg);
    }
  }, [taskId, proofType, getAuthHeaders, onError]);

  const handleCapture = useCallback((imageDataUrl: string) => {
    if (mode === "verified") {
      handleVerifiedCapture(imageDataUrl);
    } else {
      handleQuickCapture(imageDataUrl);
    }
  }, [mode, handleQuickCapture, handleVerifiedCapture]);

  return (
    <div className="space-y-3">
      {/* ── Idle — Show camera button ── */}
      {state === "idle" && (
        <SecureCamera
          onCapture={handleCapture}
          onError={(msg) => { setErrorMsg(msg); setState("error"); }}
          facingMode="environment"
        />
      )}

      {/* ── Uploading / GPS collecting ── */}
      {(state === "uploading" || state === "gps_collecting") && (
        <div className="w-full py-4 rounded-xl bg-white/5 text-white/50 text-sm flex items-center justify-center gap-2">
          {mode === "verified" ? (
            <>
              <Shield size={16} className="text-blue-400 animate-pulse" />
              {state === "gps_collecting" ? "Collecting GPS..." : "Verifying photo..."}
            </>
          ) : (
            <>
              <Camera size={16} className="text-white/30 animate-pulse" />
              Uploading...
            </>
          )}
        </div>
      )}

      {/* ── Done — Show result ── */}
      {state === "done" && result && (
        <div className={`rounded-xl p-3 border ${
          result.blocked ? "bg-red-500/10 border-red-500/30" :
          result.riskScore && result.riskScore > 20 ? "bg-amber-500/10 border-amber-500/30" :
          "bg-green-500/10 border-green-500/30"
        }`}>
          <div className="flex items-center gap-2">
            {result.blocked ? (
              <AlertTriangle size={14} className="text-red-400" />
            ) : (
              <CheckCircle size={14} className="text-green-400" />
            )}
            <span className={`text-xs font-semibold ${
              result.blocked ? "text-red-400" : "text-green-400"
            }`}>
              {result.blocked ? "Flagged for review" : "Photo uploaded ✓"}
            </span>
            {result.riskScore != null && (
              <span className="ml-auto text-[10px] text-white/40">
                Risk: {result.riskScore}/100
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Error — Show retry ── */}
      {state === "error" && (
        <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/30">
          <p className="text-red-400 text-xs mb-2">{errorMsg}</p>
          <button
            onClick={() => { setState("idle"); setErrorMsg(null); }}
            className="flex items-center gap-1 text-red-400 text-xs font-semibold hover:text-red-300 transition-colors"
          >
            <RotateCcw size={12} /> Retry
          </button>
        </div>
      )}
    </div>
  );
}

export default PhotoUploader;
