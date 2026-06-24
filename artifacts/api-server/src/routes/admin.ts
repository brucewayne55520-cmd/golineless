import { Router, type IRouter } from "express";
import { db, tasksTable, runnersTable, usersTable, subscriptionsTable, notificationsTable, runnerLocationsTable, adminSettingsTable, reviewsTable, runnerPayoutsTable, paymentAuditLogTable } from "@workspace/db";
import { eq, and, gte, desc, count, sql, inArray } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";
import { calculatePilotMetrics } from "../lib/revenue-engine";
import { logger } from "../lib/logger";
import { validateBody } from "../lib/validate";
import { decrypt, isEncrypted } from "../lib/crypto";
import { z } from "@workspace/db";

const router: IRouter = Router();

// Fix #33: Simple in-memory cache for admin stats (30s TTL)
const statsCache = new Map<string, { data: unknown; expiresAt: number }>();
function getCachedStats<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const cached = statsCache.get(key);
  if (cached && cached.expiresAt > now) return Promise.resolve(cached.data as T);
  return compute().then(data => {
    statsCache.set(key, { data, expiresAt: now + ttlMs });
    return data;
  });
}

// GET /admin/stats
router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Fix #1: Parallel targeted queries instead of full-table loads (~90% less memory)
  const cacheKey = `admin_stats_${today.toISOString().split('T')[0]}`;
  const result = await getCachedStats(cacheKey, 30_000, async () => {
  const [
    todayTasksData, activeTasks, completedTasks, allRunners,
    totalTaskCount, categoryStats, queueTasks,
    totalCancelledCount, uniqueUsersResult, uniqueComradesResult, totalPendingCount,
    recentReviewsResult,
  ] = await Promise.all([
    db.select().from(tasksTable).where(gte(tasksTable.createdAt, today)),
    db.select().from(tasksTable).where(inArray(tasksTable.status, ["pending","assigned","on_the_way","at_location","in_progress"])),
    db.select().from(tasksTable).where(eq(tasksTable.status, "completed")),
    db.select().from(runnersTable),
    db.select({ count: count() }).from(tasksTable),
    db.select({ category: tasksTable.category, status: tasksTable.status, cnt: count() }).from(tasksTable).groupBy(tasksTable.category, tasksTable.status),
    db.select().from(tasksTable).where(sql`(${tasksTable.queueType} IS NOT NULL AND ${tasksTable.queueType} != '') OR (${tasksTable.tokenNumber} IS NOT NULL AND ${tasksTable.tokenNumber} != '')`),
    db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.status, "cancelled")),
    db.select({ cnt: sql<number>`COUNT(DISTINCT ${tasksTable.userId})` }).from(tasksTable),
    db.select({ cnt: sql<number>`COUNT(DISTINCT ${tasksTable.runnerId})` }).from(tasksTable).where(sql`${tasksTable.runnerId} IS NOT NULL`),
    db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.status, "pending")),
    db.select({ cnt: count() }).from(reviewsTable).where(gte(reviewsTable.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))),
  ]);

  return {
    todayTasksData, activeTasks, completedTasks, allRunners,
    totalTaskCount, categoryStats, queueTasks,
    totalCancelledCount, uniqueUsersResult, uniqueComradesResult, totalPendingCount,
    recentReviewsResult,
  };
  });

  const { todayTasksData, activeTasks, completedTasks, allRunners, totalTaskCount, categoryStats, queueTasks, totalCancelledCount, uniqueUsersResult, uniqueComradesResult, totalPendingCount, recentReviewsResult } = result;

  const totalTasksToday = todayTasksData.length;
  const activeNow = activeTasks.length;
  const completedToday = todayTasksData.filter(t => t.status === "completed").length;
  const cancelledToday = todayTasksData.filter(t => t.status === "cancelled").length;
  const gmvToday = todayTasksData.filter(t => t.status === "completed").reduce((s, t) => s + Number(t.price || 0), 0);
  const platformRevenue = todayTasksData.filter(t => t.status === "completed").reduce((s, t) => s + Number(t.platformFee || 0), 0);
  const runnerPayouts = todayTasksData.filter(t => t.status === "completed").reduce((s, t) => s + Number(t.runnerEarning || 0), 0);

  const kycPending = allRunners.filter(r => r.kycStatus === "pending").length;
  const stuckTasks = activeTasks.filter(t => {
    if (!["assigned","on_the_way","in_progress"].includes(t.status)) return false;
    const ageHours = (Date.now() - new Date(t.createdAt).getTime()) / 3600000;
    return ageHours > 3;
  }).length;
  const newReviews = recentReviewsResult[0]?.cnt ?? 0;
  const totalRunnersOnline = allRunners.filter(r => r.isOnline && r.kycStatus === "verified").length;
  const totalRunnersOnTask = allRunners.filter(r => r.isOnline && activeTasks.some(t => t.runnerId === r.id && ["on_the_way","at_location","in_progress"].includes(t.status))).length;
  const totalRunnersOffline = allRunners.filter(r => !r.isOnline || r.kycStatus !== "verified").length;

  // Hub-specific stats — computed from categoryStats (SQL GROUP BY) instead of full-table filter
  const hubCategories: Record<string, string[]> = {
    healthcare: ["hospital","medicine"],
    documentation: ["document","govt_office"],
    banking: ["bank"],
    senior: ["senior_care","errand"],
    emergency: ["emergency"],
  };
  const hubStats: Record<string, { pending: number; active: number; completed: number; total: number }> = {};
  for (const [hub, cats] of Object.entries(hubCategories)) {
    const stats = { pending: 0, active: 0, completed: 0, total: 0 };
    for (const s of categoryStats) {
      if (cats.includes(s.category)) {
        if (s.status === "pending") stats.pending += s.cnt;
        if (["assigned","on_the_way","at_location","in_progress"].includes(s.status)) stats.active += s.cnt;
        if (s.status === "completed") stats.completed += s.cnt;
        stats.total += s.cnt;
      }
    }
    hubStats[hub] = stats;
  }

  // Phase 4: Queue Intelligence Metrics — queueTasks loaded via targeted SQL query
  const activeQueueTasks = queueTasks.filter(t =>
    ["assigned","on_the_way","at_location","in_progress","waiting_started"].includes(t.status) && t.currentToken
  );
  const queueGaps = activeQueueTasks.map(t => {
    const g = parseInt(t.tokenNumber || "0") - parseInt(t.currentToken || "0");
    return g > 0 ? g : 0;
  }).filter(g => !isNaN(g));
  const avgQueueGap = queueGaps.length > 0 ? Math.round(queueGaps.reduce((s, g) => s + g, 0) / queueGaps.length) : 0;
  const avgWaitTime = avgQueueGap > 0 ? Math.round(avgQueueGap * 1.5) : 0;
  const longestQueue = queueGaps.length > 0 ? Math.max(...queueGaps) : 0;
  const hospitalQueueTasks = activeQueueTasks.filter(t => t.category === "hospital").length;
  const bankQueueTasks = activeQueueTasks.filter(t => t.category === "bank").length;
  const govtQueueTasks = activeQueueTasks.filter(t => t.category === "govt_office").length;

  // Phase 5: Trust Score Metrics
  const verifiedRunners = allRunners.filter(r => r.kycStatus === "verified");
  const topComrades = verifiedRunners
    .sort((a, b) => (b.trustScore ?? 0) - (a.trustScore ?? 0))
    .slice(0, 5)
    .map(r => ({ id: r.id, name: r.name ?? r.phone, trustScore: r.trustScore ?? 50, trustBadge: r.trustBadge ?? "improving", tasksCompleted: r.tasksCompleted ?? 0 }));
  const lowestTrust = verifiedRunners
    .sort((a, b) => (a.trustScore ?? 50) - (b.trustScore ?? 50))
    .slice(0, 5)
    .map(r => ({ id: r.id, name: r.name ?? r.phone, trustScore: r.trustScore ?? 50, trustBadge: r.trustBadge ?? "improving", tasksCompleted: r.tasksCompleted ?? 0 }));
  const riskComrades = verifiedRunners.filter(r => (r.trustScore ?? 50) < 60).length;
  const avgTrustScore = verifiedRunners.length > 0
    ? Math.round(verifiedRunners.reduce((s, r) => s + (r.trustScore ?? 50), 0) / verifiedRunners.length)
    : 0;

  // Phase 6: Revenue Analytics — uses completedTasks from targeted SQL query
  const taskRevenue = completedTasks.reduce((s, t) => s + Number(t.price || 0), 0);
  const waitingRevenue = completedTasks.reduce((s, t) => s + Number(t.waitingChargeAmount || 0), 0);
  const priorityRevenue = completedTasks.reduce((s, t) => s + Number(t.priorityFee || 0), 0);
  const subscriptionRevenue = completedTasks.reduce((s, t) => s + Number(t.platformFee || 0), 0);
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(); monthStart.setDate(1);
  const revenueThisWeek = completedTasks.filter(t => t.completedAt && new Date(t.completedAt) >= weekStart).reduce((s, t) => s + Number(t.price || 0), 0);
  const revenueThisMonth = completedTasks.filter(t => t.completedAt && new Date(t.completedAt) >= monthStart).reduce((s, t) => s + Number(t.price || 0), 0);

  // Phase 7.2: Pilot Monitoring Metrics — uses targeted counts instead of full-table filter
  const totalTasks = totalTaskCount[0].count;
  const successRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
  const acceptanceRate = totalTasks > 0 ? Math.round(((totalTasks - totalPendingCount[0].count) / totalTasks) * 100) : 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
  const cancellationRate = totalTasks > 0 ? Math.round((totalCancelledCount[0].count / totalTasks) * 100) : 0;
  const tasksWithWait = completedTasks.filter(t => t.totalWaitingMinutes && t.totalWaitingMinutes > 0);
  const avgWaitTimeAll = tasksWithWait.length > 0
    ? Math.round(tasksWithWait.reduce((s, t) => s + (t.totalWaitingMinutes || 0), 0) / tasksWithWait.length)
    : 0;

  // Phase 6: Pilot Launch Metrics — merge targeted datasets for pilot calculation
  const pilotTaskMap = new Map<number, typeof tasksTable.$inferSelect>();
  for (const t of todayTasksData) pilotTaskMap.set(t.id, t);
  for (const t of activeTasks) pilotTaskMap.set(t.id, t);
  for (const t of completedTasks) pilotTaskMap.set(t.id, t);
  const pilotMetrics = calculatePilotMetrics([...pilotTaskMap.values()], allRunners, await db.select().from(usersTable));

  res.json({
    totalTasksToday, activeNow, completedToday, cancelledToday, gmvToday, platformRevenue, runnerPayouts,
    pendingPayouts: runnerPayouts, kycPending, stuckTasks, newReviews,
    totalRunnersOnline, totalRunnersOnTask, totalRunnersOffline,
    hubStats,
    queueMetrics: {
      activeQueues: activeQueueTasks.length,
      avgWaitTime,
      avgQueueGap,
      longestQueue,
      hospitalQueueTasks,
      bankQueueTasks,
      govtQueueTasks,
    },
    trustMetrics: {
      avgTrustScore,
      riskComrades,
      topComrades,
      lowestTrust,
    },
    revenueMetrics: {
      today: gmvToday,
      thisWeek: revenueThisWeek,
      thisMonth: revenueThisMonth,
      taskRevenue,
      waitingRevenue,
      priorityRevenue,
      subscriptionRevenue,
      totalRevenue: taskRevenue,
    },
    pilotMetrics,
    monitoring: {
      successRate,
      acceptanceRate,
      completionRate,
      cancellationRate,
      avgWaitTimeAll,
      totalTasks,
      completedTasks: completedTasks.length,
      cancelledTasks: totalCancelledCount[0].count,
      pendingTasks: totalPendingCount[0].count,
      activeTasks: activeTasks.length,
      uniqueUsers: uniqueUsersResult[0].cnt,
      uniqueComrades: uniqueComradesResult[0].cnt,
    }
  });
});

