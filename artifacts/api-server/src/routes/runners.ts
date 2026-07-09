import { Router, type IRouter } from "express";
import crypto from "crypto";
import { encrypt, decrypt } from "../lib/crypto";
import { uploadDataUrl } from "../lib/storage";
import { db, runnersTable, tasksTable, runnerLocationsTable, usersTable, reviewsTable, runnerPayoutsTable, runnerSessionsTable } from "@workspace/db";
import { eq, desc, and, gte, ne, sql, inArray, or, count } from "drizzle-orm";
import { requireRunner, requireAdmin, extractToken, getUserFromToken, getRunnerFromToken, resolveAdmin, verifyPassword, hashPassword } from "../lib/auth";
import { haversineKm } from "../lib/dispatch-engine";
import { isValidCoordinate } from "../lib/gps-engine";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// GET /runners/me
router.get("/runners/me", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner;
  if (!runner) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { otp, otpExpiresAt, aadhaarNumber, ...safe } = runner;
    // Auto-generate unique_id if missing (GLR-XXXX-XXXX)
    const runnerRecord = safe as Record<string, unknown>;
    if (!runnerRecord.uniqueId) {
      const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
      const newUniqueId = `GLR-${String(runner.id).padStart(4, "0")}-${suffix}`;
      await db.update(runnersTable).set({ uniqueId: newUniqueId } as Record<string, unknown>).where(eq(runnersTable.id, runner.id));
      runnerRecord.uniqueId = newUniqueId;
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
  } catch (err) {
    logger.error({ err, runnerId: runner.id }, "GET /runners/me failed");
    res.status(500).json({ error: "Failed to load profile" });
  }
});

// PATCH /runners/me
router.patch("/runners/me", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner;
  if (!runner) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { name, email, city, area, gender, fullName, bankAccount, bankIfsc, bankAccountHolder,
      emergencyContactName, emergencyContactPhone, emergencyContactRelation } = req.body;
    // B1 FIX: Allow updating more profile fields from the profile page
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (city !== undefined) updates.city = city;
    if (area !== undefined) updates.area = area;
    if (gender !== undefined) updates.gender = gender;
    if (fullName !== undefined) updates.fullName = fullName;
    if (bankAccount !== undefined) updates.bankAccount = bankAccount;
    if (bankIfsc !== undefined) updates.bankIfsc = bankIfsc;
    if (bankAccountHolder !== undefined) updates.bankAccountHolder = bankAccountHolder;
    if (emergencyContactName !== undefined) updates.emergencyContactName = emergencyContactName;
    if (emergencyContactPhone !== undefined) updates.emergencyContactPhone = emergencyContactPhone;
    if (emergencyContactRelation !== undefined) updates.emergencyContactRelation = emergencyContactRelation;
    const [updated] = await db
      .update(runnersTable)
      .set(updates)
      .where(eq(runnersTable.id, runner.id))
      .returning();
    const { otp, otpExpiresAt, aadhaarNumber, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    logger.error({ err, runnerId: runner.id }, "PATCH /runners/me failed");
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// GET /runners/me/earnings
router.get("/runners/me/earnings", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner;
  if (!runner) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [agg, reviewAgg] = await Promise.all([
      db.select({
        lifetime: sql<number>`COALESCE(SUM(${tasksTable.runnerEarning}::numeric), 0)`,
        totalTasks: count(),
        today: sql<number>`COALESCE(SUM(CASE WHEN ${tasksTable.completedAt} >= ${todayStart} THEN ${tasksTable.runnerEarning}::numeric ELSE 0 END), 0)`,
        thisWeek: sql<number>`COALESCE(SUM(CASE WHEN ${tasksTable.completedAt} >= ${weekStart} THEN ${tasksTable.runnerEarning}::numeric ELSE 0 END), 0)`,
        thisMonth: sql<number>`COALESCE(SUM(CASE WHEN ${tasksTable.completedAt} >= ${monthStart} THEN ${tasksTable.runnerEarning}::numeric ELSE 0 END), 0)`,
        taskEarnings: sql<number>`COALESCE(SUM(${tasksTable.runnerEarning}::numeric), 0)`,
        waitingEarnings: sql<number>`COALESCE(SUM(${tasksTable.waitingEarnings}::numeric), 0)`,
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
      taskEarnings: Number(r.taskEarnings),
      waitingEarnings: Number(r.waitingEarnings),
      avgRating: reviewAgg[0]?.avgRating ? Number(reviewAgg[0].avgRating).toFixed(1) : null,
      pendingPayout: Number(r.today),
    });
  } catch (err) {
    logger.error({ err, runnerId: runner.id }, "GET /runners/me/earnings failed");
    res.status(500).json({ error: "Failed to load earnings" });
  }
});

// GET /runners/me/earnings/daily
router.get("/runners/me/earnings/daily", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner;
  if (!runner) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7); weekAgo.setHours(0, 0, 0, 0);

    const dailyRows = await db.select({
      date: sql<string>`DATE(${tasksTable.completedAt})`,
      amount: sql<number>`COALESCE(SUM(${tasksTable.runnerEarning}::numeric), 0)`,
      tasks: count(),
    }).from(tasksTable)
      .where(and(eq(tasksTable.runnerId, runner.id), eq(tasksTable.status, "completed"), gte(tasksTable.completedAt, weekAgo)))
      .groupBy(sql`DATE(${tasksTable.completedAt})`);

    const dailyMap = new Map(dailyRows.map(r => [r.date, { amount: Number(r.amount), tasks: r.tasks }]));
    const days: { date: string; amount: number; tasks: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const entry = dailyMap.get(dateStr);
      days.push({ date: dateStr, amount: entry?.amount || 0, tasks: entry?.tasks || 0 });
    }
    res.json(days);
  } catch (err) {
    logger.error({ err, runnerId: runner.id }, "GET /runners/me/earnings/daily failed");
    res.status(500).json({ error: "Failed to load daily earnings" });
  }
});

