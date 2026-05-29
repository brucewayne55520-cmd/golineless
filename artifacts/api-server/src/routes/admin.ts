import { Router, type IRouter } from "express";
import { db, tasksTable, runnersTable, usersTable, subscriptionsTable, notificationsTable, runnerLocationsTable, adminSettingsTable } from "@workspace/db";
import { eq, and, gte, desc, count, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

// GET /admin/stats
router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const allTasks = await db.select().from(tasksTable);
  const todayTasks = allTasks.filter(t => t.createdAt >= today);
  const totalTasksToday = todayTasks.length;
  const activeNow = allTasks.filter(t => ["pending","assigned","on_the_way","at_location","in_progress"].includes(t.status)).length;
  const completedToday = todayTasks.filter(t => t.status === "completed").length;
  const cancelledToday = todayTasks.filter(t => t.status === "cancelled").length;
  const gmvToday = todayTasks.filter(t => t.status === "completed").reduce((s, t) => s + Number(t.price || 0), 0);
  const platformRevenue = todayTasks.filter(t => t.status === "completed").reduce((s, t) => s + Number(t.platformFee || 0), 0);
  const runnerPayouts = todayTasks.filter(t => t.status === "completed").reduce((s, t) => s + Number(t.runnerEarning || 0), 0);

  const allRunners = await db.select().from(runnersTable);
  const kycPending = allRunners.filter(r => r.kycStatus === "pending").length;
  const stuckTasks = allTasks.filter(t => {
    if (!["assigned","on_the_way","in_progress"].includes(t.status)) return false;
    const ageHours = (Date.now() - new Date(t.createdAt).getTime()) / 3600000;
    return ageHours > 3;
  }).length;
  const newReviews = 5; // Static for now
  const totalRunnersOnline = allRunners.filter(r => r.isOnline && r.kycStatus === "verified").length;
  const totalRunnersOnTask = allRunners.filter(r => r.isOnline && allTasks.some(t => t.runnerId === r.id && ["on_the_way","at_location","in_progress"].includes(t.status))).length;
  const totalRunnersOffline = allRunners.filter(r => !r.isOnline || r.kycStatus !== "verified").length;

  res.json({
    totalTasksToday, activeNow, completedToday, cancelledToday, gmvToday, platformRevenue, runnerPayouts,
    pendingPayouts: runnerPayouts, kycPending, stuckTasks, newReviews,
    totalRunnersOnline, totalRunnersOnTask, totalRunnersOffline,
  });
});

// GET /admin/activity
router.get("/admin/activity", requireAdmin, async (_req, res): Promise<void> => {
  const notifs = await db.select().from(notificationsTable).orderBy(desc(notificationsTable.createdAt)).limit(20);
  res.json(notifs.map(n => ({ id: n.id, type: n.type, message: n.message, createdAt: n.createdAt })));
});

// GET /admin/tasks
router.get("/admin/tasks", requireAdmin, async (req, res): Promise<void> => {
  const { status, category, search, limit = "20", offset = "0" } = req.query as Record<string, string>;
  const tasks = await db.select().from(tasksTable).orderBy(desc(tasksTable.createdAt)).limit(Number(limit) + 1).offset(Number(offset));
  const allTasks = await db.select().from(tasksTable);

  let filtered = tasks;
  if (status) filtered = filtered.filter(t => t.status === status);
  if (category) filtered = filtered.filter(t => t.category === category);
  if (search) filtered = filtered.filter(t => t.description?.toLowerCase().includes(search.toLowerCase()) || t.locationName?.toLowerCase().includes(search.toLowerCase()));

  const enriched = await Promise.all(filtered.slice(0, Number(limit)).map(async (task) => {
    const [user] = task.userId ? await db.select().from(usersTable).where(eq(usersTable.id, task.userId)) : [null];
    const [runner] = task.runnerId ? await db.select().from(runnersTable).where(eq(runnersTable.id, task.runnerId)) : [null];
    const safeUser = user ? (({ otp, otpExpiresAt, ...u }) => u)(user) : null;
    const safeRunner = runner ? (({ otp, otpExpiresAt, aadhaarNumber, ...r }) => r)(runner) : null;
    return { ...task, user: safeUser, runner: safeRunner };
  }));

  res.json({ tasks: enriched, total: allTasks.length });
});

