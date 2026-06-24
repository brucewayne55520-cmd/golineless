/**
 * Fraud Detector — Risk scoring engine for photo verification.
 *
 * Evaluates multiple signals to produce a 0-100 risk score:
 *   0-20   = Trusted (green)
 *   21-50  = Review Needed (yellow)
 *   51-100 = Suspicious (red, block + alert admin)
 *
 * Each factor contributes a weighted penalty. The total is clamped to 0-100.
 */

import { haversineMeters } from "./gps-engine";

export interface RiskFactor {
  factor: string;
  weight: number;
  reason: string;
}

export interface RiskAssessment {
  score: number;
  level: "trusted" | "review" | "suspicious";
  factors: RiskFactor[];
  blocked: boolean;
}

export interface PhotoContext {
  // GPS
  gpsLat?: number | null;
  gpsLng?: number | null;
  gpsAccuracy?: number | null;

  // Task location (for distance validation)
  taskLat?: number | null;
  taskLng?: number | null;

  // IP geolocation
  ipLat?: number | null;
  ipLng?: number | null;

  // Timing
  sessionCreatedAt?: Date;
  photoUploadedAt?: Date;
  photoExifTimestamp?: string;

  // Hash
  isDuplicateHash?: boolean;
  hashOccurrenceCount?: number;

  // EXIF
  exifPresent?: boolean;
  exifGpsLat?: number | null;
  exifGpsLng?: number | null;
  exifCameraModel?: string;
  exifSoftware?: string;

  // Challenge
  challengeCodeInWatermark?: boolean;

  // Device
  userAgent?: string;
  // EXIF timestamp comparison
  exifPhotoUploadedAt?: Date;
}