// POST /runners/kyc
router.post("/runners/kyc", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner;
  if (!runner) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { fullName, aadhaarNumber, aadhaarFront, aadhaarBack, selfie, bankAccount, bankIfsc,
      bankAccountHolder, emergencyContactName, emergencyContactPhone, emergencyContactRelation } = req.body;

    // S2: Upload Aadhaar images + selfie to B2 cloud storage instead of storing base64 in DB
    const [aadhaarFrontUrl, aadhaarBackUrl, selfieUrl] = await Promise.all([
      uploadDataUrl(aadhaarFront, "kyc/runners"),
      uploadDataUrl(aadhaarBack, "kyc/runners"),
      selfie ? uploadDataUrl(selfie, "kyc/runners") : Promise.resolve(selfie),
    ]);

    // M12: Validate Aadhaar number format (12 digits)
    if (aadhaarNumber && !/^\d{12}$/.test(aadhaarNumber)) {
      res.status(400).json({ error: "Aadhaar number must be exactly 12 digits" });
      return;
    }

    const kycUpdates: Record<string, unknown> = {
      fullName,
      aadhaarNumber: aadhaarNumber ? encrypt(aadhaarNumber) : aadhaarNumber,
      aadhaarFront: aadhaarFrontUrl ? encrypt(aadhaarFrontUrl) : aadhaarFrontUrl,
      aadhaarBack: aadhaarBackUrl ? encrypt(aadhaarBackUrl) : aadhaarBackUrl,
      selfie: selfieUrl,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      kycStatus: "pending",
    };
    const [updated] = await db.update(runnersTable).set(kycUpdates).where(eq(runnersTable.id, runner.id)).returning();

    const { otp, otpExpiresAt, aadhaarNumber: an, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    logger.error({ err, runnerId: runner.id }, "POST /runners/kyc failed");
    res.status(500).json({ error: "Failed to submit KYC" });
  }
});

