import fs from "fs";
import path from "path";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  verificationSessionsTable,
  photoUploadsTable,
  verificationAuditLogsTable,
  tasksTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { extractToken, getUserFromToken, getRunnerFromToken, resolveAdmin } from "../lib/auth";
import { logger } from "../lib/logger";
import { uploadFile, isB2Configured } from "../lib/storage";
import {
  createVerificationSession,
  validateSession,
  completeSession,
} from "../lib/verification-engine";
import {
  computeImageHash,
  extractExif,
  getIpGeolocation,
  checkDuplicateHash,
  registerHash,
  parseDataUrl,
} from "../lib/photo-processor";
import { calculateRiskScore, type PhotoContext } from "../lib/fraud-detector";
import { applyServerWatermark } from "../lib/watermark";

const router: IRouter = Router();

async function getRequestIdentity(req: Request): Promise<
  | { type: "admin"; id: number }
  | { type: "user"; id: number }
  | { type: "runner"; id: number }
  | null
> {
  const token = extractToken(req);
  if (!token) return null;
  const admin = await resolveAdmin(token);
  if (admin) return { type: "admin", id: admin.id };
  const user = await getUserFromToken(token);
  if (user) return { type: "user", id: user.id };
  const runner = await getRunnerFromToken(token);
  if (runner) return { type: "runner", id: runner.id };
  return null;
}

async function canAccessPhoto(
  identity: Awaited<ReturnType<typeof getRequestIdentity>>,
  photo: typeof photoUploadsTable.$inferSelect,
): Promise<boolean> {
  if (!identity) return false;
  if (identity.type === "admin") return true;
  if (identity.type === "user" && photo.userId === identity.id) return true;
  if (identity.type === "runner" && photo.runnerId === identity.id) return true;
  if (!photo.taskId) return false;
  const [task] = await db
    .select({ userId: tasksTable.userId, runnerId: tasksTable.runnerId })
    .from(tasksTable)
    .where(eq(tasksTable.id, photo.taskId))
    .limit(1);
  if (!task) return false;
  if (identity.type === "user") return task.userId === identity.id;
  if (identity.type === "runner") return task.runnerId === identity.id;
  return false;
}

/** Extract client IP (respecting proxy headers) */
function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress || "";
}

// ─── POST /verification/sessions ─────────────────────────────
// Create a new verification session (generates challenge ID + code)
router.post("/verification/sessions", async (req: Request, res: Response): Promise<void> => {
  const token = extractToken(req);
  if (!token) { res.status(401).json({ error: "Authentication required" }); return; }

  const user = await getUserFromToken(token);
  const runner = await getRunnerFromToken(token);
  if (!user && !runner) { res.status(401).json({ error: "Invalid token" }); return; }

  const { taskId, gpsLat, gpsLng, gpsAccuracy } = req.body;
  if (!taskId) { res.status(400).json({ error: "taskId is required" }); return; }

  // Verify task exists and user/runner has access
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, Number(taskId)));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  if (user && task.userId !== user.id) { res.status(403).json({ error: "Not your task" }); return; }
  if (runner && task.runnerId !== runner.id) { res.status(403).json({ error: "Not assigned to this task" }); return; }

  const ipAddress = getClientIp(req);
  const ipGeo = await getIpGeolocation(ipAddress);

  const session = await createVerificationSession({
    userId: user?.id,
    runnerId: runner?.id,
    taskId: Number(taskId),
    gpsLat: gpsLat ? Number(gpsLat) : undefined,
    gpsLng: gpsLng ? Number(gpsLng) : undefined,
    gpsAccuracy: gpsAccuracy ? Number(gpsAccuracy) : undefined,
    ipAddress,
  });

  // Audit log
  await db.insert(verificationAuditLogsTable).values({
    sessionId: session.sessionId,
    taskId: Number(taskId),
    userId: user?.id,
    runnerId: runner?.id,
    action: "session_created",
    ipAddress,
    metadata: JSON.stringify({ gpsAccuracy, ipGeo: ipGeo ? { city: ipGeo.city, country: ipGeo.country } : null }),
  });

  res.status(201).json({
    sessionId: session.sessionId,
    challengeId: session.challengeId,
    challengeCode: session.challengeCode,
    expiresAt: session.expiresAt,
    instructions: "Take a photo that clearly shows the verification code: " + session.challengeCode,
  });
});

