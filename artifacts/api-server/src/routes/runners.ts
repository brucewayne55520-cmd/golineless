import { Router, type IRouter } from "express";
import crypto from "crypto";
import { encrypt, decrypt } from "../lib/crypto";
import { db, runnersTable, tasksTable, runnerLocationsTable, usersTable, reviewsTable, runnerPayoutsTable } from "@workspace/db";
import { eq, desc, and, gte, sql, inArray, or, count } from "drizzle-orm";
import { requireRunner, requireAdmin, extractToken, getUserFromToken, getRunnerFromToken, resolveAdmin } from "../lib/auth";
import { haversineKm } from "../lib/dispatch-engine";
import { isValidCoordinate } from "../lib/gps-engine";

const router: IRouter = Router();

// GET /runners/me
router.get("/runners/me", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner!;
  const { otp, otpExpiresAt, aadhaarNumber, ...safe } = runner;
  // Auto-generate unique_id if missing (GLR-XXXX-XXXX)
  if (!(safe as any).uniqueId) {
    const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
    const newUniqueId = `GLR-${String(runner.id).padStart(4, "0")}-${suffix}`;
    await db.update(runnersTable).set({ uniqueId: newUniqueId } as any).where(eq(runnersTable.id, runner.id));
    (safe as any).uniqueId = newUniqueId;
  }
  res.json({
    ...safe,
    rating: safe.rating ? Number(safe.rating) : null,
    trustScore: safe.trustScore ?? 50,
    trustBadge: safe.trustBadge ?? "improving",
    totalEarnings: safe.totalEarnings ? Number(safe.totalEarnings) : null,
    averageRating: safe.averageRating ? Number(safe.averageRating) : null,
    averageResponseTime: safe.averageResponseTime ? Number(safe.averageResponseTime) : null,
    currentLat: safe.currentLat ? Number(safe.currentLat) : null,
    currentLng: safe.currentLng ? Number(safe.currentLng) : null,
  });
});

// PATCH /runners/me
router.patch("/runners/me", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner!;
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
  const runner = req.runner!;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Fix #21: SQL aggregation instead of loading all completed tasks into memory
  const [agg, reviewAgg] = await Promise.all([
    db.select({
      lifetime: sql<number>`COALESCE(SUM(${tasksTable.runnerEarning}::numeric), 0)`,
      totalTasks: count(),
      today: sql<number>`COALESCE(SUM(CASE WHEN ${tasksTable.completedAt} >= ${todayStart} THEN ${tasksTable.runnerEarning}::numeric ELSE 0 END), 0)`,
      thisWeek: sql<number>`COALESCE(SUM(CASE WHEN ${tasksTable.completedAt} >= ${weekStart} THEN ${tasksTable.runnerEarning}::numeric ELSE 0 END), 0)`,
      thisMonth: sql<number>`COALESCE(SUM(CASE WHEN ${tasksTable.completedAt} >= ${monthStart} THEN ${tasksTable.runnerEarning}::numeric ELSE 0 END), 0)`,
    }).from(tasksTable).where(and(eq(tasksTable.runnerId, runner.id), eq(tasksTable.status, "completed"))),
    db.select({
      avgRating: sql<number | null>`AVG(${reviewsTable.rating})`,
      cnt: count(),
    }).from(reviewsTable).where(eq(reviewsTable.runnerId, runner.id)),
  ]);

  const r = agg[0];
  res.json({
    today: Number(r.today), thisWeek: Number(r.thisWeek), thisMonth: Number(r.thisMonth),
    lifetime: Number(r.lifetime), totalTasks: r.totalTasks,
    avgRating: reviewAgg[0]?.avgRating ? Number(reviewAgg[0].avgRating).toFixed(1) : null,
    pendingPayout: Number(r.today),
  });
});