// PATCH /runners/me/avatar — upload profile photo
router.patch("/runners/me/avatar", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner;
  if (!runner) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { avatar } = req.body; // base64 data URL or URL string
    if (!avatar) {
      res.status(400).json({ error: "No avatar provided" }); return;
    }
    const avatarUrl = await uploadDataUrl(avatar, "avatars/runners");
    if (!avatarUrl) {
      res.status(500).json({ error: "Failed to upload avatar" }); return;
    }
    const [updated] = await db
      .update(runnersTable)
      .set({ avatar: avatarUrl })
      .where(eq(runnersTable.id, runner.id))
      .returning();
    const { otp, otpExpiresAt, aadhaarNumber, ...safe } = updated;
    res.json({ avatar: safe.avatar });
  } catch (err) {
    logger.error({ err, runnerId: runner.id }, "PATCH /runners/me/avatar failed");
    res.status(500).json({ error: "Failed to upload avatar" });
  }
});

// POST /runners/toggle-online
router.post("/runners/toggle-online", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner;
  if (!runner) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { isOnline } = req.body;
    const [updated] = await db.update(runnersTable)
      .set({ isOnline })
      .where(eq(runnersTable.id, runner.id))
      .returning();
    const { otp, otpExpiresAt, aadhaarNumber, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    logger.error({ err, runnerId: runner.id }, "POST /runners/toggle-online failed");
    res.status(500).json({ error: "Failed to update online status" });
  }
});

// POST /runners/me/onboarding — save onboarding step data
router.post("/runners/me/onboarding", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner;
  if (!runner) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { step, name, fullName, bankAccount, bankIfsc, bankAccountHolder, selfie } = req.body;

    const updates: Record<string, unknown> = {};
    if (step != null) updates.onboardingStep = step;
    if (name) updates.name = name;
    if (fullName) updates.fullName = fullName;
    if (bankAccount) updates.bankAccount = bankAccount;
    if (bankIfsc) updates.bankIfsc = bankIfsc;
    if (bankAccountHolder) updates.bankAccountHolder = bankAccountHolder;
    if (selfie) updates.selfie = await uploadDataUrl(selfie, "kyc/runners");
    if (step === 6) {
      updates.onboardingCompleted = true;
      updates.kycStatus = "pending";
    }

    const [updated] = await db.update(runnersTable).set(updates).where(eq(runnersTable.id, runner.id)).returning();
    const { otp, otpExpiresAt, aadhaarNumber, ...safe } = updated;
    res.json({ ...safe, trustScore: safe.trustScore ?? 50 });
  } catch (err) {
    logger.error({ err, runnerId: runner.id }, "POST /runners/me/onboarding failed");
    res.status(500).json({ error: "Failed to save onboarding data" });
  }
});

// POST /runners/me/gps-check — verify GPS health
router.post("/runners/me/gps-check", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner;
  if (!runner) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { lat, lng, status } = req.body;

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
  } catch (err) {
    logger.error({ err, runnerId: runner.id }, "POST /runners/me/gps-check failed");
    res.status(500).json({ error: "Failed to update GPS status" });
  }
});

// GET /runners/me/active-tasks
router.get("/runners/me/active-tasks", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner;
  if (!runner) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const tasks = await db
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.runnerId, runner.id), inArray(tasksTable.status, ["assigned","on_the_way","at_location","in_progress","waiting_started"])))
      .orderBy(desc(tasksTable.createdAt))
      .limit(1);

    const enriched = await Promise.all(tasks.map(async (task: typeof tasksTable.$inferSelect) => {
      const [user] = task.userId ? await db.select().from(usersTable).where(eq(usersTable.id, task.userId)) : [null];
      const safeUser = user ? (({ otp: _o, otpExpiresAt: _e, ...u }: Record<string, unknown>) => u)(user as Record<string, unknown>) : null;
      return { ...task, user: safeUser };
    }));

    res.json(enriched[0] || null);
  } catch (err) {
    logger.error({ err, runnerId: runner.id }, "GET /runners/me/active-tasks failed");
    res.status(500).json({ error: "Failed to load active tasks" });
  }
});

// GET /runners/me/readiness — compute dispatch readiness score (0-100%)
router.get("/runners/me/readiness", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner;
  if (!runner) { res.status(401).json({ error: "Unauthorized" }); return; }

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
  try {
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
  } catch (err) {
    logger.error({ err }, "GET /runners/available failed");
    res.status(500).json({ error: "Failed to load available runners" });
  }
});