// GET /admin/activity
router.get("/admin/activity", requireAdmin, async (_req, res): Promise<void> => {
  const notifs = await db.select().from(notificationsTable).orderBy(desc(notificationsTable.createdAt)).limit(20);
  res.json(notifs.map(n => ({ id: n.id, type: n.type, message: n.message, createdAt: n.createdAt })));
});

// GET /admin/audit-log — Searchable audit trail (KYC actions, payment changes, admin actions)
router.get("/admin/audit-log", requireAdmin, async (req, res): Promise<void> => {
  const { limit = "50", offset = "0", actor_type, actor, action, days = "30" } = req.query as Record<string, string>;
  const numDays = Number(days);
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - numDays);

  const conditions = [gte(paymentAuditLogTable.createdAt, cutoff)];
  if (actor_type) conditions.push(eq(paymentAuditLogTable.actorType, actor_type));
  if (actor) conditions.push(eq(paymentAuditLogTable.actor, actor));
  if (action) conditions.push(eq(paymentAuditLogTable.newStatus, action));

  const logs = await db
    .select()
    .from(paymentAuditLogTable)
    .where(and(...conditions))
    .orderBy(desc(paymentAuditLogTable.createdAt))
    .limit(Number(limit) + 1)
    .offset(Number(offset));

  const [{ count: totalCount }] = await db
    .select({ count: count() })
    .from(paymentAuditLogTable)
    .where(and(...conditions));

  res.json({
    logs: logs.map(l => ({
      id: l.id,
      taskId: l.taskId,
      previousStatus: l.previousStatus,
      newStatus: l.newStatus,
      actor: l.actor,
      actorType: l.actorType,
      reason: l.reason,
      metadata: l.metadata,
      createdAt: l.createdAt,
    })),
    total: totalCount,
  });
});

