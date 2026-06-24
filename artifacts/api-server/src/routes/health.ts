import { Router, type IRouter, type Request, type Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

// Build timestamp — set at compile time so you can verify which version is live
const BUILD_TIMESTAMP = new Date().toISOString();
const BUILD_VERSION = "1.1.0-offline-cash";

// Fix #89: Health check with DB connectivity test
const healthHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Ping the database with a lightweight query
    await db.select({ one: sql<number>`1` }).from(sql`(SELECT 1) AS _ping`);
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json({ ...data, db: "connected", uptime: Math.round(process.uptime()), buildVersion: BUILD_VERSION, buildTime: BUILD_TIMESTAMP });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    res.status(503).json({ status: "error", db: "disconnected", error: message, uptime: Math.round(process.uptime()), buildVersion: BUILD_VERSION, buildTime: BUILD_TIMESTAMP });
  }
};

router.get("/healthz", healthHandler);
router.get("/health", healthHandler);

export default router;
