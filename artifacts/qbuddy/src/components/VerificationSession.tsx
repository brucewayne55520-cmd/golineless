import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Shield, Clock, MapPin, AlertTriangle, CheckCircle, Loader2, Eye } from "lucide-react";
import { SecureCamera } from "./SecureCamera";

/**
 * VerificationSession — Manages the complete photo verification workflow.
 *
 * Flow:
 * 1. Create verification session (gets challenge ID + code)
 * 2. Display challenge code to user (must appear in photo)
 * 3. Collect GPS coordinates + accuracy
 * 4. Capture photo via SecureCamera
 * 5. Upload photo with all metadata for server-side verification
 * 6. Display risk score + result
 */

interface VerificationSessionProps {
  taskId: number;
  proofType: string;
  onPhotoVerified: (result: PhotoVerificationResult) => void;
  onCancel?: () => void;
  getAuthHeaders: () => Record<string, string>;
}

export interface PhotoVerificationResult {
  photoId: number;
  url: string;
  verificationId: string;
  challengeCode: string;
  riskScore: number;
  riskLevel: "trusted" | "review" | "suspicious";
  riskFactors: Array<{ factor: string; weight: number; reason: string }>;
  blocked: boolean;
  serverTimestamp: string;
}

type SessionState = "idle" | "creating" | "ready" | "capturing" | "uploading" | "result" | "error";