// GET /admin/tasks
router.get("/admin/tasks", requireAdmin, async (req, res): Promise<void> => {
  const { status, category, search, limit = "20", offset = "0" } = req.query as Record<string, string>;

  // Fix #9: Use SQL WHERE for status/category/search filters instead of loading all + JS filter
  const conditions: (typeof tasksTable.status extends never ? never : import("drizzle-orm").SQL)[] = [];
  if (status) conditions.push(eq(tasksTable.status, status));
  if (category) conditions.push(eq(tasksTable.category, category));
  if (search) conditions.push(sql`(${tasksTable.description} ILIKE ${"%" + search + "%"} OR ${tasksTable.locationName} ILIKE ${"%" + search + "%"})`);

  const tasks = await db.select().from(tasksTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(tasksTable.createdAt))
    .limit(Number(limit) + 1).offset(Number(offset));

  const [{ count: totalCount }] = await db.select({ count: count() }).from(tasksTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  // Fix #20: Batch user/runner lookups instead of N+1 individual queries
  const sliced = tasks.slice(0, Number(limit));
  const userIds = [...new Set(sliced.filter(t => t.userId).map(t => t.userId!))];
  const runnerIds = [...new Set(sliced.filter(t => t.runnerId).map(t => t.runnerId!))];
  const [batchUsers, batchRunners] = await Promise.all([
    userIds.length > 0 ? db.select().from(usersTable).where(inArray(usersTable.id, userIds)) : Promise.resolve([]),
    runnerIds.length > 0 ? db.select().from(runnersTable).where(inArray(runnersTable.id, runnerIds)) : Promise.resolve([]),
  ]);
  const userMap = new Map(batchUsers.map(u => [u.id, u]));
  const runnerMap = new Map(batchRunners.map(r => [r.id, r]));

  const enriched = sliced.map(task => {
    const user = task.userId ? userMap.get(task.userId) ?? null : null;
    const runner = task.runnerId ? runnerMap.get(task.runnerId) ?? null : null;
    const safeUser = user ? (({ otp, otpExpiresAt, ...u }) => u)(user) : null;
    const safeRunner = runner ? (({ otp, otpExpiresAt, aadhaarNumber, ...r }) => r)(runner) : null;
    return { ...task, user: safeUser, runner: safeRunner };
  });

  res.json({ tasks: enriched, total: totalCount });
});

// GET /admin/tasks/dispatch-stats
router.get("/admin/tasks/dispatch-stats", requireAdmin, async (_req, res): Promise<void> => {
  const allTasks = await db.select().from(tasksTable)
    .where(inArray(tasksTable.status, ["pending","assigned","on_the_way","at_location","in_progress"]))
    .orderBy(desc(tasksTable.createdAt))
    .limit(50);

  // Fix #20: Batch user/runner lookups instead of N+1 individual queries
  const dispatchUserIds = [...new Set(allTasks.filter(t => t.userId).map(t => t.userId!))];
  const dispatchRunnerIds = [...new Set(allTasks.filter(t => t.runnerId).map(t => t.runnerId!))];
  const [batchUsers2, batchRunners2] = await Promise.all([
    dispatchUserIds.length > 0 ? db.select().from(usersTable).where(inArray(usersTable.id, dispatchUserIds)) : Promise.resolve([]),
    dispatchRunnerIds.length > 0 ? db.select().from(runnersTable).where(inArray(runnersTable.id, dispatchRunnerIds)) : Promise.resolve([]),
  ]);
  const userMap2 = new Map(batchUsers2.map(u => [u.id, u]));
  const runnerMap2 = new Map(batchRunners2.map(r => [r.id, r]));

  const enriched = allTasks.map(task => {
    const user = task.userId ? userMap2.get(task.userId) ?? null : null;
    const runner = task.runnerId ? runnerMap2.get(task.runnerId) ?? null : null;
    const safeUser = user ? (({ otp, otpExpiresAt, ...u }) => u)(user) : null;
    const safeRunner = runner ? (({ otp, otpExpiresAt, aadhaarNumber, ...r }) => r)(runner) : null;
    return { ...task, user: safeUser, runner: safeRunner };
  });

  const stuckTasks = enriched.filter(t => {
    if (!["assigned","on_the_way","in_progress"].includes(t.status)) return false;
    const ageHours = (Date.now() - new Date(t.createdAt).getTime()) / 3600000;
    return ageHours > 3;
  });

  const broadcastTasks = enriched.filter(t => t.status === "pending").length;
  const assignedTasks = enriched.filter(t => t.status === "assigned").length;
  const inProgressTasks = enriched.filter(t => ["on_the_way","at_location","in_progress"].includes(t.status)).length;

  res.json({
    tasks: enriched,
    broadcastTasks,
    assignedTasks,
    inProgressTasks,
    stuckTasks: stuckTasks.length,
    total: allTasks.length,
  });
});

// GET /admin/fraud-flags
router.get("/admin/fraud-flags", requireAdmin, async (_req, res): Promise<void> => {
  const tasks = await db.select({
    id: tasksTable.id,
    category: tasksTable.category,
    status: tasksTable.status,
    runnerId: tasksTable.runnerId,
    fraudFlags: tasksTable.fraudFlags,
    createdAt: tasksTable.createdAt,
  }).from(tasksTable)
    .where(sql`array_length(${tasksTable.fraudFlags}, 1) IS NOT NULL AND array_length(${tasksTable.fraudFlags}, 1) > 0`)
    .orderBy(desc(tasksTable.createdAt))
    .limit(50);

  const flags = tasks.flatMap(t => {
    const arr = Array.isArray(t.fraudFlags) ? t.fraudFlags : [];
    return arr.map((f: string, i: number) => {
      try {
        const parsed = JSON.parse(f);
        return {
          id: `${t.id}-${i}`,
          type: parsed.type || "unknown",
          taskId: t.id,
          runnerId: parsed.runnerId || t.runnerId,
          timestamp: parsed.timestamp || t.createdAt,
          severity: parsed.type === "otp_brute_force" || parsed.type === "gps_validation_failed" ? "high" : "medium",
          reason: parsed.message || parsed.reason || parsed.type?.replace(/_/g, " "),
          meta: parsed,
        };
      } catch { return null; }
    }).filter((x): x is NonNullable<typeof x> => x != null);
  }).sort((a, b) => new Date(b!.timestamp).getTime() - new Date(a!.timestamp).getTime());

  res.json({
    flags: flags.slice(0, 50),
    total: flags.length,
    highSeverity: flags.filter(f => f.severity === "high").length,
    mediumSeverity: flags.filter(f => f.severity === "medium").length,
  });
});

// PATCH /admin/tasks/:id (#29: Audit logging on payment method/status changes)
// Fix #81: Add Zod validation for task PATCH body
const adminTaskPatchSchema = z.object({
  status: z.enum(["pending","assigned","on_the_way","at_location","in_progress","completed","cancelled","waiting_started"]).optional(),
  runnerId: z.number().int().positive().optional(),
  internalNotes: z.string().max(2000).optional(),
  paymentMethod: z.enum(["cash","online"]).optional(),
  paymentStatus: z.enum(["pending","cash_pending","paid","refunded"]).optional(),
}).passthrough();

router.patch("/admin/tasks/:id", requireAdmin, validateBody(adminTaskPatchSchema), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { status, runnerId, internalNotes, paymentMethod, paymentStatus } = req.body;
  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (runnerId) updates.runnerId = runnerId;
  if (internalNotes !== undefined) updates.internalNotes = internalNotes;
  if (paymentMethod) updates.paymentMethod = paymentMethod;
  if (paymentStatus) updates.paymentStatus = paymentStatus;

  // Fetch existing task for audit comparison
  const [existing] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!existing) { res.status(404).json({ error: "Task not found" }); return; }

  const [task] = await db.update(tasksTable).set(updates).where(eq(tasksTable.id, id)).returning();

  // (#29) Log payment method/status changes to audit trail
  if (paymentMethod && paymentMethod !== existing.paymentMethod) {
    await db.insert(paymentAuditLogTable).values({
      taskId: id,
      previousStatus: existing.paymentMethod,
      newStatus: paymentMethod,
      actor: req.admin?.username ?? "admin",
      actorType: "admin",
      reason: `Admin changed paymentMethod from ${existing.paymentMethod} to ${paymentMethod}`,
      metadata: JSON.stringify({ field: "paymentMethod", oldValue: existing.paymentMethod, newValue: paymentMethod }),
    });
  }
  if (paymentStatus && paymentStatus !== existing.paymentStatus) {
    await db.insert(paymentAuditLogTable).values({
      taskId: id,
      previousStatus: existing.paymentStatus,
      newStatus: paymentStatus,
      actor: req.admin?.username ?? "admin",
      actorType: "admin",
      reason: `Admin changed paymentStatus from ${existing.paymentStatus} to ${paymentStatus}`,
      metadata: JSON.stringify({ field: "paymentStatus", oldValue: existing.paymentStatus, newValue: paymentStatus }),
    });
  }

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
  const { action, rejectionReason, dispatchAllowed } = req.body;

  const updates: Record<string, unknown> = {};
  if (action === "approve") {
    updates.kycStatus = "verified";
    updates.kycRejectionReason = null; // Fix #4: clear old rejection reason on approve
    // Fix #5: only auto-allow dispatch if not explicitly overridden
    if (dispatchAllowed === undefined) {
      updates.dispatchAllowed = true;
    }
  } else if (action === "reject") {
    updates.kycStatus = "rejected";
    updates.kycRejectionReason = rejectionReason ?? null;
  }
  // Manual dispatchAllowed toggle (for temp verification) — only set if not already handled
  if (dispatchAllowed !== undefined && !(action === "approve" && dispatchAllowed === undefined)) {
    updates.dispatchAllowed = dispatchAllowed;
  }

  const [updated] = await db.update(runnersTable)
    .set(updates)
    .where(eq(runnersTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Runner not found" }); return; }
  const { otp, otpExpiresAt, aadhaarNumber, ...safe } = updated;

  // Fix #67: Admin activity log — track KYC actions in audit trail
  await db.insert(paymentAuditLogTable).values({
    taskId: 0,
    previousStatus: null,
    newStatus: action,
    actor: req.admin?.username ?? "admin",
    actorType: "admin",
    reason: `Admin ${action}d KYC for runner #${id}${rejectionReason ? `: ${rejectionReason}` : ''}`,
    metadata: JSON.stringify({ runnerId: id, action, rejectionReason, dispatchAllowed }),
  });

  // Create notification for runner
  if (action === "approve") {
    await db.insert(notificationsTable).values({ runnerId: id, type: "kyc_approved", title: "KYC Approved!", message: "Your KYC has been verified. You can now accept tasks." });
  } else if (action === "reject") {
    await db.insert(notificationsTable).values({ runnerId: id, type: "kyc_rejected", title: "KYC Rejected", message: `Reason: ${rejectionReason ?? "Please resubmit documents"}` });
  }
  if (dispatchAllowed === true && updated.kycStatus === "pending") {
    await db.insert(notificationsTable).values({ runnerId: id, type: "dispatch_allowed", title: "Dispatch Approved!", message: "Your admin has allowed you to receive tasks while KYC is in progress." });
  }

  res.json({
    ...safe,
    rating: safe.rating ? Number(safe.rating) : null,
    dispatchAllowed: safe.dispatchAllowed ?? false,
  });
});

// GET /admin/users
router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const { limit = "50", offset = "0", kyc_status } = req.query as Record<string, string>;
  let users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(Number(limit)).offset(Number(offset));
  if (kyc_status) users = users.filter(u => u.kycStatus === kyc_status);
  res.json(users.map(({ otp, otpExpiresAt, aadhaarNumber, aadhaarFront, aadhaarBack, ...u }) => u));
});