// GET /runners/me/earnings/daily
router.get("/runners/me/earnings/daily", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner!;
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7); weekAgo.setHours(0, 0, 0, 0);

  // Fix #22: SQL GROUP BY date instead of loading all completed tasks
  const dailyRows = await db.select({
    date: sql<string>`DATE(${tasksTable.completedAt})`,
    amount: sql<number>`COALESCE(SUM(${tasksTable.runnerEarning}::numeric), 0)`,
    tasks: count(),
  }).from(tasksTable)
    .where(and(eq(tasksTable.runnerId, runner.id), eq(tasksTable.status, "completed"), gte(tasksTable.completedAt, weekAgo)))
    .groupBy(sql`DATE(${tasksTable.completedAt})`);

  // Fill in missing days with zeros
  const dailyMap = new Map(dailyRows.map(r => [r.date, { amount: Number(r.amount), tasks: r.tasks }]));
  const days: { date: string; amount: number; tasks: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const entry = dailyMap.get(dateStr);
    days.push({ date: dateStr, amount: entry?.amount || 0, tasks: entry?.tasks || 0 });
  }
  res.json(days);
});

// POST /runners/kyc
router.post("/runners/kyc", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner!;
  const { fullName, aadhaarNumber, aadhaarFront, aadhaarBack, selfie, bankAccount, bankIfsc,
    bankAccountHolder, emergencyContactName, emergencyContactPhone, emergencyContactRelation } = req.body;

  const [updated] = await db.update(runnersTable).set({
    fullName, aadhaarNumber: aadhaarNumber ? encrypt(aadhaarNumber) : aadhaarNumber, aadhaarFront: aadhaarFront ? encrypt(aadhaarFront) : aadhaarFront, aadhaarBack: aadhaarBack ? encrypt(aadhaarBack) : aadhaarBack, selfie,
    emergencyContactName, emergencyContactPhone, emergencyContactRelation,
    kycStatus: "pending",
  }).where(eq(runnersTable.id, runner.id)).returning();

  const { otp, otpExpiresAt, aadhaarNumber: an, ...safe } = updated;
  res.json(safe);
});

// POST /runners/toggle-online
router.post("/runners/toggle-online", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner!;
  const { isOnline } = req.body;
  const [updated] = await db.update(runnersTable)
    .set({ isOnline })
    .where(eq(runnersTable.id, runner.id))
    .returning();
  const { otp, otpExpiresAt, aadhaarNumber, ...safe } = updated;
  res.json(safe);
});

// POST /runners/me/onboarding — save onboarding step data
router.post("/runners/me/onboarding", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner!;
  const { step, name, fullName, bankAccount, bankIfsc, bankAccountHolder, selfie } = req.body;

  const updates: Record<string, unknown> = {};
  if (step != null) updates.onboardingStep = step;
  if (name) updates.name = name;
  if (fullName) updates.fullName = fullName;
  if (bankAccount) updates.bankAccount = bankAccount;
  if (bankIfsc) updates.bankIfsc = bankIfsc;
  if (bankAccountHolder) updates.bankAccountHolder = bankAccountHolder;
  if (selfie) updates.selfie = selfie;
  if (step === 6) {
    updates.onboardingCompleted = true;
    // Submit KYC as pending when wizard completes
    updates.kycStatus = "pending";
  }

  const [updated] = await db.update(runnersTable).set(updates).where(eq(runnersTable.id, runner.id)).returning();
  const { otp, otpExpiresAt, aadhaarNumber, ...safe } = updated;
  res.json({ ...safe, trustScore: safe.trustScore ?? 50 });
});

// POST /runners/me/gps-check — verify GPS health
router.post("/runners/me/gps-check", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner!;
  const { lat, lng, status } = req.body; // status: "granted" | "denied" | "unavailable"

  // Fix #3: Validate GPS coordinates
  if (lat != null && !isValidCoordinate(lat, "lat")) {
    res.status(400).json({ error: "Invalid latitude value" });
    return;
  }
  if (lng != null && !isValidCoordinate(lng, "lng")) {
    res.status(400).json({ error: "Invalid longitude value" });
    return;
  }
  const updates: Record<string, unknown> = { gpsStatus: status, gpsCheckedAt: new Date() };
  if (lat != null) updates.currentLat = lat.toString();
  if (lng != null) updates.currentLng = lng.toString();

  const [updated] = await db.update(runnersTable).set(updates).where(eq(runnersTable.id, runner.id)).returning();
  const { otp, otpExpiresAt, aadhaarNumber, ...safe } = updated;
  res.json({ ...safe, trustScore: safe.trustScore ?? 50 });
});

