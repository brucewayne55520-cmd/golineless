import crypto from "crypto";
import { db, userSessionsTable, runnerSessionsTable, usersTable, runnersTable, adminsTable, adminSessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import { logger } from "./logger";

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash a password using scrypt with a random salt (no external deps).
 * Returns a string in the format `salt:hash` (both hex-encoded).
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a plaintext password against a stored `salt:hash` value
 * using a constant-time comparison.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const candidate = crypto.scryptSync(password, salt, 64);
  if (hashBuf.length !== candidate.length) return false;
  return crypto.timingSafeEqual(hashBuf, candidate);
}

export interface AdminIdentity { id: number; username: string; role: string }

/**
 * Resolve an admin from a session token. Returns null if the token is
 * invalid, expired, or the admin is inactive.
 */
export async function getAdminFromToken(token: string): Promise<AdminIdentity | null> {
  const [session] = await db
    .select({ adminId: adminSessionsTable.adminId, expiresAt: adminSessionsTable.expiresAt })
    .from(adminSessionsTable)
    .where(eq(adminSessionsTable.token, token));

  if (!session || session.expiresAt < new Date()) return null;

  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.id, session.adminId));
  if (!admin || !admin.isActive) return null;
  return { id: admin.id, username: admin.username, role: admin.role };
}

/**
 * Legacy admin identity used when authenticating via the shared ADMIN_TOKEN
 * env var (kept for backwards compatibility / bootstrap & tests).
 */
const LEGACY_ADMIN: AdminIdentity = { id: 0, username: "legacy", role: "superadmin" };

export async function resolveAdmin(token: string | null): Promise<AdminIdentity | null> {
  if (!token) return null;
  if (process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN) return LEGACY_ADMIN;
  return getAdminFromToken(token);
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function getUserFromToken(token: string) {
  const [session] = await db
    .select({ userId: userSessionsTable.userId, expiresAt: userSessionsTable.expiresAt })
    .from(userSessionsTable)
    .where(eq(userSessionsTable.token, token));

  if (!session || session.expiresAt < new Date()) return null;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  return user ?? null;
}

export async function getRunnerFromToken(token: string) {
  const [session] = await db
    .select({ runnerId: runnerSessionsTable.runnerId, expiresAt: runnerSessionsTable.expiresAt })
    .from(runnerSessionsTable)
    .where(eq(runnerSessionsTable.token, token));

  if (!session || session.expiresAt < new Date()) return null;

  const [runner] = await db.select().from(runnersTable).where(eq(runnersTable.id, session.runnerId));
  return runner ?? null;
}

export function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getUserFromToken(token);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  req.user = user;
  next();
}

export async function requireRunner(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  const runner = await getRunnerFromToken(token);
  if (!runner) { res.status(401).json({ error: "Unauthorized" }); return; }
  req.runner = runner;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void | Promise<void> {
  const token = extractToken(req);
  // Synchronous fast-paths (no token, or legacy shared token) so callers that
  // don't await still behave correctly.
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN) {
    req.admin = LEGACY_ADMIN;
    // Fix #66: Log legacy token usage for audit trail
    logger.warn({ ip: req.ip, path: req.path, method: req.method }, "Legacy ADMIN_TOKEN used — consider migrating to per-admin sessions");
    next();
    return;
  }
  // Otherwise resolve a per-admin session asynchronously.
  return getAdminFromToken(token).then((admin) => {
    if (!admin) { res.status(401).json({ error: "Unauthorized" }); return; }
    req.admin = admin;
    next();
  });
}

/**
 * Middleware factory: require an authenticated admin whose role is in the
 * allowed list. The legacy/superadmin role is always permitted.
 */
export function requireAdminRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = extractToken(req);
    const admin = await resolveAdmin(token);
    if (!admin) { res.status(401).json({ error: "Unauthorized" }); return; }
    if (admin.role !== "superadmin" && !roles.includes(admin.role)) {
      res.status(403).json({ error: "Forbidden: insufficient role" }); return;
    }
    req.admin = admin;
    next();
  };
}
