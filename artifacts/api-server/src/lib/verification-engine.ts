import crypto from "crypto";
import { db, verificationSessionsTable } from "@workspace/db";
import { eq, and, lt, gte } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Verification Engine — Session management and challenge code generation.
 *
 * Each verification session creates a unique challenge ID and code that
 * MUST appear in the photo watermark. This proves the photo was taken
 * during an active session (not a pre-existing image).
 */

const CHALLENGE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I/O/0/1 to avoid confusion
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

/** Generate a unique verification ID: VER-YYYY-XXXXX */
export function generateVerificationId(): string {
  const year = new Date().getFullYear();
  const seq = crypto.randomInt(0, 99999).toString().padStart(5, "0");
  return `VER-${year}-${seq}`;
}

/** Generate a random 6-character challenge code (readable, no ambiguous chars) */
export function generateChallengeCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHALLENGE_CHARS[crypto.randomInt(0, CHALLENGE_CHARS.length)];
  }
  return code;
}

/** Create a new verification session for a task */
export async function createVerificationSession(params: {
  userId?: number;
  runnerId?: number;
  taskId: number;
  gpsLat?: number;
  gpsLng?: number;
  gpsAccuracy?: number;
  ipAddress?: string;
}): Promise<{
  sessionId: number;
  challengeId: string;
  challengeCode: string;
  expiresAt: Date;
}> {
  const challengeId = generateVerificationId();
  const challengeCode = generateChallengeCode();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const [session] = await db
    .insert(verificationSessionsTable)
    .values({
      userId: params.userId,
      taskId: params.taskId,
      challengeId,
      challengeCode,
      status: "active",
      gpsLat: params.gpsLat,
      gpsLng: params.gpsLng,
      gpsAccuracy: params.gpsAccuracy,
      ipAddress: params.ipAddress,
      expiresAt,
    })
    .returning();

  logger.info(
    { sessionId: session.id, challengeId, taskId: params.taskId, userId: params.userId, runnerId: params.runnerId },
    "Verification session created",
  );

  return { sessionId: session.id, challengeId, challengeCode, expiresAt };
}

/** Validate that a session is active and not expired */
export async function validateSession(
  sessionId: number,
): Promise<{ valid: boolean; session: Record<string, unknown> | null; reason?: string }> {
  const [session] = await db
    .select()
    .from(verificationSessionsTable)
    .where(eq(verificationSessionsTable.id, sessionId));

  if (!session) return { valid: false, session: null, reason: "Session not found" };
  if (session.status !== "active") return { valid: false, session, reason: `Session is ${session.status}` };
  if (session.expiresAt && session.expiresAt < new Date()) {
    // Mark as expired
    await db
      .update(verificationSessionsTable)
      .set({ status: "expired" })
      .where(eq(verificationSessionsTable.id, sessionId));
    return { valid: false, session, reason: "Session expired" };
  }

  return { valid: true, session };
}

/** Validate by challenge ID (alternative lookup) */
export async function validateSessionByChallengeId(
  challengeId: string,
): Promise<{ valid: boolean; session: Record<string, unknown> | null; reason?: string }> {
  const [session] = await db
    .select()
    .from(verificationSessionsTable)
    .where(eq(verificationSessionsTable.challengeId, challengeId));

  if (!session) return { valid: false, session: null, reason: "Session not found" };
  return validateSession(session.id);
}

/** Complete a verification session */
export async function completeSession(sessionId: number): Promise<void> {
  await db
    .update(verificationSessionsTable)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(verificationSessionsTable.id, sessionId));
  logger.info({ sessionId }, "Verification session completed");
}

/** Expire stale sessions (called periodically) */
export async function expireStaleSessions(): Promise<number> {
  const cutoff = new Date(Date.now() - SESSION_TTL_MS);
  // Drizzle's `lt` returns records where column < cutoff
  const stale = await db
    .select({ id: verificationSessionsTable.id })
    .from(verificationSessionsTable)
    .where(
      and(
        eq(verificationSessionsTable.status, "active"),
        lt(verificationSessionsTable.createdAt, cutoff),
      ),
    );

  if (stale.length === 0) return 0;

  const staleIds = stale.map((s) => s.id);
  await db
    .update(verificationSessionsTable)
    .set({ status: "expired" })
    .where(
      and(
        eq(verificationSessionsTable.status, "active"),
        lt(verificationSessionsTable.createdAt, cutoff),
      ),
    );

  logger.info({ count: staleIds.length }, "Expired stale verification sessions");
  return staleIds.length;
}