// PATCH /admin/tasks/:id
router.patch("/admin/tasks/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { status, runnerId, internalNotes } = req.body;
  const updates: any = {};
  if (status) updates.status = status;
  if (runnerId) updates.runnerId = runnerId;
  if (internalNotes !== undefined) updates.internalNotes = internalNotes;
  const [task] = await db.update(tasksTable).set(updates).where(eq(tasksTable.id, id)).returning();
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  const [user] = task.userId ? await db.select().from(usersTable).where(eq(usersTable.id, task.userId)) : [null];
  const [runner] = task.runnerId ? await db.select().from(runnersTable).where(eq(runnersTable.id, task.runnerId)) : [null];
  const safeUser = user ? (({ otp, otpExpiresAt, ...u }) => u)(user) : null;
  const safeRunner = runner ? (({ otp, otpExpiresAt, aadhaarNumber, ...r }) => r)(runner) : null;
  res.json({ ...task, user: safeUser, runner: safeRunner });
});

// GET /admin/runners
router.get("/admin/runners", requireAdmin, async (req, res): Promise<void> => {
  const { kyc_status, limit = "50", offset = "0" } = req.query as Record<string, string>;
  let runners = await db.select().from(runnersTable).orderBy(desc(runnersTable.createdAt)).limit(Number(limit)).offset(Number(offset));
  if (kyc_status) runners = runners.filter(r => r.kycStatus === kyc_status);
  res.json(runners.map(({ otp, otpExpiresAt, aadhaarNumber, ...r }) => ({
    ...r,
    rating: r.rating ? Number(r.rating) : null,
    totalEarnings: r.totalEarnings ? Number(r.totalEarnings) : null,
  })));
});

// PATCH /admin/runners/:id/kyc
router.patch("/admin/runners/:id/kyc", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { action, rejectionReason } = req.body;
  const kycStatus = action === "approve" ? "verified" : "rejected";
  const [updated] = await db.update(runnersTable)
    .set({ kycStatus, kycRejectionReason: rejectionReason ?? null })
    .where(eq(runnersTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Runner not found" }); return; }
  const { otp, otpExpiresAt, aadhaarNumber, ...safe } = updated;

  // Create notification for runner
  if (action === "approve") {
    await db.insert(notificationsTable).values({ runnerId: id, type: "kyc_approved", title: "KYC Approved!", message: "Your KYC has been verified. You can now accept tasks." });
  } else {
    await db.insert(notificationsTable).values({ runnerId: id, type: "kyc_rejected", title: "KYC Rejected", message: `Reason: ${rejectionReason ?? "Please resubmit documents"}` });
  }

  res.json({ ...safe, rating: safe.rating ? Number(safe.rating) : null });
});

// GET /admin/users
router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const { limit = "50", offset = "0" } = req.query as Record<string, string>;
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(Number(limit)).offset(Number(offset));
  res.json(users.map(({ otp, otpExpiresAt, ...u }) => u));
});

// GET /admin/subscriptions
router.get("/admin/subscriptions", requireAdmin, async (_req, res): Promise<void> => {
  const subs = await db.select().from(subscriptionsTable).orderBy(desc(subscriptionsTable.createdAt));
  res.json(subs.map(s => ({ ...s, amount: Number(s.amount) })));
});

