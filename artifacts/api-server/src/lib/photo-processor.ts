import crypto from "crypto";
import { db, verificationHashesTable, photoUploadsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Photo Processor — SHA-256 hashing, EXIF extraction, IP geolocation.
 *
 * All heavy processing happens server-side. Never trust client-provided
 * metadata except GPS coordinates (which are independently validated).
 */

/** SHA-256 hash of raw image bytes */
export function computeImageHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/** Minimal EXIF extraction from JPEG buffer (no external deps) */
export interface ExifInfo {
  make?: string;
  model?: string;
  software?: string;
  dateTimeOriginal?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAltitude?: number;
  orientation?: number;
  imageWidth?: number;
  imageHeight?: number;
}

export function extractExif(buffer: Buffer): ExifInfo {
  const info: ExifInfo = {};

  try {
    // Only process JPEG files (starts with FFD8)
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return info;

    let offset = 2; // Skip SOI marker

    while (offset < buffer.length - 1) {
      // Find next APP1 (EXIF) marker
      if (buffer[offset] !== 0xff) { offset++; continue; }
      const marker = buffer[offset + 1];

      if (marker === 0xe1) {
        // APP1 — EXIF
        const length = buffer.readUInt16BE(offset + 2);
        const exifData = buffer.slice(offset + 4, offset + 2 + length);

        // Check for "Exif\0\0" header
        if (exifData.toString("ascii", 0, 6) === "Exif\0\0") {
          const tiffStart = 6;
          const byteOrder = exifData.toString("ascii", tiffStart, tiffStart + 2);
          const isLittleEndian = byteOrder === "II";

          const readUint16 = (off: number) =>
            isLittleEndian ? exifData.readUInt16LE(off) : exifData.readUInt16BE(off);
          const readUint32 = (off: number) =>
            isLittleEndian ? exifData.readUInt32LE(off) : exifData.readUInt32BE(off);

          const ifdOffset = readUint32(tiffStart + 4);
          const entries = readUint16(tiffStart + ifdOffset);

          for (let i = 0; i < entries; i++) {
            const entryOffset = tiffStart + ifdOffset + 2 + (i * 12);
            if (entryOffset + 12 > exifData.length) break;

            const tag = readUint16(entryOffset);
            const type = readUint16(entryOffset + 2);
            const count = readUint32(entryOffset + 4);

            // ASCII string (Make, Model, Software, DateTimeOriginal)
            if (type === 2 && count > 0 && count < 200) {
              const valOffset = count > 4 ? readUint32(entryOffset + 8) : entryOffset + 8;
              const val = exifData.toString("ascii", tiffStart + valOffset, tiffStart + valOffset + count - 1).trim();

              if (tag === 0x010f) info.make = val;          // Make
              else if (tag === 0x0110) info.model = val;    // Model
              else if (tag === 0x0131) info.software = val; // Software
              else if (tag === 0x9003) info.dateTimeOriginal = val; // DateTimeOriginal
            }
            // GPS IFD
            else if (tag === 0x8825) {
              const gpsIfdOffset = readUint32(entryOffset + 8);
              const gpsEntries = readUint16(tiffStart + gpsIfdOffset);
              let gpsLatRef = "N";
              let gpsLngRef = "E";
              const gpsValues: number[] = [];

              for (let j = 0; j < gpsEntries; j++) {
                const gpsEntry = tiffStart + gpsIfdOffset + 2 + (j * 12);
                if (gpsEntry + 12 > exifData.length) break;
                const gpsTag = readUint16(gpsEntry);
                const gpsType = readUint16(gpsEntry + 2);
                const gpsCount = readUint32(gpsEntry + 4);

                if (gpsTag === 1) gpsLatRef = String.fromCharCode(exifData[tiffStart + readUint32(gpsEntry + 8)]);
                else if (gpsTag === 3) gpsLngRef = String.fromCharCode(exifData[tiffStart + readUint32(gpsEntry + 8)]);
                else if (gpsTag === 2 && gpsType === 5 && gpsCount === 3) {
                  // GPSLatitude (rational)
                  const ratOff = tiffStart + readUint32(gpsEntry + 8);
                  const d = readUint32(ratOff) / readUint32(ratOff + 4);
                  const m = readUint32(ratOff + 8) / readUint32(ratOff + 12);
                  const s = readUint32(ratOff + 16) / readUint32(ratOff + 20);
                  gpsValues.push(d + m / 60 + s / 3600);
                }
                else if (gpsTag === 4 && gpsType === 5 && gpsCount === 3) {
                  // GPSLongitude (rational)
                  const ratOff = tiffStart + readUint32(gpsEntry + 8);
                  const d = readUint32(ratOff) / readUint32(ratOff + 4);
                  const m = readUint32(ratOff + 8) / readUint32(ratOff + 12);
                  const s = readUint32(ratOff + 16) / readUint32(ratOff + 20);
                  gpsValues.push(d + m / 60 + s / 3600);
                }
              }
              if (gpsValues[0] != null) info.gpsLatitude = gpsLatRef === "S" ? -gpsValues[0] : gpsValues[0];
              if (gpsValues[1] != null) info.gpsLongitude = gpsLngRef === "W" ? -gpsValues[1] : gpsValues[1];
            }
            // Orientation
            else if (tag === 0x0112) {
              info.orientation = readUint16(entryOffset + 8);
            }
          }
        }
        break; // Only need first APP1
      }

      if (marker === 0xda || marker === 0xd9) break; // SOS or EOI

      const segLength = buffer.readUInt16BE(offset + 2);
      offset += 2 + segLength;
    }
  } catch (err) {
    logger.debug({ err }, "EXIF extraction failed — continuing without EXIF");
  }

  return info;
}

/** Approximate IP geolocation using a free API (with caching) */
interface IpGeoResult {
  lat: number;
  lng: number;
  country: string;
  city: string;
  org: string;
}

const ipGeoCache = new Map<string, { result: IpGeoResult; at: number }>();
const IP_GEO_CACHE_TTL = 10 * 60 * 1000; // 10 min

export async function getIpGeolocation(ip: string): Promise<IpGeoResult | null> {
  // Skip private/loopback IPs
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return null;
  }

  // Check cache
  const cached = ipGeoCache.get(ip);
  if (cached && Date.now() - cached.at < IP_GEO_CACHE_TTL) return cached.result;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(`http://ip-api.com/json/${ip}?fields=status,lat,lon,country,city,org`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await resp.json() as { status: string; lat: number; lon: number; country: string; city: string; org: string };
    if (data.status !== "success") return null;

    const result: IpGeoResult = {
      lat: data.lat,
      lng: data.lon,
      country: data.country,
      city: data.city,
      org: data.org,
    };

    ipGeoCache.set(ip, { result, at: Date.now() });
    return result;
  } catch {
    logger.debug({ ip }, "IP geolocation failed");
    return null;
  }
}