export function VerificationSession({
  taskId,
  proofType,
  onPhotoVerified,
  onCancel,
  getAuthHeaders,
}: VerificationSessionProps) {
  const [state, setState] = useState<SessionState>("idle");
  const [challengeId, setChallengeId] = useState<string>("");
  const [challengeCode, setChallengeCode] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [gpsInfo, setGpsInfo] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [result, setResult] = useState<PhotoVerificationResult | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Countdown timer for session expiry
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        setState("error");
        setErrorMsg("Verification session expired. Please start a new one.");
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Step 1: Create verification session + collect GPS
  const startSession = useCallback(async () => {
    setState("creating");
    setGpsError(null);

    // Collect GPS first
    let lat: number | null = null;
    let lng: number | null = null;
    let accuracy: number | null = null;

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        });
      });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
      accuracy = pos.coords.accuracy;
      setGpsInfo({ lat, lng, accuracy });
    } catch {
      setGpsError("GPS unavailable — proceeding without location (reduced trust score)");
    }

    // Create session
    try {
      const res = await fetch("/api/verification/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          taskId,
          gpsLat: lat,
          gpsLng: lng,
          gpsAccuracy: accuracy,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create session");
      }

      const data = await res.json();
      setChallengeId(data.challengeId);
      setChallengeCode(data.challengeCode);
      setExpiresAt(new Date(data.expiresAt));
      setState("ready");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start verification session";
      setErrorMsg(msg);
      setState("error");
      toast.error(msg);
    }
  }, [taskId, getAuthHeaders]);

  // Step 2: Camera captured an image → upload it
  const handlePhotoCapture = useCallback(async (imageDataUrl: string) => {
    setState("uploading");

    try {
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screen: `${screen.width}x${screen.height}`,
        timestamp: new Date().toISOString(),
      };

      const res = await fetch(`/api/verification/sessions/${taskId}/photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          imageData: imageDataUrl,
          proofType,
          gpsLat: gpsInfo?.lat,
          gpsLng: gpsInfo?.lng,
          gpsAccuracy: gpsInfo?.accuracy,
          deviceInfo,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();
      const photoResult: PhotoVerificationResult = {
        photoId: data.photoId,
        url: data.url,
        verificationId: data.verificationId,
        challengeCode: data.challengeCode,
        riskScore: data.riskScore,
        riskLevel: data.riskLevel,
        riskFactors: data.riskFactors || [],
        blocked: data.blocked,
        serverTimestamp: data.serverTimestamp,
      };

      setResult(photoResult);
      setState("result");

      if (photoResult.blocked) {
        toast.error("Photo flagged as suspicious — admin will review");
      } else if (photoResult.riskScore > 20) {
        toast.warning(`Photo uploaded with risk score: ${photoResult.riskScore}`);
      } else {
        toast.success("Photo verified successfully!");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setErrorMsg(msg);
      setState("error");
      toast.error(msg);
    }
  }, [taskId, gpsInfo, proofType, getAuthHeaders]);

  // Handle "continue" after viewing result
  const handleContinue = useCallback(() => {
    if (result) {
      onPhotoVerified(result);
    }
  }, [result, onPhotoVerified]);

  return (
    <div className="space-y-4">
      {/* ── State: Idle — Show start button ── */}
      {state === "idle" && (
        <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-blue-400" />
            <h3 className="text-white font-semibold text-sm">Photo Verification</h3>
          </div>
          <p className="text-white/50 text-xs mb-3">
            A verification session will be created. You'll see a unique code that must be visible in your photo.
            This proves the photo was taken now, not from your gallery.
          </p>
          <button
            onClick={startSession}
            className="w-full py-3.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-500/30 transition-colors"
          >
            <Shield size={16} /> Start Verification Session
          </button>
        </div>
      )}

      {/* ── State: Creating session ── */}
      {state === "creating" && (
        <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Loader2 size={16} className="text-blue-400 animate-spin" />
            <h3 className="text-white font-semibold text-sm">Starting verification...</h3>
          </div>
          <p className="text-white/50 text-xs">Collecting GPS and creating session</p>
          {gpsInfo && (
            <div className="mt-2 flex items-center gap-1 text-[10px] text-green-400">
              <MapPin size={10} /> GPS: {gpsInfo.lat.toFixed(4)}, {gpsInfo.lng.toFixed(4)} (±{Math.round(gpsInfo.accuracy)}m)
            </div>
          )}
          {gpsError && (
            <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-400">
              <AlertTriangle size={10} /> {gpsError}
            </div>
          )}
        </div>
      )}

      {/* ── State: Ready — Show challenge code + camera ── */}
      {state === "ready" && (
        <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
          {/* Challenge Code Display */}
          <div className="mb-4 p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Eye size={14} className="text-blue-400" />
              <span className="text-white/70 text-xs font-medium">Verification Code</span>
            </div>
            <p className="text-3xl font-black tracking-[0.3em] text-white" style={{ fontFamily: "monospace" }}>
              {challengeCode}
            </p>
            <p className="text-white/40 text-[10px] mt-2">
              ID: {challengeId}
            </p>
            {countdown > 0 && (
              <div className="flex items-center justify-center gap-1 mt-2 text-amber-400 text-xs">
                <Clock size={12} />
                <span>Expires in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}</span>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mb-4 space-y-1.5 text-[11px] text-white/50">
            <p className="flex items-start gap-1.5">
              <span className="text-blue-400 font-bold">1.</span>
              Take a photo where the code <span className="text-blue-400 font-mono font-bold">{challengeCode}</span> is clearly visible
            </p>
            <p className="flex items-start gap-1.5">
              <span className="text-blue-400 font-bold">2.</span>
              The photo must be taken NOW (not from your gallery)
            </p>
            <p className="flex items-start gap-1.5">
              <span className="text-blue-400 font-bold">3.</span>
              GPS coordinates and timing will be verified server-side
            </p>
          </div>

          {/* GPS Info */}
          {gpsInfo && (
            <div className="flex items-center gap-1 text-[10px] text-green-400 mb-3">
              <MapPin size={10} /> GPS verified: {gpsInfo.lat.toFixed(4)}, {gpsInfo.lng.toFixed(4)} (±{Math.round(gpsInfo.accuracy)}m)
            </div>
          )}
          {gpsError && (
            <div className="flex items-center gap-1 text-[10px] text-amber-400 mb-3">
              <AlertTriangle size={10} /> {gpsError}
            </div>
          )}

          {/* Camera */}
          <SecureCamera
            onCapture={handlePhotoCapture}
            facingMode="environment"
          />

          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full mt-3 py-2.5 rounded-xl border border-white/10 text-white/40 text-xs font-medium hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* ── State: Uploading ── */}
      {state === "uploading" && (
        <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Loader2 size={16} className="text-blue-400 animate-spin" />
            <h3 className="text-white font-semibold text-sm">Processing photo...</h3>
          </div>
          <div className="space-y-2 text-[11px] text-white/50">
            <p>✓ SHA-256 hash computed</p>
            <p>✓ EXIF data extracted</p>
            <p className="flex items-center gap-1">
              <Loader2 size={10} className="animate-spin" /> Applying server watermark + risk scoring...
            </p>
          </div>
        </div>
      )}

      {/* ── State: Result ── */}
      {state === "result" && result && (
        <div className={`rounded-2xl p-4 border ${
          result.blocked ? "bg-red-500/10 border-red-500/30" :
          result.riskScore > 20 ? "bg-amber-500/10 border-amber-500/30" :
          "bg-green-500/10 border-green-500/30"
        }`}>
          <div className="flex items-center gap-2 mb-3">
            {result.blocked ? (
              <AlertTriangle size={16} className="text-red-400" />
            ) : result.riskScore > 20 ? (
              <AlertTriangle size={16} className="text-amber-400" />
            ) : (
              <CheckCircle size={16} className="text-green-400" />
            )}
            <h3 className={`font-semibold text-sm ${
              result.blocked ? "text-red-400" :
              result.riskScore > 20 ? "text-amber-400" :
              "text-green-400"
            }`}>
              {result.blocked ? "Photo Flagged for Review" :
               result.riskScore > 20 ? "Photo Accepted (Review Needed)" :
               "Photo Verified ✓"}
            </h3>
          </div>

          {/* Risk Score */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1">
              <div className="flex justify-between text-[10px] text-white/50 mb-1">
                <span>Risk Score</span>
                <span className={`font-bold ${
                  result.riskScore <= 20 ? "text-green-400" :
                  result.riskScore <= 50 ? "text-amber-400" :
                  "text-red-400"
                }`}>{result.riskScore}/100</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    result.riskScore <= 20 ? "bg-green-400" :
                    result.riskScore <= 50 ? "bg-amber-400" :
                    "bg-red-400"
                  }`}
                  style={{ width: `${result.riskScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Risk Factors (if any) */}
          {result.riskFactors.length > 0 && (
            <div className="mb-3 space-y-1">
              {result.riskFactors.map((f, i) => (
                <p key={i} className="text-[10px] text-white/50 flex items-start gap-1">
                  <span className="text-amber-400">•</span> {f.reason}
                </p>
              ))}
            </div>
          )}

          {/* Verification Details */}
          <div className="text-[10px] text-white/30 space-y-0.5 mb-3">
            <p>ID: {result.verificationId}</p>
            <p>Code: {result.challengeCode}</p>
            <p>Server: {new Date(result.serverTimestamp).toLocaleString("en-IN")}</p>
          </div>

          <button
            onClick={handleContinue}
            className="w-full py-3 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 font-bold text-sm hover:bg-green-500/30 transition-colors"
          >
            Continue
          </button>
        </div>
      )}

      {/* ── State: Error ── */}
      {state === "error" && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-400" />
            <h3 className="text-red-400 font-semibold text-sm">Verification Failed</h3>
          </div>
          <p className="text-red-400/70 text-xs mb-3">{errorMsg}</p>
          <div className="flex gap-2">
            <button
              onClick={() => { setState("idle"); setErrorMsg(null); }}
              className="flex-1 py-2.5 rounded-xl border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/10 transition-colors"
            >
              Retry
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/40 text-xs font-semibold hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default VerificationSession;