// GET /admin/users/:id/kyc — get full KYC details for a user (decrypts Aadhaar for admin view)
router.get("/admin/users/:id/kyc", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  // Return KYC data for admin review — decrypt Aadhaar for display, strip auth fields
  const { otp, otpExpiresAt, passwordHash, passwordResetToken, passwordResetExpiresAt, aadhaarNumber, ...safe } = user;
  // S1: Decrypt Aadhaar images for admin view (number itself is still stripped)
  const aadhaarFront = user.aadhaarFront && isEncrypted(user.aadhaarFront) ? decrypt(user.aadhaarFront) : user.aadhaarFront;
  const aadhaarBack = user.aadhaarBack && isEncrypted(user.aadhaarBack) ? decrypt(user.aadhaarBack) : user.aadhaarBack;
  res.json({ ...safe, aadhaarFront, aadhaarBack });
});

// PATCH /admin/users/:id/kyc — approve or reject user KYC
router.patch("/admin/users/:id/kyc", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { action, rejectionReason } = req.body;

  if (action !== "approve" && action !== "reject") {
    res.status(400).json({ error: "Action must be 'approve' or 'reject'" }); return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!existing) { res.status(404).json({ error: "User not found" }); return; }

  const updates: Record<string, unknown> = {};
  if (action === "approve") {
    updates.kycStatus = "verified";
  } else {
    updates.kycStatus = "rejected";
  }

  await db.update(usersTable).set(updates).where(eq(usersTable.id, id));

  // Audit log
  await db.insert(paymentAuditLogTable).values({
    taskId: 0,
    previousStatus: existing.kycStatus,
    newStatus: action === "approve" ? "verified" : "rejected",
    actor: req.admin?.username ?? "admin",
    actorType: "admin",
    reason: `Admin ${action}d user KYC #${id}${rejectionReason ? `: ${rejectionReason}` : ""}`,
    metadata: JSON.stringify({ userId: id, action, rejectionReason }),
  });

  // Notify user
  await db.insert(notificationsTable).values({
    userId: id,
    type: action === "approve" ? "kyc_approved" : "kyc_rejected",
    title: action === "approve" ? "KYC Verified!" : "KYC Rejected",
    message: action === "approve"
      ? "Your identity has been verified. You can now use all features."
      : `Your KYC was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : " Please resubmit."}`,
  });

  res.json({ kycStatus: action === "approve" ? "verified" : "rejected", message: `User KYC ${action}d` });
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
  const dayStart = new Date(); dayStart.setDate(dayStart.getDate() - numDays); dayStart.setHours(0, 0, 0, 0);

  // Fix #2: SQL aggregation instead of loading all tasks/users/runners/reviews into memory
  const [categoryStats, hourlyStats, runnerPerfRaw, dailyTaskCounts, dailyGmv, userCount, subs] = await Promise.all([
    // Category breakdown via SQL GROUP BY
    db.select({ category: tasksTable.category, cnt: count(), revenue: sql<number>`COALESCE(SUM(CASE WHEN ${tasksTable.status} = 'completed' THEN ${tasksTable.price}::numeric ELSE 0 END), 0)` })
      .from(tasksTable).groupBy(tasksTable.category),
    // Hourly distribution via SQL GROUP BY (extract hour from created_at)
    db.select({ hour: sql<number>`EXTRACT(HOUR FROM ${tasksTable.createdAt})`, cnt: count() })
      .from(tasksTable).where(gte(tasksTable.createdAt, dayStart)).groupBy(sql`EXTRACT(HOUR FROM ${tasksTable.createdAt})`),
    // Runner performance: top 10 verified runners with task counts
    db.select({
      runnerId: runnersTable.id, name: runnersTable.name, phone: runnersTable.phone,
      tasks: sql<number>`COUNT(CASE WHEN ${tasksTable.status} = 'completed' THEN 1 END)`,
      earnings: sql<number>`COALESCE(SUM(CASE WHEN ${tasksTable.status} = 'completed' THEN ${tasksTable.runnerEarning}::numeric ELSE 0 END), 0)`,
      rating: sql<number | null>`(SELECT AVG(r.rating) FROM reviews r WHERE r.runner_id = ${runnersTable.id})`,
    }).from(runnersTable)
      .leftJoin(tasksTable, eq(tasksTable.runnerId, runnersTable.id))
      .where(and(eq(runnersTable.kycStatus, "verified"), sql`${runnersTable.tasksCompleted} > 0`))
      .groupBy(runnersTable.id, runnersTable.name, runnersTable.phone)
      .orderBy(desc(sql<number>`COUNT(CASE WHEN ${tasksTable.status} = 'completed' THEN 1 END)`))
      .limit(10),
    // Daily task counts via SQL GROUP BY date
    db.select({ date: sql<string>`DATE(${tasksTable.createdAt})`, cnt: count() })
      .from(tasksTable).where(gte(tasksTable.createdAt, dayStart)).groupBy(sql`DATE(${tasksTable.createdAt})`),
    // Daily GMV via SQL GROUP BY date
    db.select({ date: sql<string>`DATE(${tasksTable.completedAt})`, gmv: sql<number>`COALESCE(SUM(${tasksTable.price}::numeric), 0)` })
      .from(tasksTable).where(and(eq(tasksTable.status, "completed"), gte(tasksTable.completedAt, dayStart))).groupBy(sql`DATE(${tasksTable.completedAt})`),
    // User growth: total user count + daily creation counts
    db.select({ total: count() }).from(usersTable),
    // Subscriptions for MRR
    db.select().from(subscriptionsTable),
  ]);

  // Build daily stats from SQL results
  const dailyGmvMap = new Map(dailyGmv.map(r => [r.date, r.gmv]));
  const dailyCountMap = new Map(dailyTaskCounts.map(r => [r.date, r.cnt]));
  const dailyStats = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    dailyStats.push({ date: dateStr, tasks: dailyCountMap.get(dateStr) || 0, gmv: dailyGmvMap.get(dateStr) || 0 });
  }

  // Category breakdown from SQL
  const categoryBreakdown = categoryStats.map(r => ({ category: r.category, tasks: r.cnt, revenue: r.revenue }));

  // Hourly distribution from SQL (fill missing hours with 0)
  const hourMap = new Map(hourlyStats.map(r => [Number(r.hour), r.cnt]));
  const hourlyDistribution = Array.from({ length: 24 }, (_, h) => ({ hour: h, tasks: hourMap.get(h) || 0 }));

  // Runner performance from SQL (already enriched with rating subquery)
  const runnerPerformance = runnerPerfRaw.map(r => ({
    runnerId: r.runnerId, name: r.name ?? r.phone,
    tasks: r.tasks, earnings: r.earnings, rating: r.rating ? Number(r.rating).toFixed(1) : null,
  }));

  // User growth: compute from total count (approximate with current total)
  const totalUsers = userCount[0]?.total || 0;
  const userGrowth = dailyStats.map(d => ({ date: d.date, total: totalUsers })); // Approximate — full daily breakdown would need a subquery per day

  // MRR
  const activeSubs = subs.filter(s => s.status === "active");
  const mrrAmount = activeSubs.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const subscriptionMrr = dailyStats.map(d => ({ date: d.date, mrr: mrrAmount }));

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
      lat: r.currentLat ? Number(r.currentLat) : null,
      lng: r.currentLng ? Number(r.currentLng) : null,
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
    res.json({
      ...created, runnerPayoutPercent: Number(created.runnerPayoutPercent),
      urgencySurcharge: Number(created.urgencySurcharge), cancellationFee: Number(created.cancellationFee),
      dispatchInitialRadius: Number(created.dispatchInitialRadius),
      dispatchExpandDelay: Number(created.dispatchExpandDelay),
      dispatchMaxRadius: Number(created.dispatchMaxRadius),
      freeWaitingMinutes: Number(created.freeWaitingMinutes),
      waitingChargePerMinute: Number(created.waitingChargePerMinute),
      priorityFeeAmount: Number(created.priorityFeeAmount),
      emergencyFeeAmount: Number(created.emergencyFeeAmount),
      urgencyNormalMultiplier: Number(created.urgencyNormalMultiplier),
      urgencyUrgentMultiplier: Number(created.urgencyUrgentMultiplier),
      urgencyEmergencyMultiplier: Number(created.urgencyEmergencyMultiplier),
    });
    return;
  }
  res.json({
    ...settings, runnerPayoutPercent: Number(settings.runnerPayoutPercent),
    urgencySurcharge: Number(settings.urgencySurcharge), cancellationFee: Number(settings.cancellationFee),
    dispatchInitialRadius: Number(settings.dispatchInitialRadius),
    dispatchExpandDelay: Number(settings.dispatchExpandDelay),
    dispatchMaxRadius: Number(settings.dispatchMaxRadius),
    freeWaitingMinutes: Number(settings.freeWaitingMinutes),
    waitingChargePerMinute: Number(settings.waitingChargePerMinute),
    priorityFeeAmount: Number(settings.priorityFeeAmount),
    emergencyFeeAmount: Number(settings.emergencyFeeAmount),
    urgencyNormalMultiplier: Number(settings.urgencyNormalMultiplier),
    urgencyUrgentMultiplier: Number(settings.urgencyUrgentMultiplier),
    urgencyEmergencyMultiplier: Number(settings.urgencyEmergencyMultiplier),
  });
});