// GET /runners/me/active-tasks
router.get("/runners/me/active-tasks", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner!;
  const tasks = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.runnerId, runner.id), inArray(tasksTable.status, ["assigned","on_the_way","at_location","in_progress","waiting_started"])))
    .orderBy(desc(tasksTable.createdAt))
    .limit(1);

  const enriched = await Promise.all(tasks.map(async (task) => {
    const [user] = task.userId ? await db.select().from(usersTable).where(eq(usersTable.id, task.userId)) : [null];
    const safeUser = user ? (({ otp, otpExpiresAt, ...u }) => u)(user) : null;
    return { ...task, user: safeUser };
  }));

  res.json(enriched[0] || null);
});

// GET /runners/me/readiness — compute dispatch readiness score (0-100%)
router.get("/runners/me/readiness", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner!;

  const kycReady = runner.kycStatus === "verified" || runner.dispatchAllowed === true;
  const gpsReady = runner.gpsStatus === "granted";
  const bankReady = !!(runner.bankAccount && runner.bankIfsc && runner.bankAccountHolder);
  const onlineReady = runner.isOnline === true;
  const selfieReady = !!runner.selfie;
  const nameReady = !!(runner.name || runner.fullName);

  const scores = {
    kyc: kycReady ? 100 : runner.kycStatus === "pending" ? 50 : 0,
    gps: gpsReady ? 100 : 0,
    bank: bankReady ? 100 : 0,
    online: onlineReady ? 100 : 0,
    selfie: selfieReady ? 100 : 0,
    name: nameReady ? 100 : 0,
  };

  const total = Math.round(
    scores.kyc * 0.30 + scores.gps * 0.20 + scores.bank * 0.20 +
    scores.online * 0.20 + scores.selfie * 0.05 + scores.name * 0.05
  );

  res.json({
    score: total,
    breakdown: scores,
    status: total >= 80 ? "ready" : total >= 50 ? "partial" : "not_ready",
    missingItems: Object.entries(scores).filter(([, v]) => v < 100).map(([k]) => k),
  });
});

// GET /runners/available — Phase 7.1: List available online/verified comrades for booking preview (no auth)
router.get("/runners/available", async (_req, res): Promise<void> => {
  const available = await db
    .select({
      id: runnersTable.id, name: runnersTable.name,
      rating: runnersTable.rating, trustScore: runnersTable.trustScore,
      trustBadge: runnersTable.trustBadge, tasksCompleted: runnersTable.tasksCompleted,
      kycStatus: runnersTable.kycStatus,
    })
    .from(runnersTable)
    .where(and(
      eq(runnersTable.isOnline, true),
      or(eq(runnersTable.kycStatus, "verified"), eq(runnersTable.dispatchAllowed, true)),
    ))
    .limit(20);

  res.json(available.map(r => ({
    id: r.id, name: r.name || "Comrade",
    rating: r.rating ? Number(r.rating) : null,
    trustScore: r.trustScore ?? 50,
    trustBadge: r.trustBadge ?? "improving",
    tasksCompleted: r.tasksCompleted ?? 0,
    isOnline: true,
    kycStatus: r.kycStatus,
  })));
});

