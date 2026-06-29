/**
 * Server-Side Watermark — Adds verification metadata overlay to images.
 *
 * Uses Sharp for server-side image processing. The watermark includes:
 * - Company name
 * - Task ID
 * - Proof type
 * - Server timestamp
 * - GPS coordinates
 * - Verification ID
 * - Challenge code (proves photo was taken during active session)
 * - User/Runner ID
 *
 * This is the TRUSTED watermark — generated server-side so it cannot be
 * bypassed by client-side manipulation.
 */

import sharp from "sharp";
import { logger } from "./logger";

export interface WatermarkParams {
  imageBuffer: Buffer;
  taskId: number;
  userId?: number;
  runnerId?: number;
  proofType: string;
  lat?: number | null;
  lng?: number | null;
  verificationId: string;
  challengeCode: string;
  serverTimestamp: string;
}

export interface WatermarkResult {
  watermarkedBuffer: Buffer;
  width: number;
  height: number;
}

/**
 * Apply a server-side verification watermark to an image.
 * Returns the watermarked image buffer.
 */
export async function applyServerWatermark(params: WatermarkParams): Promise<WatermarkResult> {
  const {
    imageBuffer,
    taskId,
    userId,
    runnerId,
    proofType,
    lat,
    lng,
    verificationId,
    challengeCode,
    serverTimestamp,
  } = params;

  // Get image dimensions
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 600;

  // Build watermark text lines
  const formattedTime = new Date(serverTimestamp).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Kolkata",
  });

  const locationStr = lat != null && lng != null ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : "N/A";

  const line1 = `Go LineLess  |  Task #${taskId}  |  ${proofType.replace(/_/g, " ").toUpperCase()}`;
  const line2 = `${formattedTime}  |  ${locationStr}`;
  const line3 = `${verificationId}  |  Code: ${challengeCode}`;
  const line4 = userId ? `User #${userId}` : runnerId ? `Comrade #${runnerId}` : "";

  // Scale font size based on image width
  const fontSize = Math.max(14, Math.round(width / 60));
  const barHeight = Math.round(fontSize * 5.5);
  const padding = Math.round(width * 0.02);

  // Create SVG overlay for watermark
  const svgOverlay = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Semi-transparent black bar at bottom -->
      <rect x="0" y="${height - barHeight}" width="${width}" height="${barHeight}" fill="rgba(0,0,0,0.75)" />

      <!-- Gold accent line -->
      <rect x="0" y="${height - barHeight}" width="${width}" height="3" fill="#3B82F6" />

      <!-- Line 1: Brand + Task + Type -->
      <text x="${padding}" y="${height - barHeight + fontSize + padding}" font-family="monospace" font-size="${fontSize}" fill="#3B82F6" font-weight="bold">
        ${escapeXml(line1)}
      </text>

      <!-- Line 2: Timestamp + Location -->
      <text x="${padding}" y="${height - barHeight + (fontSize * 2) + padding + 2}" font-family="monospace" font-size="${Math.round(fontSize * 0.85)}" fill="rgba(255,255,255,0.85)">
        ${escapeXml(line2)}
      </text>

      <!-- Line 3: Verification ID + Challenge Code -->
      <text x="${padding}" y="${height - barHeight + (fontSize * 3) + padding + 4}" font-family="monospace" font-size="${Math.round(fontSize * 0.85)}" fill="#3B82F6">
        ${escapeXml(line3)}
      </text>

      ${line4 ? `<!-- Line 4: User/Runner ID -->
      <text x="${padding}" y="${height - barHeight + (fontSize * 4) + padding + 6}" font-family="monospace" font-size="${Math.round(fontSize * 0.7)}" fill="rgba(255,255,255,0.6)">
        ${escapeXml(line4)}
      </text>` : ""}
    </svg>
  `;

  try {
    const watermarkedBuffer = await sharp(imageBuffer)
      .resize({ width: Math.min(width, 1600), withoutEnlargement: true })
      .composite([{
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0,
      }])
      .jpeg({ quality: 85 })
      .toBuffer();

    const newMeta = await sharp(watermarkedBuffer).metadata();

    logger.info({ taskId, verificationId, width: newMeta.width, height: newMeta.height }, "Server watermark applied");
    return { watermarkedBuffer, width: newMeta.width || width, height: newMeta.height || height };
  } catch (err) {
    logger.error({ err, taskId }, "Server watermark failed");
    throw err;
  }
}

/** Escape special XML characters */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