// GET /runners/nearby/:taskId — Phase 7: Preview nearby available comrades for booking
router.get("/runners/nearby/:taskId", async (req, res): Promise<void> => {
  try {
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

    const enriched = nearby.map((r: { id: number; name: string | null; rating: string | null; trustScore: number | null; tasksCompleted: number | null; trustBadge: string | null; currentLat: string | null; currentLng: string | null; isOnline: boolean | null; kycStatus: string | null }) => {
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
  } catch (err) {
    logger.error({ err }, "GET /runners/nearby/:taskId failed");
    res.status(500).json({ error: "Failed to load nearby runners" });
  }
});

// GET /runners/:id
router.get("/runners/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const [runner] = await db.select().from(runnersTable).where(eq(runnersTable.id, id));
    if (!runner) { res.status(404).json({ error: "Runner not found" }); return; }
    const { otp: _otp, otpExpiresAt: _otpExp, aadhaarNumber: _aadhaar, aadhaarFront: _front, aadhaarBack: _back, selfie: _selfie, phone: _phone, bankAccount: _bank, bankIfsc: _ifsc, bankAccountHolder: _holder, emergencyContactName: _ecName, emergencyContactPhone: _ecPhone, emergencyContactRelation: _ecRel, email: _email, ...safe } = runner;
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
  } catch (err) {
    logger.error({ err }, "GET /runners/:id failed");
    res.status(500).json({ error: "Failed to load runner profile" });
  }
});

// GET /runners/:id/location/:taskId
router.get("/runners/:id/location/:taskId", async (req, res): Promise<void> => {
  try {
    const runnerId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const taskId = parseInt(Array.isArray(req.params.taskId) ? req.params.taskId[0] : req.params.taskId, 10);

    const token = extractToken(req);
    let authorized = false;

    if (token) {
      const admin = await resolveAdmin(token);
      if (admin) {
        authorized = true;
      } else {
        const user = await getUserFromToken(token);
        if (user) {
          const [task] = await db.select({ userId: tasksTable.userId }).from(tasksTable).where(eq(tasksTable.id, taskId));
          if (task && task.userId === user.id) {
            authorized = true;
          }
        }
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
  } catch (err) {
    logger.error({ err }, "GET /runners/:id/location/:taskId failed");
    res.status(500).json({ error: "Failed to load runner location" });
  }
});

// GET /runners/me/payouts — payout settlement history for the logged-in runner
router.get("/runners/me/payouts", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner;
  if (!runner) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const payouts = await db.select().from(runnerPayoutsTable)
      .where(eq(runnerPayoutsTable.runnerId, runner.id))
      .orderBy(desc(runnerPayoutsTable.createdAt));

    const settledPayouts = payouts.filter((p: typeof runnerPayoutsTable.$inferSelect) => p.status === "settled");
    const totalPaidOut = settledPayouts.reduce((s: number, p: typeof runnerPayoutsTable.$inferSelect) => s + Number(p.amount || 0), 0);
    const cancelledPayouts = payouts.filter((p: typeof runnerPayoutsTable.$inferSelect) => p.status === "cancelled");

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
  } catch (err) {
    logger.error({ err, runnerId: runner.id }, "GET /runners/me/payouts failed");
    res.status(500).json({ error: "Failed to load payout history" });
  }
});

// POST /runners/me/payout-request — Runner requests payout of pending earnings
router.post("/runners/me/payout-request", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner;
  if (!runner) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { amount, notes } = req.body;

    const [existingPending] = await db.select({ id: runnerPayoutsTable.id })
      .from(runnerPayoutsTable)
      .where(and(eq(runnerPayoutsTable.runnerId, runner.id), eq(runnerPayoutsTable.status, "pending")))
      .limit(1);
    if (existingPending) {
      res.status(400).json({ error: "You already have a pending payout request. Please wait for it to be processed." });
      return;
    }

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

    const [payout] = await db.insert(runnerPayoutsTable).values({
      runnerId: runner.id,
      amount: requestAmount.toString(),
      taskCount: 0,
      status: "pending",
      notes: notes || `Runner payout request for Rs ${requestAmount}`,
    }).returning();

    res.json({
      payout: { id: payout.id, amount: Number(payout.amount), status: payout.status, createdAt: payout.createdAt },
      message: `Payout request of Rs ${requestAmount} submitted. Admin will review and process it.`,
      pendingEarnings: pendingAmount - requestAmount,
    });
  } catch (err) {
    logger.error({ err, runnerId: runner.id }, "POST /runners/me/payout-request failed");
    res.status(500).json({ error: "Failed to submit payout request" });
  }
});