// GET /runners/nearby/:taskId — Phase 7: Preview nearby available comrades for booking
router.get("/runners/nearby/:taskId", async (req, res): Promise<void> => {
  const taskId = parseInt(Array.isArray(req.params.taskId) ? req.params.taskId[0] : req.params.taskId, 10);
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }

  const taskLat = task.taskLat ? Number(task.taskLat) : task.locationLat ? Number(task.locationLat) : null;
  const taskLng = task.taskLng ? Number(task.taskLng) : task.locationLng ? Number(task.locationLng) : null;

  const nearby = await db
    .select({
      id: runnersTable.id, name: runnersTable.name,
      rating: runnersTable.rating, trustScore: runnersTable.trustScore,
      tasksCompleted: runnersTable.tasksCompleted, trustBadge: runnersTable.trustBadge,
      currentLat: runnersTable.currentLat, currentLng: runnersTable.currentLng,
      isOnline: runnersTable.isOnline, kycStatus: runnersTable.kycStatus,
    })
    .from(runnersTable)
    .where(and(
      eq(runnersTable.isOnline, true),
      or(eq(runnersTable.kycStatus, "verified"), eq(runnersTable.dispatchAllowed, true)),
    ))
    .limit(20);

  const enriched = nearby.map(r => {
    const lat = r.currentLat ? Number(r.currentLat) : null;
    const lng = r.currentLng ? Number(r.currentLng) : null;
    let distanceKm = null;
    if (lat && lng && taskLat && taskLng) {
      distanceKm = Math.round(haversineKm(taskLat, taskLng, lat, lng) * 10) / 10;
    }
    return {
      id: r.id, name: r.name || "Comrade",
      rating: r.rating ? Number(r.rating) : null,
      trustScore: r.trustScore ?? 50,
      trustBadge: r.trustBadge ?? "improving",
      tasksCompleted: r.tasksCompleted ?? 0,
      distanceKm,
    };
  }).sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

  res.json(enriched);
});

// GET /runners/:id
router.get("/runners/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [runner] = await db.select().from(runnersTable).where(eq(runnersTable.id, id));
  if (!runner) { res.status(404).json({ error: "Runner not found" }); return; }
  const { otp, otpExpiresAt, aadhaarNumber, aadhaarFront, aadhaarBack, selfie, phone, bankAccount, bankIfsc, bankAccountHolder, emergencyContactName, emergencyContactPhone, emergencyContactRelation, email, ...safe } = runner;
  res.json({
    id: safe.id,
    name: safe.name,
    fullName: safe.fullName,
    rating: safe.rating ? Number(safe.rating) : null,
    trustScore: safe.trustScore ?? 50,
    trustBadge: safe.trustBadge ?? "improving",
    tasksCompleted: safe.tasksCompleted ?? 0,
    isOnline: safe.isOnline,
    kycStatus: safe.kycStatus,
    dispatchAllowed: safe.dispatchAllowed,
    currentLat: safe.currentLat ? Number(safe.currentLat) : null,
    currentLng: safe.currentLng ? Number(safe.currentLng) : null,
    city: safe.city,
    area: safe.area,
    avatar: safe.avatar,
  });
});