/** Check if an image hash already exists in the dedup index. Uses atomic insert-or-update to prevent race conditions. */
export async function checkDuplicateHash(hash: string): Promise<{ isDuplicate: boolean; photoId?: number; count: number }> {
  // Try atomic upsert — if hash doesn't exist, insert with count=1; otherwise increment
  const [upserted] = await db
    .insert(verificationHashesTable)
    .values({ originalHash: hash, photoId: null, occurrenceCount: 1 })
    .onConflictDoUpdate({
      target: verificationHashesTable.originalHash,
      set: { occurrenceCount: sql`${verificationHashesTable.occurrenceCount} + 1` },
    })
    .returning();

  if (!upserted) return { isDuplicate: false, count: 0 };

  // If occurrenceCount > 1 after upsert, this is a duplicate
  if (upserted.occurrenceCount > 1) {
    return { isDuplicate: true, photoId: upserted.photoId ?? undefined, count: upserted.occurrenceCount };
  }
  return { isDuplicate: false, count: 1 };
}

/** Register a new image hash in the dedup index */
export async function registerHash(hash: string, photoId: number): Promise<void> {
  const [existing] = await db
    .select({ id: verificationHashesTable.id })
    .from(verificationHashesTable)
    .where(eq(verificationHashesTable.originalHash, hash));

  if (existing) {
    // Already registered — increment count
    await db
      .update(verificationHashesTable)
      .set({ occurrenceCount: sql`${verificationHashesTable.occurrenceCount} + 1` })
      .where(eq(verificationHashesTable.originalHash, hash));
  } else {
    await db.insert(verificationHashesTable).values({ originalHash: hash, photoId, occurrenceCount: 1 });
  }
}

/** Extract file extension from mime type */
export function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/heic": "heic",
  };
  return map[mime] || "jpg";
}

/** Parse a base64 data URL into buffer + mime type */
export function parseDataUrl(dataUrl: string): { buffer: Buffer; mimeType: string } | null {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return null;
  return { buffer: Buffer.from(match[2], "base64"), mimeType: match[1] };
}