// GET /runners/me/reviews — list reviews for the logged-in runner
router.get("/runners/me/reviews", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner;
  if (!runner) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { limit = "20", offset = "0" } = req.query as Record<string, string>;

    const reviews = await db
      .select({
        id: reviewsTable.id,
        taskId: reviewsTable.taskId,
        userId: reviewsTable.userId,
        rating: reviewsTable.rating,
        review: reviewsTable.review,
        createdAt: reviewsTable.createdAt,
      })
      .from(reviewsTable)
      .where(eq(reviewsTable.runnerId, runner.id))
      .orderBy(desc(reviewsTable.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));

    const enriched = await Promise.all(reviews.map(async (r) => {
      const [user] = r.userId ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, r.userId)) : [null];
      return { ...r, userName: user?.name ?? "Client" };
    }));

    res.json(enriched);
  } catch (err) {
    logger.error({ err, runnerId: runner.id }, "GET /runners/me/reviews failed");
    res.status(500).json({ error: "Failed to load reviews" });
  }
});

// GET /runners/me/stats — aggregated stats endpoint (E4)
router.get("/runners/me/stats", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner;
  if (!runner) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7); weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [weekAgg, monthAgg, totalAgg] = await Promise.all([
      db.select({
        count: count(),
        avgResponse: sql<number | null>`AVG(${tasksTable.timeToAcceptance})`,
      }).from(tasksTable).where(and(
        eq(tasksTable.runnerId, runner.id),
        eq(tasksTable.status, "completed"),
        gte(tasksTable.completedAt, weekStart),
      )),
      db.select({
        total: count(),
        cancelled: sql<number>`SUM(CASE WHEN ${tasksTable.status} = 'cancelled' THEN 1 ELSE 0 END)`,
      }).from(tasksTable).where(and(
        eq(tasksTable.runnerId, runner.id),
        gte(tasksTable.createdAt, monthStart),
      )),
      db.select({
        totalTasks: count(),
        completedTasks: sql<number>`SUM(CASE WHEN ${tasksTable.status} = 'completed' THEN 1 ELSE 0 END)`,
        totalEarnings: sql<number>`COALESCE(SUM(CASE WHEN ${tasksTable.status} = 'completed' THEN ${tasksTable.runnerEarning}::numeric ELSE 0 END), 0)`,
      }).from(tasksTable).where(eq(tasksTable.runnerId, runner.id)),
    ]);

    const w = weekAgg[0];
    const m = monthAgg[0];
    const t = totalAgg[0];
    res.json({
      tasksThisWeek: w?.count ?? 0,
      avgResponseTimeSeconds: w?.avgResponse != null ? Math.round(Number(w.avgResponse)) : null,
      cancellationRate: m?.total ? Math.round(((Number(m.cancelled) ?? 0) / m.total) * 100) : 0,
      totalTasks: t?.totalTasks ?? 0,
      completedTasks: Number(t?.completedTasks ?? 0),
      totalEarnings: Number(t?.totalEarnings ?? 0),
      completionRate: t?.totalTasks ? Math.round((Number(t.completedTasks ?? 0) / t.totalTasks) * 100) : 0,
    });
  } catch (err) {
    logger.error({ err, runnerId: runner.id }, "GET /runners/me/stats failed");
    res.status(500).json({ error: "Failed to load stats" });
  }
});