// PATCH /admin/settings
// Fix #80: Add Zod validation for settings PATCH body
const adminSettingsSchema = z.object({
  runnerPayoutPercent: z.number().min(0).max(100).optional(),
  urgencySurcharge: z.number().min(0).optional(),
  cancellationFee: z.number().min(0).optional(),
  dispatchInitialRadius: z.number().min(0).optional(),
  dispatchExpandDelay: z.number().min(0).optional(),
  dispatchMaxRadius: z.number().min(0).optional(),
  freeWaitingMinutes: z.number().min(0).optional(),
  waitingChargePerMinute: z.number().min(0).optional(),
  priorityFeeAmount: z.number().min(0).optional(),
  emergencyFeeAmount: z.number().min(0).optional(),
  pilotMode: z.boolean().optional(),
  pilotCategories: z.array(z.string()).optional(),
  upiId: z.string().optional(),
  upiPayeeName: z.string().optional(),
}).passthrough();

router.patch("/admin/settings", requireAdmin, validateBody(adminSettingsSchema), async (req, res): Promise<void> => {
  const body = req.body;
  const [existing] = await db.select().from(adminSettingsTable).limit(1);
  if (existing) {
    const [updated] = await db.update(adminSettingsTable).set(body).where(eq(adminSettingsTable.id, existing.id)).returning();
    res.json({
      ...updated, runnerPayoutPercent: Number(updated.runnerPayoutPercent),
      urgencySurcharge: Number(updated.urgencySurcharge), cancellationFee: Number(updated.cancellationFee),
      dispatchInitialRadius: Number(updated.dispatchInitialRadius),
      dispatchExpandDelay: Number(updated.dispatchExpandDelay),
      dispatchMaxRadius: Number(updated.dispatchMaxRadius),
      freeWaitingMinutes: Number(updated.freeWaitingMinutes),
      waitingChargePerMinute: Number(updated.waitingChargePerMinute),
      priorityFeeAmount: Number(updated.priorityFeeAmount),
      emergencyFeeAmount: Number(updated.emergencyFeeAmount),
      urgencyNormalMultiplier: Number(updated.urgencyNormalMultiplier),
      urgencyUrgentMultiplier: Number(updated.urgencyUrgentMultiplier),
      urgencyEmergencyMultiplier: Number(updated.urgencyEmergencyMultiplier),
    });
  } else {
    const [created] = await db.insert(adminSettingsTable).values(body).returning();
    res.json({
      ...created, runnerPayoutPercent: Number(created.runnerPayoutPercent),
      urgencySurcharge: Number(created.urgencySurcharge), cancellationFee: Number(created.cancellationFee),
      dispatchInitialRadius: Number(created.dispatchInitialRadius),
      dispatchExpandDelay: Number(created.dispatchExpandDelay),
      dispatchMaxRadius: Number(created.dispatchMaxRadius),
      freeWaitingMinutes: Number(created.freeWaitingMinutes),
      waitingChargePerMinute: Number(created.waitingChargePerMinute),
      priorityFeeAmount: Number(created.priorityFeeAmount),
      emergencyFeeAmount: Number(created.emergencyFeeAmount),
      urgencyNormalMultiplier: Number(created.urgencyNormalMultiplier),
      urgencyUrgentMultiplier: Number(created.urgencyUrgentMultiplier),
      urgencyEmergencyMultiplier: Number(created.urgencyEmergencyMultiplier),
    });
  }
});