// GET /admin/analytics
router.get("/admin/analytics", requireAdmin, async (req, res): Promise<void> => {
  const { days = "30" } = req.query as Record<string, string>;
  const numDays = Number(days);
  const allTasks = await db.select().from(tasksTable);
  const allUsers = await db.select().from(usersTable);
  const allRunners = await db.select().from(runnersTable);
  const { reviewsTable } = await import("@workspace/db");
  const allReviews = await db.select().from(reviewsTable);

  // Daily stats
  const dailyStats = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayStart.getDate() + 1);
    const dayTasks = allTasks.filter(t => t.createdAt >= dayStart && t.createdAt < dayEnd);
    const gmv = dayTasks.filter(t => t.status === "completed").reduce((s, t) => s + Number(t.price || 0), 0);
    dailyStats.push({ date: dayStart.toISOString().split("T")[0], tasks: dayTasks.length, gmv });
  }

  // Category breakdown
  const catMap: Record<string, { tasks: number; revenue: number }> = {};
  for (const t of allTasks) {
    if (!catMap[t.category]) catMap[t.category] = { tasks: 0, revenue: 0 };
    catMap[t.category].tasks++;
    if (t.status === "completed") catMap[t.category].revenue += Number(t.price || 0);
  }
  const categoryBreakdown = Object.entries(catMap).map(([category, data]) => ({ category, ...data }));

  // Hourly distribution
  const hourMap: Record<number, number> = {};
  for (const t of allTasks) { const h = new Date(t.createdAt).getHours(); hourMap[h] = (hourMap[h] || 0) + 1; }
  const hourlyDistribution = Array.from({ length: 24 }, (_, h) => ({ hour: h, tasks: hourMap[h] || 0 }));

  // Runner performance
  const runnerPerformance = await Promise.all(
    allRunners.filter(r => r.kycStatus === "verified").slice(0, 10).map(async r => {
      const rTasks = allTasks.filter(t => t.runnerId === r.id && t.status === "completed");
      const rReviews = allReviews.filter(rv => rv.runnerId === r.id);
      const avg = rReviews.length ? rReviews.reduce((s, rv) => s + rv.rating, 0) / rReviews.length : null;
      return { runnerId: r.id, name: r.name ?? r.phone, tasks: rTasks.length, earnings: rTasks.reduce((s, t) => s + Number(t.runnerEarning || 0), 0), rating: avg };
    })
  );

  // User growth
  const userGrowth = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    userGrowth.push({ date: d.toISOString().split("T")[0], total: allUsers.filter(u => u.createdAt < dayEnd).length });
  }

  // MRR (static for now)
  const subs = await db.select().from(subscriptionsTable);
  const subscriptionMrr = dailyStats.map((d, i) => ({ date: d.date, mrr: subs.filter(s => s.status === "active").reduce((sum, s) => sum + Number(s.amount || 0), 0) }));

  res.json({ dailyStats, categoryBreakdown, hourlyDistribution, runnerPerformance, userGrowth, subscriptionMrr });
});

// GET /admin/runners/active-locations
router.get("/admin/runners/active-locations", requireAdmin, async (_req, res): Promise<void> => {
  const runners = await db.select().from(runnersTable).where(eq(runnersTable.kycStatus, "verified"));
  const tasks = await db.select().from(tasksTable);

  const markers = runners.map(r => {
    const activeTask = tasks.find(t => t.runnerId === r.id && ["on_the_way","at_location","in_progress","assigned"].includes(t.status));
    let status: "available" | "on_task" | "offline";
    if (!r.isOnline) status = "offline";
    else if (activeTask) status = "on_task";
    else status = "available";
    return {
      runnerId: r.id, name: r.name ?? r.phone, phone: r.phone,
      avatar: r.avatar, rating: r.rating ? Number(r.rating) : null,
      lat: r.currentLat ? Number(r.currentLat) : (23.0225 + (Math.random() - 0.5) * 0.1),
      lng: r.currentLng ? Number(r.currentLng) : (72.5714 + (Math.random() - 0.5) * 0.1),
      status, currentTaskId: activeTask?.id ?? null, currentTaskCategory: activeTask?.category ?? null,
    };
  });
  res.json(markers);
});

// GET /admin/settings
router.get("/admin/settings", requireAdmin, async (_req, res): Promise<void> => {
  const [settings] = await db.select().from(adminSettingsTable).limit(1);
  if (!settings) {
    const [created] = await db.insert(adminSettingsTable).values({}).returning();
    res.json({ ...created, runnerPayoutPercent: Number(created.runnerPayoutPercent), urgencySurcharge: Number(created.urgencySurcharge), cancellationFee: Number(created.cancellationFee) });
    return;
  }
  res.json({ ...settings, runnerPayoutPercent: Number(settings.runnerPayoutPercent), urgencySurcharge: Number(settings.urgencySurcharge), cancellationFee: Number(settings.cancellationFee) });
});

// PATCH /admin/settings
router.patch("/admin/settings", requireAdmin, async (req, res): Promise<void> => {
  const body = req.body;
  const [existing] = await db.select().from(adminSettingsTable).limit(1);
  if (existing) {
    const [updated] = await db.update(adminSettingsTable).set(body).where(eq(adminSettingsTable.id, existing.id)).returning();
    res.json({ ...updated, runnerPayoutPercent: Number(updated.runnerPayoutPercent), urgencySurcharge: Number(updated.urgencySurcharge), cancellationFee: Number(updated.cancellationFee) });
  } else {
    const [created] = await db.insert(adminSettingsTable).values(body).returning();
    res.json({ ...created, runnerPayoutPercent: Number(created.runnerPayoutPercent), urgencySurcharge: Number(created.urgencySurcharge), cancellationFee: Number(created.cancellationFee) });
  }
});

export default router;