/** Calculate risk score from all available signals */
export function calculateRiskScore(ctx: PhotoContext): RiskAssessment {
  const factors: RiskFactor[] = [];
  let totalScore = 0;

  // ─── 1. GPS Accuracy ──────────────────────────────────────
  if (ctx.gpsAccuracy != null) {
    if (ctx.gpsAccuracy < 20) {
      // Trusted — no penalty
    } else if (ctx.gpsAccuracy < 100) {
      factors.push({ factor: "gps_accuracy_warning", weight: 10, reason: `GPS accuracy ${Math.round(ctx.gpsAccuracy)}m (20-100m range)` });
      totalScore += 10;
    } else {
      factors.push({ factor: "gps_accuracy_suspicious", weight: 25, reason: `GPS accuracy ${Math.round(ctx.gpsAccuracy)}m (>100m — likely spoofed)` });
      totalScore += 25;
    }
  }

  // ─── 2. IP vs GPS Location Mismatch ────────────────────────
  if (ctx.ipLat != null && ctx.ipLng != null && ctx.gpsLat != null && ctx.gpsLng != null) {
    const distanceKm = haversineMeters(ctx.ipLat, ctx.ipLng, ctx.gpsLat, ctx.gpsLng) / 1000;
    if (distanceKm > 500) {
      factors.push({ factor: "ip_gps_mismatch_high", weight: 30, reason: `IP location ${Math.round(distanceKm)}km from GPS (likely VPN/spoof)` });
      totalScore += 30;
    } else if (distanceKm > 50) {
      factors.push({ factor: "ip_gps_mismatch_medium", weight: 15, reason: `IP location ${Math.round(distanceKm)}km from GPS` });
      totalScore += 15;
    }
  }

  // ─── 3. Duplicate Image Hash ───────────────────────────────
  if (ctx.isDuplicateHash) {
    const penalty = ctx.hashOccurrenceCount && ctx.hashOccurrenceCount > 5 ? 50 : 40;
    factors.push({
      factor: "duplicate_image",
      weight: penalty,
      reason: `Exact image hash match (seen ${ctx.hashOccurrenceCount ?? "?"} times)`,
    });
    totalScore += penalty;
  }

  // ─── 4. Timing Analysis ────────────────────────────────────
  if (ctx.sessionCreatedAt && ctx.photoUploadedAt) {
    const elapsedMs = ctx.photoUploadedAt.getTime() - ctx.sessionCreatedAt.getTime();
    const elapsedSec = elapsedMs / 1000;
    if (elapsedSec < 2) {
      factors.push({ factor: "impossible_timing", weight: 20, reason: `Photo uploaded ${elapsedSec.toFixed(1)}s after session start (pre-existing image)` });
      totalScore += 20;
    } else if (elapsedSec > 30 * 60) {
      factors.push({ factor: "stale_session", weight: 5, reason: `Photo uploaded ${Math.round(elapsedSec / 60)}min after session start` });
      totalScore += 5;
    }
  }

  // ─── 5. Missing EXIF Data ──────────────────────────────────
  if (!ctx.exifPresent) {
    factors.push({ factor: "missing_exif", weight: 10, reason: "No EXIF data found (image may be edited/screenshot)" });
    totalScore += 10;
  }

  // ─── 6. EXIF GPS vs Reported GPS Mismatch ──────────────────
  if (ctx.exifGpsLat != null && ctx.exifGpsLng != null && ctx.gpsLat != null && ctx.gpsLng != null) {
    const exifDistM = haversineMeters(ctx.exifGpsLat, ctx.exifGpsLng, ctx.gpsLat, ctx.gpsLng);
    if (exifDistM > 1000) {
      factors.push({ factor: "exif_gps_mismatch", weight: 15, reason: `EXIF GPS is ${Math.round(exifDistM)}m from reported GPS` });
      totalScore += 15;
    }
  }

  // ─── 7. EXIF Timestamp vs Server Time ──────────────────────
  const photoTime = ctx.exifPhotoUploadedAt || ctx.photoUploadedAt;
  if (photoTime && ctx.photoExifTimestamp) {
    try {
      const exifDate = new Date(ctx.photoExifTimestamp);
      const diffHours = Math.abs(photoTime.getTime() - exifDate.getTime()) / (1000 * 60 * 60);
      if (diffHours > 24) {
        factors.push({ factor: "exif_timestamp_mismatch", weight: 20, reason: `EXIF timestamp is ${Math.round(diffHours)}h different from server time` });
        totalScore += 20;
      }
    } catch {
      // Invalid EXIF timestamp — already counted as missing EXIF
    }
  }

  // ─── 8. Challenge Code Not in Watermark ─────────────────────
  if (ctx.challengeCodeInWatermark === false) {
    factors.push({ factor: "challenge_code_missing", weight: 15, reason: "Verification challenge code not found in image" });
    totalScore += 15;
  }

  // ─── 9. Mock GPS Indicators (Software detection) ──────────
  const mockKeywords = ["mock", "fake", "gps joystick", "fake gps", "location spoofer", "mock locations"];
  if (ctx.exifSoftware) {
    const sw = ctx.exifSoftware.toLowerCase();
    if (mockKeywords.some((k) => sw.includes(k))) {
      factors.push({ factor: "mock_gps_software", weight: 40, reason: `EXIF software indicates GPS spoofing: ${ctx.exifSoftware}` });
      totalScore += 40;
    }
  }

  // ─── 10. Low GPS Accuracy + Other Flags ────────────────────
  if (ctx.gpsAccuracy != null && ctx.gpsAccuracy > 100 && totalScore > 20) {
    factors.push({ factor: "low_accuracy_compounding", weight: 15, reason: "Low GPS accuracy combined with other fraud signals" });
    totalScore += 15;
  }

  // Clamp score to 0-100
  const score = Math.min(100, Math.max(0, totalScore));

  let level: "trusted" | "review" | "suspicious";
  if (score <= 20) level = "trusted";
  else if (score <= 50) level = "review";
  else level = "suspicious";

  return {
    score,
    level,
    factors,
    blocked: level === "suspicious",
  };
}

/** Quick helper to add exifPhotoUploadedAt to context type */
interface PhotoContextExtended extends PhotoContext {
  exifPhotoUploadedAt?: Date;
}