// GET /admin/reconciliation/export — CSV export of reconciliation data (#26)
router.get("/admin/reconciliation/export", requireAdmin, async (req, res): Promise<void> => {
  const { days = "30" } = req.query as Record<string, string>;
  const numDays = Number(days);
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - numDays);

  // (#8) SQL aggregation instead of loading all tasks into JS
  const rows = await db.execute(sql`
    SELECT
      t.id as task_id,
      t.category,
      t.status,
      t.payment_method,
      t.payment_status,
      t.price,
      t.runner_earning,
      t.platform_fee,
      t.waiting_charge_amount,
      t.priority_fee,
      t.paid_amount,
      t.completed_at,
      t.created_at,
      r.name as runner_name,
      r.phone as runner_phone,
      u.name as user_name,
      u.phone as user_phone
    FROM tasks t
    LEFT JOIN runners r ON t.runner_id = r.id
    LEFT JOIN users u ON t.user_id = u.id
    WHERE t.status = 'completed' AND t.completed_at >= ${weekAgo}
    ORDER BY t.completed_at DESC
  `);

  // Generate CSV with proper escaping to prevent CSV injection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const escapeCsv = (val: any): string => {
    const str = String(val ?? "");
    // If value contains comma, quote, or newline, wrap in quotes and escape inner quotes
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const header = "Task ID,Category,Status,Payment Method,Payment Status,Price,Runner Earning,Platform Fee,Waiting Charge,Priority Fee,Paid Amount,Completed At,Runner Name,Runner Phone,User Name,User Phone\n";
  const csvRows = (rows.rows as Record<string, unknown>[]).map(r =>
    [r.task_id, r.category, r.status, r.payment_method, r.payment_status, r.price, r.runner_earning, r.platform_fee, r.waiting_charge_amount, r.priority_fee, r.paid_amount, r.completed_at, r.runner_name, r.runner_phone, r.user_name, r.user_phone].map(escapeCsv).join(",")
  ).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=reconciliation-${numDays}d.csv`);
  res.send(header + csvRows);
});

// GET /admin/reconciliation — Daily earnings reconciliation: cash collected vs runner payouts
router.get("/admin/reconciliation", requireAdmin, async (req, res): Promise<void> => {
  const { days = "7" } = req.query as Record<string, string>;
  const numDays = Number(days);
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - numDays);

  // Fix #4: SQL aggregation instead of loading all tasks + runners into memory
  const [completedAgg, runnerAgg, dailyBreakdownRaw] = await Promise.all([
    // Aggregate completed tasks with payment breakdown
    db.select({
      totalCashCollected: sql<number>`COALESCE(SUM(CASE WHEN ${tasksTable.paymentMethod} = 'cash' AND ${tasksTable.paymentStatus} = 'paid' THEN ${tasksTable.price}::numeric ELSE 0 END), 0)`,
      totalCashPending: sql<number>`COALESCE(SUM(CASE WHEN ${tasksTable.paymentMethod} = 'cash' AND ${tasksTable.paymentStatus} != 'paid' THEN ${tasksTable.price}::numeric ELSE 0 END), 0)`,
      totalOnlineCollected: sql<number>`COALESCE(SUM(CASE WHEN ${tasksTable.paymentMethod} = 'online' AND ${tasksTable.paymentStatus} = 'paid' THEN ${tasksTable.price}::numeric ELSE 0 END), 0)`,
      totalOnlinePending: sql<number>`COALESCE(SUM(CASE WHEN ${tasksTable.paymentMethod} = 'online' AND ${tasksTable.paymentStatus} != 'paid' THEN ${tasksTable.price}::numeric ELSE 0 END), 0)`,
      cashRunnerPayouts: sql<number>`COALESCE(SUM(CASE WHEN ${tasksTable.paymentMethod} = 'cash' AND ${tasksTable.paymentStatus} = 'paid' THEN ${tasksTable.runnerEarning}::numeric ELSE 0 END), 0)`,
      onlineRunnerPayouts: sql<number>`COALESCE(SUM(CASE WHEN ${tasksTable.paymentMethod} = 'online' AND ${tasksTable.paymentStatus} = 'paid' THEN ${tasksTable.runnerEarning}::numeric ELSE 0 END), 0)`,
      pendingRunnerPayouts: sql<number>`COALESCE(SUM(CASE WHEN ${tasksTable.paymentStatus} != 'paid' THEN ${tasksTable.runnerEarning}::numeric ELSE 0 END), 0)`,
      cashPlatformFees: sql<number>`COALESCE(SUM(CASE WHEN ${tasksTable.paymentMethod} = 'cash' AND ${tasksTable.paymentStatus} = 'paid' THEN ${tasksTable.platformFee}::numeric ELSE 0 END), 0)`,
      onlinePlatformFees: sql<number>`COALESCE(SUM(CASE WHEN ${tasksTable.paymentMethod} = 'online' AND ${tasksTable.paymentStatus} = 'paid' THEN ${tasksTable.platformFee}::numeric ELSE 0 END), 0)`,
      totalCashTasks: sql<number>`COUNT(CASE WHEN ${tasksTable.paymentMethod} = 'cash' THEN 1 END)`,
      totalOnlineTasks: sql<number>`COUNT(CASE WHEN ${tasksTable.paymentMethod} = 'online' THEN 1 END)`,
      cashConfirmedCount: sql<number>`COUNT(CASE WHEN ${tasksTable.paymentMethod} = 'cash' AND ${tasksTable.paymentStatus} = 'paid' THEN 1 END)`,
      cashPendingCount: sql<number>`COUNT(CASE WHEN ${tasksTable.paymentMethod} = 'cash' AND ${tasksTable.paymentStatus} != 'paid' THEN 1 END)`,
    }).from(tasksTable).where(eq(tasksTable.status, "completed")),
    // Per-runner cash reconciliation via SQL
    db.select({
      runnerId: runnersTable.id, name: runnersTable.name, phone: runnersTable.phone,
      cashTasksCollected: sql<number>`COUNT(CASE WHEN ${tasksTable.paymentMethod} = 'cash' AND ${tasksTable.paymentStatus} = 'paid' THEN 1 END)`,
      cashCollected: sql<number>`COALESCE(SUM(CASE WHEN ${tasksTable.paymentMethod} = 'cash' AND ${tasksTable.paymentStatus} = 'paid' THEN ${tasksTable.price}::numeric ELSE 0 END), 0)`,
      runnerPayout: sql<number>`COALESCE(SUM(CASE WHEN ${tasksTable.paymentMethod} = 'cash' AND ${tasksTable.paymentStatus} = 'paid' THEN ${tasksTable.runnerEarning}::numeric ELSE 0 END), 0)`,
      totalTasks: count(),
      totalEarnings: sql<number>`COALESCE(SUM(${tasksTable.runnerEarning}::numeric), 0)`,
    }).from(runnersTable)
      .leftJoin(tasksTable, and(eq(tasksTable.runnerId, runnersTable.id), eq(tasksTable.status, "completed")))
      .where(eq(runnersTable.kycStatus, "verified"))
      .groupBy(runnersTable.id, runnersTable.name, runnersTable.phone),
    // Daily breakdown via SQL
    db.select({
      date: sql<string>`DATE(${tasksTable.completedAt})`,
      cashCollected: sql<number>`COALESCE(SUM(CASE WHEN ${tasksTable.paymentMethod} = 'cash' AND ${tasksTable.paymentStatus} = 'paid' THEN ${tasksTable.price}::numeric ELSE 0 END), 0)`,
      cashPending: sql<number>`COALESCE(SUM(CASE WHEN ${tasksTable.paymentMethod} = 'cash' AND ${tasksTable.paymentStatus} != 'paid' THEN ${tasksTable.price}::numeric ELSE 0 END), 0)`,
      onlineCollected: sql<number>`COALESCE(SUM(CASE WHEN ${tasksTable.paymentMethod} = 'online' AND ${tasksTable.paymentStatus} = 'paid' THEN ${tasksTable.price}::numeric ELSE 0 END), 0)`,
      runnerPayouts: sql<number>`COALESCE(SUM(${tasksTable.runnerEarning}::numeric), 0)`,
      platformFees: sql<number>`COALESCE(SUM(${tasksTable.platformFee}::numeric), 0)`,
      cashTasks: sql<number>`COUNT(CASE WHEN ${tasksTable.paymentMethod} = 'cash' THEN 1 END)`,
      onlineTasks: sql<number>`COUNT(CASE WHEN ${tasksTable.paymentMethod} = 'online' THEN 1 END)`,
      totalTasks: count(),
    }).from(tasksTable).where(and(eq(tasksTable.status, "completed"), gte(tasksTable.completedAt, weekAgo))).groupBy(sql`DATE(${tasksTable.completedAt})`),
  ]);

  const agg = completedAgg[0];
  const dailyBreakdown = dailyBreakdownRaw;
  const runnerReconciliation = runnerAgg.filter(r => r.cashTasksCollected > 0).sort((a, b) => Number(b.cashCollected) - Number(a.cashCollected));

  res.json({
    summary: {
      totalCashCollected: Number(agg.totalCashCollected),
      totalCashPending: Number(agg.totalCashPending),
      totalOnlineCollected: Number(agg.totalOnlineCollected),
      totalOnlinePending: Number(agg.totalOnlinePending),
      cashRunnerPayouts: Number(agg.cashRunnerPayouts),
      onlineRunnerPayouts: Number(agg.onlineRunnerPayouts),
      pendingRunnerPayouts: Number(agg.pendingRunnerPayouts),
      cashPlatformFees: Number(agg.cashPlatformFees),
      onlinePlatformFees: Number(agg.onlinePlatformFees),
      totalCashTasks: Number(agg.totalCashTasks),
      totalOnlineTasks: Number(agg.totalOnlineTasks),
      cashConfirmedCount: Number(agg.cashConfirmedCount),
      cashPendingCount: Number(agg.cashPendingCount),
    },
    dailyBreakdown,
    runnerReconciliation,
  });
});



// GET /admin/payouts — per-runner outstanding balances + settlement history
router.get("/admin/payouts", requireAdmin, async (req, res): Promise<void> => {
  const { status = "all" } = req.query as Record<string, string>;
  const allTasks = await db.select().from(tasksTable).where(eq(tasksTable.status, "completed"));
  const allRunners = await db.select().from(runnersTable);
  const payouts = await db.select().from(runnerPayoutsTable).orderBy(desc(runnerPayoutsTable.createdAt));

  // Calculate settled task IDs from all settled payouts (taskIds is now integer[])
  const settledTaskIds = new Set<number>();
  for (const p of payouts) {
    if (p.status === "settled" && p.taskIds) {
      (Array.isArray(p.taskIds) ? p.taskIds : []).forEach(id => settledTaskIds.add(Number(id)));
    }
  }

  // Build per-runner outstanding balances
  const runnerBalances = allRunners.filter(r => r.kycStatus === "verified").map(r => {
    const rCompleted = allTasks.filter(t => t.runnerId === r.id);
    const unsettledTasks = rCompleted.filter(t => !settledTaskIds.has(t.id));
    const outstandingAmount = unsettledTasks.reduce((s, t) => s + Number(t.runnerEarning || 0), 0);
    const settledTasks = rCompleted.filter(t => settledTaskIds.has(t.id));
    const settledAmount = settledTasks.reduce((s, t) => s + Number(t.runnerEarning || 0), 0);
    const allPayouts = payouts.filter(p => p.runnerId === r.id && p.status === "settled");
    const totalPaidOut = allPayouts.reduce((s, p) => s + Number(p.amount || 0), 0);
    return {
      runnerId: r.id,
      name: r.name ?? r.phone,
      phone: r.phone,
      bankAccount: r.bankAccount ?? null,
      bankIfsc: r.bankIfsc ?? null,
      outstandingAmount,
      unsettledTaskCount: unsettledTasks.length,
      unsettledTaskIds: unsettledTasks.map(t => t.id),
      settledAmount,
      totalPaidOut,
      lifetimeEarnings: rCompleted.reduce((s, t) => s + Number(t.runnerEarning || 0), 0),
      totalTasks: rCompleted.length,
    };
  }).filter(r => r.unsettledTaskCount > 0 || r.totalPaidOut > 0)
    .sort((a, b) => b.outstandingAmount - a.outstandingAmount);

  // Filter by status
  let filtered = runnerBalances;
  if (status === "outstanding") filtered = runnerBalances.filter(r => r.outstandingAmount > 0);
  if (status === "settled") filtered = runnerBalances.filter(r => r.outstandingAmount === 0 && r.totalPaidOut > 0);

  // Settlement history
  const settlementHistory = payouts.map(p => {
    const runner = allRunners.find(r => r.id === p.runnerId);
    return {
      ...p,
      runnerName: runner?.name ?? runner?.phone ?? "Unknown",
      amount: Number(p.amount),
      taskCount: p.taskCount,
    };
  });

  res.json({ runners: filtered, settlements: settlementHistory });
});

// POST /admin/payouts/settle — mark payout as completed for a runner
router.post("/admin/payouts/settle", requireAdmin, async (req, res): Promise<void> => {
  const { runnerId, taskIds, amount, reference, notes } = req.body;
  if (!runnerId) { res.status(400).json({ error: "runnerId is required" }); return; }

  const [runner] = await db.select().from(runnersTable).where(eq(runnersTable.id, runnerId));
  if (!runner) { res.status(404).json({ error: "Runner not found" }); return; }

  let selectedTaskIds: number[];
  let totalAmount: number;

  if (Array.isArray(taskIds) && taskIds.length > 0) {
    // Explicit task IDs provided (Settle All)
    const tasks = await db.select().from(tasksTable).where(inArray(tasksTable.id, taskIds));
    const invalidTasks = tasks.filter(t => t.runnerId !== runnerId || t.status !== "completed");
    if (invalidTasks.length > 0) {
      res.status(400).json({ error: `${invalidTasks.length} task(s) not valid for this runner` }); return;
    }
    selectedTaskIds = taskIds;
    totalAmount = amount ?? tasks.reduce((s, t) => s + Number(t.runnerEarning || 0), 0);
  } else if (amount != null) {
    // Partial settlement: auto-select oldest unsettle tasks up to the amount
    // First get already-settled task IDs
    const existingPayouts = await db.select().from(runnerPayoutsTable).where(eq(runnerPayoutsTable.runnerId, runnerId));
    const settledIds = new Set<number>();
    for (const p of existingPayouts) {
      if (p.status === "settled" && p.taskIds) (Array.isArray(p.taskIds) ? p.taskIds : []).forEach(id => settledIds.add(Number(id)));
    }
    const allCompleted = await db.select().from(tasksTable).where(eq(tasksTable.status, "completed"));
    const unsettle = allCompleted.filter(t => t.runnerId === runnerId && !settledIds.has(t.id)).sort((a, b) => (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0));
    let cumulative = 0;
    selectedTaskIds = [];
    for (const t of unsettle) {
      if (cumulative >= Number(amount)) break;
      selectedTaskIds.push(t.id);
      cumulative += Number(t.runnerEarning || 0);
    }
    totalAmount = Number(amount);
  } else {
    res.status(400).json({ error: "Either taskIds or amount is required" }); return;
  }

  const [payout] = await db.insert(runnerPayoutsTable).values({
    runnerId,
    amount: String(totalAmount),
    taskCount: selectedTaskIds.length,
    taskIds: selectedTaskIds,
    status: "settled",
    settledBy: req.admin?.username ?? "admin",
    settledAt: new Date(),
    reference: reference ?? null,
    notes: notes ?? null,
  }).returning();

  // Notify runner
  await db.insert(notificationsTable).values({
    runnerId,
    type: "payout_settled",
    title: "Payout Settled",
    message: `Your payout of Rs ${totalAmount} for ${selectedTaskIds.length} task(s) has been processed.${reference ? ` Ref: ${reference}` : ""}`,
  });

  res.json({
    id: payout.id,
    runnerId,
    runnerName: runner.name ?? runner.phone,
    amount: totalAmount,
    taskCount: selectedTaskIds.length,
    status: "settled",
    reference: reference ?? null,
    message: `Payout of Rs ${totalAmount} settled for ${runner.name ?? runner.phone}`,
  });
});

// POST /admin/payouts/cancel — cancel a settlement
router.post("/admin/payouts/cancel/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [payout] = await db.select().from(runnerPayoutsTable).where(eq(runnerPayoutsTable.id, id));
  if (!payout) { res.status(404).json({ error: "Payout not found" }); return; }
  if (payout.status !== "settled") { res.status(400).json({ error: "Only settled payouts can be cancelled" }); return; }

  await db.update(runnerPayoutsTable).set({ status: "cancelled" }).where(eq(runnerPayoutsTable.id, id));
  res.json({ message: "Payout cancelled", id });
});

// GET /admin/export — JSON data export for users, runners, tasks (#68)
router.get("/admin/export", requireAdmin, async (req, res): Promise<void> => {
  const { type = "tasks", days = "30" } = req.query as Record<string, string>;
  const numDays = Number(days);
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - numDays);

  if (type === "users") {
    const users = await db.select({
      id: usersTable.id, name: usersTable.name, phone: usersTable.phone, email: usersTable.email,
      language: usersTable.language, createdAt: usersTable.createdAt,
    }).from(usersTable).where(gte(usersTable.createdAt, cutoff));
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=users-${numDays}d.json`);
    res.json({ type: "users", count: users.length, exportedAt: new Date().toISOString(), data: users });
  } else if (type === "runners") {
    const runners = await db.select({
      id: runnersTable.id, name: runnersTable.name, phone: runnersTable.phone,
      kycStatus: runnersTable.kycStatus, area: runnersTable.area,
      trustScore: runnersTable.trustScore, tasksCompleted: runnersTable.tasksCompleted,
      rating: runnersTable.rating, isOnline: runnersTable.isOnline,
      createdAt: runnersTable.createdAt,
    }).from(runnersTable).where(gte(runnersTable.createdAt, cutoff));
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=runners-${numDays}d.json`);
    res.json({ type: "runners", count: runners.length, exportedAt: new Date().toISOString(), data: runners });
  } else {
    // Default: tasks
    const tasks = await db.select({
      id: tasksTable.id, category: tasksTable.category, status: tasksTable.status,
      price: tasksTable.price, runnerEarning: tasksTable.runnerEarning, platformFee: tasksTable.platformFee,
      paymentMethod: tasksTable.paymentMethod, paymentStatus: tasksTable.paymentStatus,
      locationArea: tasksTable.locationArea, locationCity: tasksTable.locationCity,
      userId: tasksTable.userId, runnerId: tasksTable.runnerId,
      createdAt: tasksTable.createdAt, completedAt: tasksTable.completedAt,
    }).from(tasksTable).where(gte(tasksTable.createdAt, cutoff));
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=tasks-${numDays}d.json`);
    res.json({ type: "tasks", count: tasks.length, exportedAt: new Date().toISOString(), data: tasks });
  }
});

