import { Router, type IRouter } from "express";
import { db, runnersTable, tasksTable, runnerLocationsTable } from "@workspace/db";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { requireRunner, requireAdmin } from "../lib/auth";

const router: IRouter = Router();

// GET /runners/me
router.get("/runners/me", requireRunner, async (req, res): Promise<void> => {
  const runner = (req as any).runner;
  const { otp, otpExpiresAt, aadhaarNumber, ...safe } = runner;
  res.json({
    ...safe,
    rating: safe.rating ? Number(safe.rating) : null,
    totalEarnings: safe.totalEarnings ? Number(safe.totalEarnings) : null,
    currentLat: safe.currentLat ? Number(safe.currentLat) : null,
    currentLng: safe.currentLng ? Number(safe.currentLng) : null,
  });
});

// PATCH /runners/me
router.patch("/runners/me", requireRunner, async (req, res): Promise<void> => {
  const runner = (req as any).runner;
  const { name, email, city, area } = req.body;
  const [updated] = await db
    .update(runnersTable)
    .set({ name, email, city, area })
    .where(eq(runnersTable.id, runner.id))
    .returning();
  const { otp, otpExpiresAt, aadhaarNumber, ...safe } = updated;
  res.json(safe);
});

// GET /runners/me/earnings
router.get("/runners/me/earnings", requireRunner, async (req, res): Promise<void> => {
  const runner = (req as any).runner;
  const tasks = await db.select().from(tasksTable)
    .where(and(eq(tasksTable.runnerId, runner.id), eq(tasksTable.status, "completed")));

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const today = tasks.filter(t => t.completedAt && t.completedAt >= todayStart).reduce((s, t) => s + Number(t.runnerEarning || 0), 0);
  const thisWeek = tasks.filter(t => t.completedAt && t.completedAt >= weekStart).reduce((s, t) => s + Number(t.runnerEarning || 0), 0);
  const thisMonth = tasks.filter(t => t.completedAt && t.completedAt >= monthStart).reduce((s, t) => s + Number(t.runnerEarning || 0), 0);
  const lifetime = tasks.reduce((s, t) => s + Number(t.runnerEarning || 0), 0);

  const { reviewsTable } = await import("@workspace/db");
  const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.runnerId, runner.id));
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  res.json({ today, thisWeek, thisMonth, lifetime, totalTasks: tasks.length, avgRating, pendingPayout: today });
});

// GET /runners/me/earnings/daily
router.get("/runners/me/earnings/daily", requireRunner, async (req, res): Promise<void> => {
  const runner = (req as any).runner;
  const tasks = await db.select().from(tasksTable)
    .where(and(eq(tasksTable.runnerId, runner.id), eq(tasksTable.status, "completed")));

  const days: { date: string; amount: number; tasks: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayStart.getDate() + 1);
    const dayTasks = tasks.filter(t => t.completedAt && t.completedAt >= dayStart && t.completedAt < dayEnd);
    days.push({
      date: dateStr,
      amount: dayTasks.reduce((s, t) => s + Number(t.runnerEarning || 0), 0),
      tasks: dayTasks.length,
    });
  }
  res.json(days);
});

// POST /runners/kyc
router.post("/runners/kyc", requireRunner, async (req, res): Promise<void> => {
  const runner = (req as any).runner;
  const { fullName, aadhaarNumber, aadhaarFront, aadhaarBack, selfie, bankAccount, bankIfsc,
    bankAccountHolder, emergencyContactName, emergencyContactPhone, emergencyContactRelation } = req.body;

  const [updated] = await db.update(runnersTable).set({
    fullName, aadhaarNumber, aadhaarFront, aadhaarBack, selfie,
    bankAccount, bankIfsc, bankAccountHolder,
    emergencyContactName, emergencyContactPhone, emergencyContactRelation,
    kycStatus: "pending",
  }).where(eq(runnersTable.id, runner.id)).returning();

  const { otp, otpExpiresAt, aadhaarNumber: an, ...safe } = updated;
  res.json(safe);
});

// POST /runners/toggle-online
router.post("/runners/toggle-online", requireRunner, async (req, res): Promise<void> => {
  const runner = (req as any).runner;
  const { isOnline } = req.body;
  const [updated] = await db.update(runnersTable)
    .set({ isOnline })
    .where(eq(runnersTable.id, runner.id))
    .returning();
  const { otp, otpExpiresAt, aadhaarNumber, ...safe } = updated;
  res.json(safe);
});

// GET /runners/:id
router.get("/runners/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [runner] = await db.select().from(runnersTable).where(eq(runnersTable.id, id));
  if (!runner) { res.status(404).json({ error: "Runner not found" }); return; }
  const { otp, otpExpiresAt, aadhaarNumber, ...safe } = runner;
  res.json({
    ...safe,
    rating: safe.rating ? Number(safe.rating) : null,
    currentLat: safe.currentLat ? Number(safe.currentLat) : null,
    currentLng: safe.currentLng ? Number(safe.currentLng) : null,
  });
});

// GET /runners/:id/location/:taskId
router.get("/runners/:id/location/:taskId", async (req, res): Promise<void> => {
  const runnerId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const taskId = parseInt(Array.isArray(req.params.taskId) ? req.params.taskId[0] : req.params.taskId, 10);

  const [loc] = await db.select().from(runnerLocationsTable)
    .where(and(eq(runnerLocationsTable.runnerId, runnerId), eq(runnerLocationsTable.taskId, taskId)))
    .orderBy(desc(runnerLocationsTable.recordedAt))
    .limit(1);

  if (!loc) {
    // Fall back to runner's current location
    const [runner] = await db.select().from(runnersTable).where(eq(runnersTable.id, runnerId));
    if (!runner || !runner.currentLat) {
      res.json({ runnerId, taskId, lat: 23.0225, lng: 72.5714, heading: null, speed: null, recordedAt: new Date().toISOString() });
      return;
    }
    res.json({ runnerId, taskId, lat: Number(runner.currentLat), lng: Number(runner.currentLng), heading: null, speed: null, recordedAt: new Date().toISOString() });
    return;
  }

  res.json({
    runnerId: loc.runnerId, taskId: loc.taskId,
    lat: Number(loc.lat), lng: Number(loc.lng),
    heading: loc.heading ? Number(loc.heading) : null,
    speed: loc.speed ? Number(loc.speed) : null,
    recordedAt: loc.recordedAt.toISOString(),
  });
});

export default router;