// ─── GET /verification/sessions/:id ──────────────────────────
// Get session details + challenge code
router.get("/verification/sessions/:id", async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const { valid, session, reason } = await validateSession(id);
  if (!valid) { res.status(400).json({ error: reason }); return; }

  res.json({
    sessionId: session!.id,
    challengeId: session!.challengeId,
    challengeCode: session!.challengeCode,
    status: session!.status,
    expiresAt: session!.expiresAt,
  });
});

// ─── POST /verification/sessions/:id/photo ────────────────────
// Upload photo with full anti-fraud pipeline
router.post("/verification/sessions/:id/photo", async (req: Request, res: Response): Promise<void> => {
  const sessionId = Number(req.params.id);
  const token = extractToken(req);
  if (!token) { res.status(401).json({ error: "Authentication required" }); return; }

  const user = await getUserFromToken(token);
  const runner = await getRunnerFromToken(token);
  if (!user && !runner) { res.status(401).json({ error: "Invalid token" }); return; }

  // ── Step 1: Validate session ──
  const { valid, session, reason } = await validateSession(sessionId);
  if (!valid || !session) { res.status(400).json({ error: reason || "Invalid session" }); return; }

  const {
    imageData,         // base64 data URL
    proofType,
    gpsLat,
    gpsLng,
    gpsAccuracy,
    deviceInfo,        // { userAgent, platform, screen }
  } = req.body;

  if (!imageData) { res.status(400).json({ error: "imageData (base64 data URL) is required" }); return; }

  const serverTimestamp = new Date();
  const ipAddress = getClientIp(req);
  const taskId = (session as Record<string, unknown>).taskId as number;
  const challengeCode = (session as Record<string, unknown>).challengeCode as string;
  const challengeId = (session as Record<string, unknown>).challengeId as string;

  // ── Step 2: Parse base64 image ──
  const parsed = parseDataUrl(imageData);
  if (!parsed) { res.status(400).json({ error: "Invalid image data format" }); return; }

  const { buffer: originalBuffer, mimeType } = parsed;

  // ── Step 3: Compute SHA-256 hash of original ──
  const originalHash = computeImageHash(originalBuffer);

  // ── Step 4: Check for duplicate hash ──
  const duplicateCheck = await checkDuplicateHash(originalHash);

  // ── Step 5: Extract EXIF data ──
  const exifData = extractExif(originalBuffer);
  const exifPresent = Object.keys(exifData).length > 0;

  // ── Step 6: IP geolocation ──
  const ipGeo = await getIpGeolocation(ipAddress);

  // ── Step 7: Get task location for GPS validation ──
  let taskLat: number | null = null;
  let taskLng: number | null = null;
  if (taskId) {
    const [task] = await db.select({ taskLat: tasksTable.taskLat, taskLng: tasksTable.taskLng, locationLat: tasksTable.locationLat, locationLng: tasksTable.locationLng })
      .from(tasksTable).where(eq(tasksTable.id, taskId));
    if (task) {
      taskLat = task.taskLat ? Number(task.taskLat) : (task.locationLat ? Number(task.locationLat) : null);
      taskLng = task.taskLng ? Number(task.taskLng) : (task.locationLng ? Number(task.locationLng) : null);
    }
  }

  // ── Step 8: Calculate fraud risk score ──
  const riskCtx: PhotoContext = {
    gpsLat: gpsLat ? Number(gpsLat) : undefined,
    gpsLng: gpsLng ? Number(gpsLng) : undefined,
    gpsAccuracy: gpsAccuracy ? Number(gpsAccuracy) : undefined,
    taskLat,
    taskLng,
    ipLat: ipGeo?.lat,
    ipLng: ipGeo?.lng,
    sessionCreatedAt: new Date((session as Record<string, unknown>).createdAt as string),
    photoUploadedAt: serverTimestamp,
    photoExifTimestamp: exifData.dateTimeOriginal,
    isDuplicateHash: duplicateCheck.isDuplicate,
    hashOccurrenceCount: duplicateCheck.count,
    exifPresent,
    exifGpsLat: exifData.gpsLatitude,
    exifGpsLng: exifData.gpsLongitude,
    exifCameraModel: exifData.model,
    exifSoftware: exifData.software,
    challengeCodeInWatermark: true, // Server will verify after watermarking
    userAgent: deviceInfo?.userAgent || (typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined),
  };

  const riskAssessment = calculateRiskScore(riskCtx);

  // ── Step 9: Apply server-side watermark ──
  let savedUrl: string;
  let savedOriginalUrl: string | null = null;
  let watermarkApplied = false;

  try {
    const watermarkResult = await applyServerWatermark({
      imageBuffer: originalBuffer,
      taskId,
      userId: user?.id,
      runnerId: runner?.id,
      proofType: proofType || "general",
      lat: gpsLat ? Number(gpsLat) : undefined,
      lng: gpsLng ? Number(gpsLng) : undefined,
      verificationId: challengeId,
      challengeCode,
      serverTimestamp: serverTimestamp.toISOString(),
    });

    const ext = mimeType.includes("png") ? "png" : "jpg";
    const watermarkFilename = `verify_${taskId}_${proofType || "general"}_${Date.now()}_wm.${ext}`;
    const originalFilename = `verify_${taskId}_${proofType || "general"}_${Date.now()}_orig.${ext}`;

    // Store watermarked version
    if (isB2Configured) {
      const wmResult = await uploadFile(watermarkResult.watermarkedBuffer, watermarkFilename, "verification");
      if (wmResult) {
        savedUrl = wmResult.url;
        watermarkApplied = true;
      } else {
        throw new Error("B2 upload failed for watermarked image");
      }

      // Store original too
      const origResult = await uploadFile(originalBuffer, originalFilename, "verification/originals");
      if (origResult) savedOriginalUrl = origResult.url;
    } else {
      // Local disk fallback
      const uploadsDir = path.join(__dirname, "..", "..", "uploads", "verification");
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

      fs.writeFileSync(path.join(uploadsDir, watermarkFilename), watermarkResult.watermarkedBuffer);
      savedUrl = `/uploads/verification/${watermarkFilename}`;

      fs.writeFileSync(path.join(uploadsDir, originalFilename), originalBuffer);
      savedOriginalUrl = `/uploads/verification/${originalFilename}`;
      watermarkApplied = true;
    }

    // Compute watermark hash
    const watermarkHash = computeImageHash(watermarkResult.watermarkedBuffer);

    // ── Step 10: Register hash for dedup ──
    // (Insert photo first to get ID, then register hash)

    // ── Step 11: Store photo record ──
    const [photoRecord] = await db.insert(photoUploadsTable).values({
      sessionId,
      taskId,
      userId: user?.id,
      runnerId: runner?.id,
      originalHash,
      watermarkHash,
      fileUrl: savedUrl,
      originalFileUrl: savedOriginalUrl,
      fileSize: originalBuffer.length,
      mimeType,
      gpsLat: gpsLat ? Number(gpsLat) : null,
      gpsLng: gpsLng ? Number(gpsLng) : null,
      gpsAccuracy: gpsAccuracy ? Number(gpsAccuracy) : null,
      deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
      exifData: exifPresent ? JSON.stringify(exifData) : null,
      ipAddress,
      serverTimestamp,
      proofType: proofType || "general",
      riskScore: riskAssessment.score,
      riskFactors: JSON.stringify(riskAssessment.factors),
      isDuplicate: duplicateCheck.isDuplicate,
      duplicateOfId: duplicateCheck.photoId,
      verificationId: challengeId,
      challengeCode,
      watermarkApplied,
      status: riskAssessment.blocked ? "flagged" : "uploaded",
    }).returning();

    // Register hash for future dedup
    await registerHash(originalHash, photoRecord.id);

    // ── Step 12: Audit log ──
    await db.insert(verificationAuditLogsTable).values({
      sessionId,
      photoId: photoRecord.id,
      taskId,
      userId: user?.id,
      runnerId: runner?.id,
      action: riskAssessment.blocked ? "photo_flagged" : "photo_uploaded",
      riskScore: riskAssessment.score,
      riskFactors: JSON.stringify(riskAssessment.factors),
      ipAddress,
      metadata: JSON.stringify({
        originalHash,
        fileSize: originalBuffer.length,
        exifPresent,
        duplicate: duplicateCheck.isDuplicate,
        watermarkApplied,
      }),
    });

    // ── Step 13: Complete session ──
    await completeSession(sessionId);

    // ── Step 14: Return result ──
    res.status(201).json({
      photoId: photoRecord.id,
      url: savedUrl,
      originalUrl: savedOriginalUrl,
      verificationId: challengeId,
      challengeCode,
      riskScore: riskAssessment.score,
      riskLevel: riskAssessment.level,
      riskFactors: riskAssessment.factors,
      blocked: riskAssessment.blocked,
      duplicate: duplicateCheck.isDuplicate,
      watermarkApplied,
      serverTimestamp: serverTimestamp.toISOString(),
      exif: exifPresent ? {
        camera: exifData.model,
        software: exifData.software,
        gps: exifData.gpsLatitude ? { lat: exifData.gpsLatitude, lng: exifData.gpsLongitude } : null,
        timestamp: exifData.dateTimeOriginal,
      } : null,
      gpsVerification: {
        reported: gpsLat && gpsLng ? { lat: Number(gpsLat), lng: Number(gpsLng) } : null,
        accuracy: gpsAccuracy ? Number(gpsAccuracy) : null,
        taskLocation: taskLat && taskLng ? { lat: taskLat, lng: taskLng } : null,
      },
      ipLocation: ipGeo ? { city: ipGeo.city, country: ipGeo.country } : null,
    });

    logger.info({
      photoId: photoRecord.id,
      taskId,
      sessionId,
      riskScore: riskAssessment.score,
      riskLevel: riskAssessment.level,
      blocked: riskAssessment.blocked,
    }, "Photo verification complete");
  } catch (err) {
    logger.error({ err, sessionId, taskId }, "Photo verification pipeline failed");
    res.status(500).json({ error: "Photo processing failed", detail: err instanceof Error ? err.message : "Unknown error" });
  }
});