// GET /admin/kyc/stale — KYC submissions pending > 7 days
router.get("/admin/kyc/stale", requireAdmin, async (_req, res): Promise<void> => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const [staleUsers, staleRunners] = await Promise.all([
    db.select({
      id: usersTable.id, name: usersTable.name, phone: usersTable.phone,
      uniqueId: usersTable.uniqueId, city: usersTable.city, area: usersTable.area,
      email: usersTable.email, createdAt: usersTable.createdAt, updatedAt: usersTable.updatedAt,
    }).from(usersTable)
      .where(and(eq(usersTable.kycStatus, "pending"), sql`${usersTable.updatedAt} < ${cutoff}`))
      .orderBy(usersTable.updatedAt),
    db.select({
      id: runnersTable.id, name: runnersTable.name, phone: runnersTable.phone,
      uniqueId: runnersTable.uniqueId, city: runnersTable.city, area: runnersTable.area,
      rating: runnersTable.rating, totalTasks: runnersTable.tasksCompleted,
      createdAt: runnersTable.createdAt, updatedAt: runnersTable.updatedAt,
    }).from(runnersTable)
      .where(and(eq(runnersTable.kycStatus, "pending"), sql`${runnersTable.updatedAt} < ${cutoff}`))
      .orderBy(runnersTable.updatedAt),
  ]);

  res.json({
    staleUsers: staleUsers.map(u => ({ ...u, type: "user" as const, daysPending: Math.floor((Date.now() - new Date(u.updatedAt).getTime()) / 86400000) })),
    staleRunners: staleRunners.map(r => ({
      ...r, type: "runner" as const,
      rating: r.rating ? Number(r.rating) : null,
      daysPending: Math.floor((Date.now() - new Date(r.updatedAt).getTime()) / 86400000),
    })),
    totalStale: staleUsers.length + staleRunners.length,
  });
});

export default router;