// GET /runners/:id/location/:taskId
router.get("/runners/:id/location/:taskId", async (req, res): Promise<void> => {
  const runnerId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const taskId = parseInt(Array.isArray(req.params.taskId) ? req.params.taskId[0] : req.params.taskId, 10);

  // Require auth: admin, task owner, assigned runner, or valid family tracking token
  const token = extractToken(req);
  let authorized = false;

  if (token) {
    // Check admin
    const admin = await resolveAdmin(token);
    if (admin) {
      authorized = true;
    } else {
      // Check if token is from the task owner (user)
      const user = await getUserFromToken(token);
      if (user) {
        const [task] = await db.select({ userId: tasksTable.userId }).from(tasksTable).where(eq(tasksTable.id, taskId));
        if (task && task.userId === user.id) {
          authorized = true;
        }
      }
      // Check if token is from the assigned runner
      if (!authorized) {
        const runner = await getRunnerFromToken(token);
        if (runner && runner.id === runnerId) {
          authorized = true;
        }
      }
    }
  }

  if (!authorized) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const [loc] = await db.select().from(runnerLocationsTable)
    .where(and(eq(runnerLocationsTable.runnerId, runnerId), eq(runnerLocationsTable.taskId, taskId)))
    .orderBy(desc(runnerLocationsTable.recordedAt))
    .limit(1);

  if (!loc) {
    // Fall back to runner's current location
    const [runner] = await db.select().from(runnersTable).where(eq(runnersTable.id, runnerId));
    if (!runner || !runner.currentLat) {
      res.json({ runnerId, taskId, lat: null, lng: null, heading: null, speed: null, recordedAt: null });
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

// GET /runners/me/payouts — payout settlement history for the logged-in runner
router.get("/runners/me/payouts", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner!;
  const payouts = await db.select().from(runnerPayoutsTable)
    .where(eq(runnerPayoutsTable.runnerId, runner.id))
    .orderBy(desc(runnerPayoutsTable.createdAt));

  // Total paid out and pending
  const settledPayouts = payouts.filter(p => p.status === "settled");
  const totalPaidOut = settledPayouts.reduce((s, p) => s + Number(p.amount || 0), 0);
  const cancelledPayouts = payouts.filter(p => p.status === "cancelled");

  res.json({
    payouts: payouts.map(p => ({
      id: p.id,
      amount: Number(p.amount),
      taskCount: p.taskCount,
      status: p.status,
      reference: p.reference,
      notes: p.notes,
      settledAt: p.settledAt,
      createdAt: p.createdAt,
    })),
    totalPaidOut,
    settledCount: settledPayouts.length,
    cancelledCount: cancelledPayouts.length,
  });
});

// POST /runners/me/payout-request — Runner requests payout of pending earnings
router.post("/runners/me/payout-request", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner!;
  const { amount, notes } = req.body;

  // Prevent duplicate pending payout requests
  const [existingPending] = await db.select({ id: runnerPayoutsTable.id })
    .from(runnerPayoutsTable)
    .where(and(eq(runnerPayoutsTable.runnerId, runner.id), eq(runnerPayoutsTable.status, "pending")))
    .limit(1);
  if (existingPending) {
    res.status(400).json({ error: "You already have a pending payout request. Please wait for it to be processed." });
    return;
  }

  // Calculate total pending earnings: total earned minus already-settled payouts
  const [earningsAgg, settledAgg] = await Promise.all([
    db.select({
      totalEarned: sql<number>`COALESCE(SUM(${tasksTable.runnerEarning}::numeric), 0)`,
    }).from(tasksTable).where(and(
      eq(tasksTable.runnerId, runner.id),
      eq(tasksTable.status, "completed"),
    )),
    db.select({
      totalSettled: sql<number>`COALESCE(SUM(${runnerPayoutsTable.amount}::numeric), 0)`,
    }).from(runnerPayoutsTable).where(and(
      eq(runnerPayoutsTable.runnerId, runner.id),
      eq(runnerPayoutsTable.status, "settled"),
    )),
  ]);

  const totalEarned = Number(earningsAgg[0]?.totalEarned || 0);
  const totalSettled = Number(settledAgg[0]?.totalSettled || 0);
  const pendingAmount = Math.max(0, totalEarned - totalSettled);
  const requestAmount = amount ? Number(amount) : pendingAmount;

  if (requestAmount <= 0) {
    res.status(400).json({ error: "No pending earnings to withdraw", pendingEarnings: pendingAmount });
    return;
  }

  if (requestAmount > pendingAmount) {
    res.status(400).json({ error: "Requested amount exceeds pending earnings", pendingEarnings: pendingAmount, requested: requestAmount });
    return;
  }

  // Create payout request
  const [payout] = await db.insert(runnerPayoutsTable).values({
    runnerId: runner.id,
    amount: requestAmount.toString(),
    taskCount: 0, // Admin will reconcile
    status: "pending",
    notes: notes || `Runner payout request for Rs ${requestAmount}`,
  }).returning();

  res.json({
    payout: { id: payout.id, amount: Number(payout.amount), status: payout.status, createdAt: payout.createdAt },
    message: `Payout request of Rs ${requestAmount} submitted. Admin will review and process it.`,
    pendingEarnings: pendingAmount - requestAmount,
  });
});

export default router;
