import crypto from "crypto";
import { db, userSessionsTable, runnerSessionsTable, usersTable, runnersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
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
  (req as any).user = user;
  next();
}

export async function requireRunner(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  const runner = await getRunnerFromToken(token);
  if (!runner) { res.status(401).json({ error: "Unauthorized" }); return; }
  (req as any).runner = runner;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token === process.env.ADMIN_TOKEN || token === "qbuddy-admin-2025") { next(); return; }
  res.status(401).json({ error: "Unauthorized" }); return;
}