// PATCH /runners/me/specializations — toggle specialization badges
router.patch("/runners/me/specializations", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner;
  if (!runner) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { specializations } = req.body;
    if (!Array.isArray(specializations)) {
      res.status(400).json({ error: "specializations must be an array of strings" }); return;
    }
    const filteredSpecs = specializations.filter((s: unknown) => typeof s === "string");
    await db.update(runnersTable).set({
      specializations: filteredSpecs,
    } as Record<string, unknown>).where(eq(runnersTable.id, runner.id));
    res.json({ specializations: filteredSpecs });
  } catch (err) {
    logger.error({ err, runnerId: runner.id }, "PATCH /runners/me/specializations failed");
    res.status(500).json({ error: "Failed to update specializations" });
  }
});

// POST /runners/me/gps-background — B2: GPS background update endpoint
router.post("/runners/me/gps-background", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner;
  if (!runner) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { lat, lng } = req.body;
    if (lat != null && !isValidCoordinate(lat, "lat")) { res.status(400).json({ error: "Invalid latitude" }); return; }
    if (lng != null && !isValidCoordinate(lng, "lng")) { res.status(400).json({ error: "Invalid longitude" }); return; }
    const updates: Record<string, unknown> = { lastActiveAt: new Date(), updatedAt: new Date() };
    if (lat != null) updates.currentLat = lat.toString();
    if (lng != null) updates.currentLng = lng.toString();
    await db.update(runnersTable).set(updates).where(eq(runnersTable.id, runner.id));
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err, runnerId: runner.id }, "POST /runners/me/gps-background failed");
    res.status(500).json({ error: "Failed to update GPS" });
  }
});

// POST /runners/me/change-password — change password for authenticated runner
router.post("/runners/me/change-password", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner;
  if (!runner) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Current password and new password are required" }); return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters" }); return;
  }
  if (currentPassword === newPassword) {
    res.status(400).json({ error: "New password must be different from current password" }); return;
  }
  if (!runner.passwordHash) {
    res.status(400).json({ error: "No password set. Use OTP login instead." }); return;
  }
  if (!verifyPassword(currentPassword, runner.passwordHash)) {
    res.status(401).json({ error: "Current password is incorrect" }); return;
  }

  const passwordHash = hashPassword(newPassword);
  await db.update(runnersTable).set({ passwordHash } as Record<string, unknown>).where(eq(runnersTable.id, runner.id));

  // Invalidate all other sessions
  const token = extractToken(req);
  if (token) {
    await db.delete(runnerSessionsTable).where(
      and(eq(runnerSessionsTable.runnerId, runner.id), ne(runnerSessionsTable.token, token))
    ).catch(() => {});
  }

  res.json({ message: "Password changed successfully. Other sessions have been logged out." });
});

// POST /runners/delete-account — Runner requests account deletion (requires password confirmation)
router.post("/runners/delete-account", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner;
  if (!runner) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { password } = req.body;
    if (!password) {
      res.status(400).json({ error: "Password confirmation required to delete account" }); return;
    }
    if (!runner.passwordHash || !await verifyPassword(password, runner.passwordHash)) {
      res.status(403).json({ error: "Incorrect password" }); return;
    }
    // S2: Proper soft-delete — anonymize PII but keep record for referential integrity
    await db.update(runnersTable).set({
      name: "[Deleted Runner]",
      email: null,
      phone: null,
      avatar: null,
      city: null,
      area: null,
      fullName: null,
      aadhaarNumber: null,
      aadhaarFront: null,
      aadhaarBack: null,
      selfie: null,
      bankAccount: null,
      bankIfsc: null,
      bankAccountHolder: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      emergencyContactRelation: null,
      isOnline: false,
      dispatchAllowed: false,
      kycStatus: "none",
      passwordHash: null,
    } as Record<string, unknown>).where(eq(runnersTable.id, runner.id));
    // S2: Use static import instead of dynamic import
    await db.delete(runnerSessionsTable).where(eq(runnerSessionsTable.runnerId, runner.id));
    res.json({ message: "Account deleted" });
  } catch (err) {
    logger.error({ err, runnerId: runner.id }, "POST /runners/delete-account failed");
    res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;