// ─── GET /verification/photos/:id ─────────────────────────────
// Get photo details + risk assessment
router.get("/verification/photos/:id", async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const [photo] = await db.select().from(photoUploadsTable).where(eq(photoUploadsTable.id, id));
  if (!photo) { res.status(404).json({ error: "Photo not found" }); return; }
  const identity = await getRequestIdentity(req);
  if (!await canAccessPhoto(identity, photo)) { res.status(403).json({ error: "Forbidden" }); return; }

  res.json({
    id: photo.id,
    url: photo.fileUrl,
    originalUrl: photo.originalFileUrl,
    verificationId: photo.verificationId,
    challengeCode: photo.challengeCode,
    riskScore: photo.riskScore,
    riskFactors: photo.riskFactors,
    status: photo.status,
    isDuplicate: photo.isDuplicate,
    watermarkApplied: photo.watermarkApplied,
    proofType: photo.proofType,
    serverTimestamp: photo.serverTimestamp,
    gps: { lat: photo.gpsLat, lng: photo.gpsLng, accuracy: photo.gpsAccuracy },
    exif: photo.exifData,
    createdAt: photo.createdAt,
  });
});

// ─── GET /verification/photos/check-hash/:hash ────────────────
// Check if a hash already exists (client-side pre-check)
router.get("/verification/photos/check-hash/:hash", async (req: Request, res: Response): Promise<void> => {
  const identity = await getRequestIdentity(req);
  if (!identity) { res.status(401).json({ error: "Authentication required" }); return; }
  const hash = Array.isArray(req.params.hash) ? req.params.hash[0] : req.params.hash;
  if (!hash || hash.length !== 64) { res.status(400).json({ error: "Invalid hash format" }); return; }

  const check = await checkDuplicateHash(hash);
  res.json({ isDuplicate: check.isDuplicate, occurrenceCount: check.count });
});

export default router;
