import { Router, type IRouter } from "express";
import { db, recruitmentsTable, trainingModulesTable, runnerTrainingTable, qualityReviewsTable, incidentsTable, supportTicketsTable, tasksTable, runnersTable, usersTable, adminSettingsTable, reviewsTable } from "@workspace/db";
import { eq, and, desc, inArray, sql, gte, lte, count } from "drizzle-orm";
import { requireAdmin, requireRunner, requireUser } from "../lib/auth";

// ── SLA Grade Helper ──────────────────────────────────────────
// Computes a combined grade from acceptance time (seconds),
// arrival time (minutes), and completion time (minutes).
// Returns the worst grade across all available metrics.
function computeSlaGrade(
  acceptTimeSeconds: number | null,
  arrivalTimeMinutes: number | null,
  completeTimeMinutes: number | null,
): string {
  const rankToGrade = ["excellent", "good", "average", "poor"];
  let worstRank = 0;

  // Acceptance time (seconds): ≤5min excellent, ≤10min good, ≤20min average, >20min poor
  if (acceptTimeSeconds != null) {
    const rank = acceptTimeSeconds > 1200 ? 3 : acceptTimeSeconds > 600 ? 2 : acceptTimeSeconds > 300 ? 1 : 0;
    if (rank > worstRank) worstRank = rank;
  }

  // Arrival time (minutes): ≤15min excellent, ≤30min good, ≤45min average, >45min poor
  if (arrivalTimeMinutes != null) {
    const rank = arrivalTimeMinutes > 45 ? 3 : arrivalTimeMinutes > 30 ? 2 : arrivalTimeMinutes > 15 ? 1 : 0;
    if (rank > worstRank) worstRank = rank;
  }

  // Completion time (minutes): ≤30min excellent, ≤60min good, ≤120min average, >120min poor
  if (completeTimeMinutes != null) {
    const rank = completeTimeMinutes > 120 ? 3 : completeTimeMinutes > 60 ? 2 : completeTimeMinutes > 30 ? 1 : 0;
    if (rank > worstRank) worstRank = rank;
  }

  return rankToGrade[worstRank];
}

const router: IRouter = Router();

// ═══════════════════════════════════════════════
// 1. COMRADE RECRUITMENT SYSTEM
// ═══════════════════════════════════════════════

// GET /admin/recruitment — list all recruits
router.get("/admin/recruitment", requireAdmin, async (req, res): Promise<void> => {
  const { stage, limit = "50", offset = "0" } = req.query as Record<string, string>;
  const stageFilter = stage ? eq(recruitmentsTable.stage, stage) : undefined;
  const results = await db.select().from(recruitmentsTable)
    .where(stageFilter)
    .orderBy(desc(recruitmentsTable.createdAt)).limit(Number(limit)).offset(Number(offset));
  res.json(results);
});

// POST /admin/recruitment — add new recruit
router.post("/admin/recruitment", requireAdmin, async (req, res): Promise<void> => {
  const { name, phone, area, vehicleType, languages, availability } = req.body;
  const [recruit] = await db.insert(recruitmentsTable).values({
    name, phone, area,
    vehicleType: vehicleType || "bicycle",
    languages: languages || ["hindi"],
    availability: availability || "full_time",
  }).returning();
  res.status(201).json(recruit);
});

// PATCH /admin/recruitment/:id — update recruit stage
router.patch("/admin/recruitment/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { stage, notes, interviewDate, trainingScore, runnerId } = req.body;
  const updates: Record<string, unknown> = {};
  if (stage) updates.stage = stage;
  if (notes !== undefined) updates.notes = notes;
  if (interviewDate) updates.interviewDate = new Date(interviewDate);
  if (trainingScore !== undefined) updates.trainingScore = trainingScore;
  if (runnerId) updates.runnerId = runnerId;
  if (stage === "documents_submitted") updates.documentsSubmittedAt = new Date();
  if (stage === "training_complete") updates.trainingCompletedAt = new Date();
  if (stage === "pilot_active") updates.activatedAt = new Date();

  const [updated] = await db.update(recruitmentsTable).set(updates).where(eq(recruitmentsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Recruit not found" }); return; }
  res.json(updated);
});

// GET /admin/recruitment/funnel — recruitment funnel stats
router.get("/admin/recruitment/funnel", requireAdmin, async (_req, res): Promise<void> => {
  const groups = await db.select({
    stage: recruitmentsTable.stage,
    count: count(),
  }).from(recruitmentsTable).groupBy(recruitmentsTable.stage);
  const stages = ["applied", "interview_scheduled", "documents_submitted", "training_pending", "training_complete", "pilot_active", "suspended"];
  const total = groups.reduce((s, g) => s + g.count, 0);
  const funnel = stages.map(stage => ({
    stage,
    count: groups.find(g => g.stage === stage)?.count ?? 0,
  }));
  res.json({ funnel, total });
});

// ═══════════════════════════════════════════════
// 2. COMRADE TRAINING CENTER
// ═══════════════════════════════════════════════

// GET /admin/training/modules — list training modules
router.get("/admin/training/modules", requireAdmin, async (_req, res): Promise<void> => {
  const modules = await db.select().from(trainingModulesTable).orderBy(trainingModulesTable.order);
  res.json(modules);
});

// POST /admin/training/modules — create training module
router.post("/admin/training/modules", requireAdmin, async (req, res): Promise<void> => {
  const { topic, description, order, isRequired } = req.body;
  const [mod] = await db.insert(trainingModulesTable).values({ topic, description, order: order || 0, isRequired: isRequired !== false }).returning();
  res.status(201).json(mod);
});

// PATCH /admin/training/modules/:id — update module
router.patch("/admin/training/modules/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [updated] = await db.update(trainingModulesTable).set(req.body).where(eq(trainingModulesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Module not found" }); return; }
  res.json(updated);
});

// GET /admin/training/progress/:runnerId — training progress for a runner
router.get("/admin/training/progress/:runnerId", requireAdmin, async (req, res): Promise<void> => {
  const runnerId = parseInt(Array.isArray(req.params.runnerId) ? req.params.runnerId[0] : req.params.runnerId, 10);
  const modules = await db.select().from(trainingModulesTable).orderBy(trainingModulesTable.order);
  const completed = await db.select().from(runnerTrainingTable).where(eq(runnerTrainingTable.runnerId, runnerId));
  const progress = modules.map(m => ({
    ...m,
    completed: completed.some(c => c.moduleId === m.id && c.completed),
    score: completed.find(c => c.moduleId === m.id)?.score || null,
    completedAt: completed.find(c => c.moduleId === m.id)?.completedAt || null,
  }));
  const completedCount = progress.filter(p => p.completed).length;
  const readiness = modules.length > 0 ? Math.round((completedCount / modules.length) * 100) : 0;
  res.json({ progress, readiness, completedCount, totalModules: modules.length });
});

// POST /admin/training/complete — mark module complete for runner
router.post("/admin/training/complete", requireAdmin, async (req, res): Promise<void> => {
  const { runnerId, moduleId, score } = req.body;
  const [existing] = await db.select().from(runnerTrainingTable)
    .where(and(eq(runnerTrainingTable.runnerId, runnerId), eq(runnerTrainingTable.moduleId, moduleId))).limit(1);
  if (existing) {
    const [updated] = await db.update(runnerTrainingTable).set({ completed: true, score, completedAt: new Date() })
      .where(eq(runnerTrainingTable.id, existing.id)).returning();
    res.json(updated);
    return;
  }
  const [created] = await db.insert(runnerTrainingTable).values({ runnerId, moduleId, completed: true, score, completedAt: new Date() }).returning();
  res.status(201).json(created);
});

// Seed default training modules
router.post("/admin/training/seed", requireAdmin, async (_req, res): Promise<void> => {
  const topics = [
    { topic: "Customer Handling", description: "Politeness, communication, complaint handling", order: 1 },
    { topic: "Hospital Protocol", description: "OPD procedures, ward access, report collection", order: 2 },
    { topic: "Government Office Protocol", description: "Document submission, form filling, counter navigation", order: 3 },
    { topic: "Bank Protocol", description: "Queue management, form assistance, deposit/withdrawal process", order: 4 },
    { topic: "Proof Upload Process", description: "Taking clear photos, GPS verification, watermarking", order: 5 },
    { topic: "Queue Updates", description: "How to update token progress, estimate ETA, communicate with customer", order: 6 },
    { topic: "Fraud Prevention", description: "Identifying suspicious requests, reporting, OTP security", order: 7 },
    { topic: "Senior Citizen Assistance", description: "Patience, accessibility, extra care protocols", order: 8 },
  ];
  for (const t of topics) {
    // Check if module already exists
    const [existing] = await db.select({ id: trainingModulesTable.id }).from(trainingModulesTable).where(eq(trainingModulesTable.topic, t.topic)).limit(1);
    if (!existing) {
      await db.insert(trainingModulesTable).values(t);
    }
  }
  const modules = await db.select().from(trainingModulesTable).orderBy(trainingModulesTable.order);
  res.json({ seeded: topics.length, total: modules.length, modules });
});

// ═══════════════════════════════════════════════
// 3. COMRADE OPERATIONS PLAYBOOK (runner-facing)
// ═══════════════════════════════════════════════

// GET /runners/playbook — operations guide for runners
router.get("/runners/playbook", requireRunner, async (_req, res): Promise<void> => {
  res.json({
    sections: [
      {
        title: "Task Acceptance Rules",
        rules: [
          "Only accept tasks you can complete within the estimated time",
          "Check the task location and category before accepting",
          "Do not accept multiple tasks simultaneously — complete one first",
          "If you're unsure about a task, skip it",
        ],
      },
      {
        title: "Photo Proof Rules",
        rules: [
          "Always capture clear, well-lit photos as proof",
          "GPS must be enabled — photos are geo-tagged automatically",
          "Upload photos at each stage: pickup, location, progress, completion",
          "Do not upload duplicate photos — this triggers fraud alerts",
          "Photos are watermarked with task ID, timestamp, and location",
        ],
      },
      {
        title: "GPS Rules",
        rules: [
          "Keep GPS enabled throughout the task",
          "Your location is shared with the customer in real time",
          "GPS must match the task location within 250m for proof upload",
          "If GPS fails, contact admin support immediately",
        ],
      },
      {
        title: "Waiting Rules",
        rules: [
          "Start waiting timer only when you're physically at the queue location",
          "First 15 minutes of waiting are free for the customer",
          "Pause waiting timer when your turn arrives",
          "Waiting charges are calculated in brackets (30, 60, 120 min)",
        ],
      },
      {
        title: "Cancellation Rules",
        rules: [
          "Cancelling after accepting affects your trust score",
          "Only cancel in genuine emergencies",
          "If the customer cancels, you still receive a partial payout",
          "Repeated cancellations may lead to suspension",
        ],
      },
      {
        title: "Emergency Escalation",
        rules: [
          "For medical emergencies: Immediately call 108",
          "For customer disputes: Stay calm and contact admin via chat",
          "For technical issues: Use the in-app 'Report Issue' feature",
          "For safety concerns: Priority escalation to admin team",
          "Admin support is available 24/7",
        ],
      },
    ],
    version: "1.0",
    lastUpdated: new Date().toISOString(),
  });
});

// ═══════════════════════════════════════════════
// 4. PILOT TASK QUALITY SYSTEM
// ═══════════════════════════════════════════════

// POST /admin/quality/submit — submit quality review
router.post("/admin/quality/submit", requireAdmin, async (req, res): Promise<void> => {
  const { taskId, runnerId, customerRating, customerFeedback, comradeFeedback } = req.body;

  // Compute quality score
  let qualityScore = 50; // base
  if (customerRating) qualityScore += (customerRating - 3) * 15; // rating contribution
  if (customerFeedback?.length > 10) qualityScore += 5; // detailed feedback bonus
  qualityScore = Math.max(0, Math.min(100, qualityScore));

  // Compute SLA grade
    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
  let slaGrade: string;
  if (task) {
    const acceptTime = task.acceptedAt ? (new Date(task.acceptedAt).getTime() - new Date(task.createdAt).getTime()) / 1000 : null;
    const arrivalTime = task.reachedTaskLocationAt ? (new Date(task.reachedTaskLocationAt).getTime() - (task.acceptedAt ? new Date(task.acceptedAt).getTime() : new Date(task.createdAt).getTime())) / 60000 : null;
    const completeTime = task.completedAt ? (new Date(task.completedAt).getTime() - (task.acceptedAt ? new Date(task.acceptedAt).getTime() : new Date(task.createdAt).getTime())) / 60000 : null;
    // Combined grade from acceptance time, arrival time, and completion time
    slaGrade = computeSlaGrade(acceptTime, arrivalTime, completeTime);

    const [review] = await db.insert(qualityReviewsTable).values({
      taskId, runnerId, customerRating, customerFeedback, comradeFeedback,
      taskQualityScore: qualityScore, slaGrade,
      acceptanceTimeSeconds: acceptTime ? Math.round(acceptTime) : null,
      arrivalTimeMinutes: arrivalTime ? Math.round(arrivalTime) : null,
      completionTimeMinutes: completeTime ? Math.round(completeTime) : null,
      reviewedAt: new Date(),
    }).returning();
    res.status(201).json(review);
    return;
  }
  res.status(404).json({ error: "Task not found" });
});

// GET /admin/quality — list quality reviews
router.get("/admin/quality", requireAdmin, async (req, res): Promise<void> => {
  const { limit = "20", offset = "0" } = req.query as Record<string, string>;
  const reviews = await db.select().from(qualityReviewsTable).orderBy(desc(qualityReviewsTable.createdAt)).limit(Number(limit)).offset(Number(offset));
  res.json(reviews);
});

// GET /admin/quality/stats — quality stats
router.get("/admin/quality/stats", requireAdmin, async (_req, res): Promise<void> => {
  const reviews = await db.select().from(qualityReviewsTable);
  const avgScore = reviews.length > 0 ? Math.round(reviews.reduce((s, r) => s + (r.taskQualityScore || 0), 0) / reviews.length) : 0;
  const avgRating = reviews.filter(r => r.customerRating).length > 0
    ? (reviews.filter(r => r.customerRating).reduce((s, r) => s + (r.customerRating || 0), 0) / reviews.filter(r => r.customerRating).length).toFixed(1)
    : "0.0";
  const gradeDist = { excellent: reviews.filter(r => r.slaGrade === "excellent").length, good: reviews.filter(r => r.slaGrade === "good").length, average: reviews.filter(r => r.slaGrade === "average").length, poor: reviews.filter(r => r.slaGrade === "poor").length };
  res.json({ avgScore, avgRating, gradeDist, total: reviews.length });
});

// ═══════════════════════════════════════════════
// 5. CUSTOMER SUPPORT CENTER
// ═══════════════════════════════════════════════

// GET /admin/support — list support tickets
router.get("/admin/support", requireAdmin, async (req, res): Promise<void> => {
  const { status, priority, limit = "50", offset = "0" } = req.query as Record<string, string>;
  const filters = [];
  if (status) filters.push(eq(supportTicketsTable.status, status));
  if (priority) filters.push(eq(supportTicketsTable.priority, priority));
  const results = await db.select().from(supportTicketsTable)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(supportTicketsTable.createdAt)).limit(Number(limit)).offset(Number(offset));
  res.json(results);
});

// POST /admin/support — create support ticket
router.post("/admin/support", requireAdmin, async (req, res): Promise<void> => {
  const { taskId, userId, runnerId, subject, description, category, priority } = req.body;
  // Generate ticket ID
  const count = await db.select({ count: sql<number>`count(*)` }).from(supportTicketsTable);
  const ticketNum = String((count[0]?.count || 0) + 1).padStart(4, "0");
  const ticketId = `GL-SUP-${ticketNum}`;
  const [ticket] = await db.insert(supportTicketsTable).values({
    ticketId, taskId, userId, runnerId, subject, description,
    category: category || "general", priority: priority || "normal",
  }).returning();
  res.status(201).json(ticket);
});

// PATCH /admin/support/:id — update ticket
router.patch("/admin/support/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { status, assignedAdmin, resolution, refundAmount, priority } = req.body;
  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (assignedAdmin) updates.assignedAdmin = assignedAdmin;
  if (resolution !== undefined) updates.resolution = resolution;
  if (refundAmount !== undefined) updates.refundAmount = refundAmount;
  if (priority) updates.priority = priority;
  if (status === "resolved") {
    const [ticket] = await db.select({ createdAt: supportTicketsTable.createdAt }).from(supportTicketsTable).where(eq(supportTicketsTable.id, id));
    if (ticket) {
      updates.resolvedAt = new Date();
      updates.resolutionTimeMinutes = Math.round((Date.now() - new Date(ticket.createdAt).getTime()) / 60000);
    }
  }
  if (status === "closed") updates.closedAt = new Date();
  const [updated] = await db.update(supportTicketsTable).set(updates).where(eq(supportTicketsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Ticket not found" }); return; }
  res.json(updated);
});

// GET /admin/support/stats — support metrics
router.get("/admin/support/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [[{ count: total }], [{ count: open }], [{ count: resolved }], [avgRow]] = await Promise.all([
    db.select({ count: count() }).from(supportTicketsTable),
    db.select({ count: count() }).from(supportTicketsTable)
      .where(inArray(supportTicketsTable.status, ["open", "in_progress"])),
    db.select({ count: count() }).from(supportTicketsTable)
      .where(inArray(supportTicketsTable.status, ["resolved", "closed"])),
    db.select({ avg: sql<number>`ROUND(AVG(${supportTicketsTable.resolutionTimeMinutes}))` })
      .from(supportTicketsTable)
      .where(sql`${supportTicketsTable.resolutionTimeMinutes} IS NOT NULL`),
  ]);
  res.json({
    total: Number(total),
    open: Number(open),
    resolved: Number(resolved),
    avgResolutionTime: avgRow ? Number(avgRow.avg) : 0,
  });
});

// ═══════════════════════════════════════════════
// 6. SLA MONITORING
// ═══════════════════════════════════════════════

// GET /admin/sla — SLA monitoring data
router.get("/admin/sla", requireAdmin, async (_req, res): Promise<void> => {
  const completedTasks = await db.select({
    id: tasksTable.id, createdAt: tasksTable.createdAt, acceptedAt: tasksTable.acceptedAt,
    completedAt: tasksTable.completedAt, runnerId: tasksTable.runnerId, category: tasksTable.category,
    timeToAcceptance: tasksTable.timeToAcceptance,
  }).from(tasksTable).where(eq(tasksTable.status, "completed")).limit(100);

  const slaData = completedTasks.map(t => {
    const acceptTime = t.timeToAcceptance || (t.acceptedAt ? Math.round((new Date(t.acceptedAt).getTime() - new Date(t.createdAt).getTime()) / 1000) : null);
    const completeTime = t.completedAt && t.acceptedAt ? Math.round((new Date(t.completedAt).getTime() - new Date(t.acceptedAt).getTime()) / 60000) : null;

    const grade = computeSlaGrade(acceptTime, null, completeTime);

    return { taskId: t.id, acceptTime, completeTime, grade, category: t.category };
  });

  const gradeDist = { excellent: slaData.filter(d => d.grade === "excellent").length, good: slaData.filter(d => d.grade === "good").length, average: slaData.filter(d => d.grade === "average").length, poor: slaData.filter(d => d.grade === "poor").length };
  const avgAccept = slaData.filter(d => d.acceptTime).length > 0 ? Math.round(slaData.filter(d => d.acceptTime).reduce((s, d) => s + (d.acceptTime || 0), 0) / slaData.filter(d => d.acceptTime).length) : 0;
  const avgComplete = slaData.filter(d => d.completeTime).length > 0 ? Math.round(slaData.filter(d => d.completeTime).reduce((s, d) => s + (d.completeTime || 0), 0) / slaData.filter(d => d.completeTime).length) : 0;

  res.json({ slaData, gradeDist, avgAcceptanceTime: avgAccept, avgCompletionTime: avgComplete, total: slaData.length });
});

// ═══════════════════════════════════════════════
// 7. CITY HEATMAP
// ═══════════════════════════════════════════════

const AHMEDABAD_AREAS = [
  "Juhapura", "Sarkhej", "Prahladnagar", "Makarba", "Paldi", "Vasna", "Jamalpur", "Kalupur",
];

// GET /admin/heatmap — task demand and comrade supply by area
router.get("/admin/heatmap", requireAdmin, async (_req, res): Promise<void> => {
  const allTasks = await db.select({ locationArea: tasksTable.locationArea, id: tasksTable.id, status: tasksTable.status }).from(tasksTable);
  const allRunners = await db.select({ area: runnersTable.area, id: runnersTable.id, isOnline: runnersTable.isOnline }).from(runnersTable);

  const areas = AHMEDABAD_AREAS.map(area => {
    const tasksInArea = allTasks.filter(t => t.locationArea?.toLowerCase().includes(area.toLowerCase()));
    const runnersInArea = allRunners.filter(r => r.area?.toLowerCase().includes(area.toLowerCase()));
    return {
      area,
      demand: tasksInArea.length,
      activeTasks: tasksInArea.filter(t => ["assigned","on_the_way","at_location","in_progress"].includes(t.status)).length,
      supply: runnersInArea.length,
      onlineRunners: runnersInArea.filter(r => r.isOnline).length,
      shortage: Math.max(0, tasksInArea.length - runnersInArea.filter(r => r.isOnline).length),
    };
  });

  res.json({
    areas,
    totalDemand: areas.reduce((s, a) => s + a.demand, 0),
    totalSupply: areas.reduce((s, a) => s + a.supply, 0),
    totalShortage: areas.reduce((s, a) => s + a.shortage, 0),
  });
});

// ═══════════════════════════════════════════════
// 8. PILOT COMMAND CENTER
// ═══════════════════════════════════════════════

// GET /admin/pilot — comprehensive pilot dashboard data
router.get("/admin/pilot", requireAdmin, async (_req, res): Promise<void> => {
  // Fix #10: Use SQL WHERE for today's tasks instead of pulling all + filtering in JS
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [allTasks, allRunners, allUsers, qualityReviews, incidents, supportTickets, todayTasks] = await Promise.all([
    db.select().from(tasksTable),
    db.select().from(runnersTable),
    db.select().from(usersTable),
    db.select().from(qualityReviewsTable),
    db.select().from(incidentsTable),
    db.select().from(supportTicketsTable),
    db.select().from(tasksTable).where(gte(tasksTable.createdAt, today)),
  ]);
  const completedToday = todayTasks.filter(t => t.status === "completed");

  const activeUsers = new Set(allTasks.filter(t => ["pending","assigned","on_the_way","at_location","in_progress"].includes(t.status)).map(t => t.userId)).size;
  const activeComrades = new Set(allTasks.filter(t => ["assigned","on_the_way","at_location","in_progress"].includes(t.status)).map(t => t.runnerId)).size;
  const tasksToday = todayTasks.length;
  const acceptedToday = todayTasks.filter(t => t.runnerId).length;
  const acceptanceRate = tasksToday > 0 ? Math.round((acceptedToday / tasksToday) * 100) : 0;
  const completedRate = tasksToday > 0 ? Math.round((completedToday.length / tasksToday) * 100) : 0;
  const revenueToday = completedToday.reduce((s, t) => s + Number(t.price || 0), 0);
  const avgRating = qualityReviews.filter(r => r.customerRating).length > 0
    ? (qualityReviews.filter(r => r.customerRating).reduce((s, r) => s + (r.customerRating || 0), 0) / qualityReviews.filter(r => r.customerRating).length).toFixed(1)
    : "N/A";
  const avgWaitSaved = allTasks.filter(t => t.totalWaitingMinutes).length > 0
    ? Math.round(allTasks.filter(t => t.totalWaitingMinutes).reduce((s, t) => s + (t.totalWaitingMinutes || 0), 0) / allTasks.filter(t => t.totalWaitingMinutes).length)
    : 0;

  res.json({
    activeUsers, activeComrades, tasksToday, acceptanceRate, completedRate,
    revenueToday, avgRating, avgWaitSaved,
    qualityTotal: qualityReviews.length,
    openIncidents: incidents.filter(i => i.status === "open" || i.status === "in_progress").length,
    openTickets: supportTickets.filter(t => t.status === "open" || t.status === "in_progress").length,
    totalUsers: allUsers.length,
    totalComrades: allRunners.filter(r => r.kycStatus === "verified").length,
    pendingKyc: allRunners.filter(r => r.kycStatus === "pending").length,
    onlineComrades: allRunners.filter(r => r.isOnline && r.kycStatus === "verified").length,
    timestamp: new Date().toISOString(),
  });
});

// ═══════════════════════════════════════════════
// 9. INCIDENT MANAGEMENT
// ═══════════════════════════════════════════════

// GET /admin/incidents — list incidents
router.get("/admin/incidents", requireAdmin, async (req, res): Promise<void> => {
  const { status, type, limit = "50", offset = "0" } = req.query as Record<string, string>;
  const filters = [];
  if (status) filters.push(eq(incidentsTable.status, status));
  if (type) filters.push(eq(incidentsTable.type, type));
  const results = await db.select().from(incidentsTable)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(incidentsTable.createdAt)).limit(Number(limit)).offset(Number(offset));
  res.json(results);
});

// POST /admin/incidents — create incident (also callable from other routes)
router.post("/admin/incidents", requireAdmin, async (req, res): Promise<void> => {
  const { type, taskId, runnerId, userId, title, description, severity } = req.body;
  const [incident] = await db.insert(incidentsTable).values({
    type, taskId, runnerId, userId, title, description,
    severity: severity || "medium",
  }).returning();
  res.status(201).json(incident);
});

// PATCH /admin/incidents/:id — update incident
router.patch("/admin/incidents/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { status, assignedAdmin, resolution } = req.body;
  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (assignedAdmin) updates.assignedAdmin = assignedAdmin;
  if (resolution !== undefined) updates.resolution = resolution;
  if (status === "resolved" || status === "closed") updates.resolvedAt = new Date();
  const [updated] = await db.update(incidentsTable).set(updates).where(eq(incidentsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Incident not found" }); return; }
  res.json(updated);
});

// GET /admin/incidents/stats — incident metrics
router.get("/admin/incidents/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [[{ count: total }], [{ count: open }], typeGroups, statusGroups] = await Promise.all([
    db.select({ count: count() }).from(incidentsTable),
    db.select({ count: count() }).from(incidentsTable)
      .where(inArray(incidentsTable.status, ["open", "in_progress"])),
    db.select({ type: incidentsTable.type, count: count() })
      .from(incidentsTable).groupBy(incidentsTable.type),
    db.select({ status: incidentsTable.status, count: count() })
      .from(incidentsTable).groupBy(incidentsTable.status),
  ]);

  const typeDist: Record<string, number> = {};
  for (const g of typeGroups) { typeDist[g.type] = g.count; }
  const statusDist: Record<string, number> = {};
  for (const g of statusGroups) { statusDist[g.status] = g.count; }

  res.json({ total: Number(total), typeDist, statusDist, open: Number(open) });
});

// ═══════════════════════════════════════════════
// 10. PILOT READINESS VALIDATION
// ═══════════════════════════════════════════════

// GET /admin/pilot/readiness — full pilot readiness audit
router.get("/admin/pilot/readiness", requireAdmin, async (_req, res): Promise<void> => {
  const allTasks = await db.select().from(tasksTable);
  const allRunners = await db.select().from(runnersTable);
  const allUsers = await db.select().from(usersTable);
  const recruits = await db.select().from(recruitmentsTable);
  const quality = await db.select().from(qualityReviewsTable);
  const incidents = await db.select().from(incidentsTable);
  const tickets = await db.select().from(supportTicketsTable);

  const completed = allTasks.filter(t => t.status === "completed").length;
  const total = allTasks.length;
  const uniqueUsers = new Set(allTasks.map(t => t.userId)).size;
  const verifiedComrades = allRunners.filter(r => r.kycStatus === "verified").length;
  const activeRecruits = recruits.filter(r => r.stage === "pilot_active").length;

  // Technology score (0-100)
  const techScore = Math.round(
    (total > 0 ? 20 : 0) +          // Tasks exist
    (verifiedComrades > 0 ? 20 : 0) + // Verified comrades
    (uniqueUsers > 0 ? 15 : 0) +     // Active users
    (completed > 0 ? 15 : 0) +       // Completed tasks
    (quality.length > 0 ? 10 : 0) +  // Quality reviews enabled
    (incidents.length > 0 ? 10 : 0) + // Incident management active
    (tickets.length > 0 ? 10 : 0)     // Support system active
  );

  // Operations score (0-100)
  const opsScore = Math.round(
    (recruits.length > 0 ? 20 : 0) +           // Recruitment pipeline
    (activeRecruits > 0 ? 20 : 0) +             // Active recruits
    (quality.length > 0 ? 15 : 0) +             // Quality system
    (incidents.length > 0 ? 15 : 0) +           // Incident management
    (tickets.length > 0 ? 15 : 0) +             // Support system
    (verifiedComrades >= 5 ? 15 : verifiedComrades > 0 ? 10 : 0) // Enough comrades
  );

  // Overall pilot score
  const pilotScore = Math.round((techScore + opsScore) / 2);

  res.json({
    technology: { score: techScore, tasks: total, users: uniqueUsers, comrades: verifiedComrades, completed },
    operations: { score: opsScore, recruits: recruits.length, activeRecruits, qualityReviews: quality.length, incidents: incidents.length, tickets: tickets.length },
    overall: { score: pilotScore, techScore, opsScore },
    verdict: pilotScore >= 80 ? "READY FOR AHMEDABAD PILOT" : pilotScore >= 50 ? "READY FOR LIMITED PILOT" : "NOT READY",
    timestamp: new Date().toISOString(),
  });
});

// ═══════════════════════════════════════════════
// PHASE 9 — REAL PILOT EXECUTION SYSTEM
// ═══════════════════════════════════════════════

import { PILOT_ZONES, PILOT_CATEGORIES } from "../lib/constants";

// 1. PILOT LAUNCH MODE — toggle & config
router.get("/admin/pilot/mode", requireAdmin, async (_req, res): Promise<void> => {
  const [settings] = await db.select({ pilotMode: adminSettingsTable.pilotMode, pilotCategories: adminSettingsTable.pilotCategories }).from(adminSettingsTable).limit(1);
  res.json(settings || { pilotMode: false, pilotCategories: PILOT_CATEGORIES });
});

// GET /admin/pilot/config — returns the pilot restrictions for frontend enforcement
router.get("/admin/pilot/config", requireAdmin, async (_req, res): Promise<void> => {
  const [settings] = await db.select({ pilotMode: adminSettingsTable.pilotMode, pilotCategories: adminSettingsTable.pilotCategories }).from(adminSettingsTable).limit(1);
  res.json({
    pilotMode: settings?.pilotMode ?? false,
    allowedCategories: settings?.pilotCategories ?? PILOT_CATEGORIES,
    allowedZones: PILOT_ZONES,
    message: settings?.pilotMode ? "Pilot mode active — only Ahmedabad zones and selected categories" : "Full mode — all zones and categories",
  });
});

router.patch("/admin/pilot/mode", requireAdmin, async (req, res): Promise<void> => {
  const { pilotMode, pilotCategories } = req.body;
  const updates: Record<string, unknown> = {};
  if (pilotMode !== undefined) updates.pilotMode = pilotMode;
  if (pilotCategories) updates.pilotCategories = pilotCategories;
  const [existing] = await db.select({ id: adminSettingsTable.id }).from(adminSettingsTable).limit(1);
  if (existing) {
    const [updated] = await db.update(adminSettingsTable).set(updates).where(eq(adminSettingsTable.id, existing.id)).returning();
    res.json({ pilotMode: updated.pilotMode, pilotCategories: updated.pilotCategories });
  } else {
    const [created] = await db.insert(adminSettingsTable).values(updates).returning();
    res.json({ pilotMode: created.pilotMode, pilotCategories: created.pilotCategories });
  }
});

// 2. COMRADE OPERATIONS CENTER — realtime comrade stats
router.get("/admin/operations-center", requireAdmin, async (_req, res): Promise<void> => {
  const allRunners = await db.select().from(runnersTable);
  const allRecruits = await db.select().from(recruitmentsTable);
  const activeTasks = await db.select({ runnerId: tasksTable.runnerId, id: tasksTable.id }).from(tasksTable)
    .where(inArray(tasksTable.status, ["assigned","on_the_way","at_location","in_progress"]));

  const total = allRunners.length;
  const online = allRunners.filter(r => r.isOnline).length;
  const verified = allRunners.filter(r => r.kycStatus === "verified").length;
  const dispatchReady = allRunners.filter(r => r.isOnline && (r.kycStatus === "verified" || r.dispatchAllowed)).length;
  const trainingComplete = allRecruits.filter(r => r.stage === "training_complete" || r.stage === "pilot_active").length;
  const pilotActive = allRecruits.filter(r => r.stage === "pilot_active").length;
  const suspended = allRecruits.filter(r => r.stage === "suspended").length;

  // Area-wise distribution
  const areaDist = [...new Set(allRunners.map(r => r.area).filter(Boolean))].map(area => ({
    area,
    total: allRunners.filter(r => r.area === area).length,
    online: allRunners.filter(r => r.area === area && r.isOnline).length,
    onTask: allRunners.filter(r => r.area === area && activeTasks.some(t => t.runnerId === r.id)).length,
  })).sort((a, b) => b.total - a.total);

  res.json({ total, online, verified, dispatchReady, trainingComplete, pilotActive, suspended, areaDist });
});

// 3. DAILY OPERATIONS DASHBOARD — realtime daily metrics
router.get("/admin/daily-ops", requireAdmin, async (_req, res): Promise<void> => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const allTasks = await db.select().from(tasksTable);
  const todayTasks = allTasks.filter(t => t.createdAt >= today);
  const completedToday = todayTasks.filter(t => t.status === "completed");
  const cancelledToday = todayTasks.filter(t => t.status === "cancelled");
  const totalTasks = allTasks.length;

  const tasksToday = todayTasks.length;
  const completed = completedToday.length;
  const cancelled = cancelledToday.length;
  const revenueToday = completedToday.reduce((s, t) => s + Number(t.price || 0), 0);
  const acceptedToday = todayTasks.filter(t => t.runnerId).length;
  const acceptanceRate = tasksToday > 0 ? Math.round((acceptedToday / tasksToday) * 100) : 0;
  const completionRate = tasksToday > 0 ? Math.round((completed / tasksToday) * 100) : 0;
  const cancellationRate = tasksToday > 0 ? Math.round((cancelled / tasksToday) * 100) : 0;

  // Avg rating from quality reviews today
  const qualityReviews = await db.select().from(qualityReviewsTable);
  const todayReviews = qualityReviews.filter(r => r.createdAt >= today);
  const avgRating = todayReviews.filter(r => r.customerRating).length > 0
    ? (todayReviews.filter(r => r.customerRating).reduce((s, r) => s + (r.customerRating || 0), 0) / todayReviews.filter(r => r.customerRating).length).toFixed(1)
    : "0.0";

  // Pilot goals (for KPI tracker)
  const uniqueUsersToday = new Set(todayTasks.map(t => t.userId)).size;
  const uniqueComradesToday = new Set(todayTasks.filter(t => t.runnerId).map(t => t.runnerId)).size;

  res.json({
    tasksToday, completed, cancelled, revenueToday, acceptanceRate, completionRate, cancellationRate,
    avgRating, uniqueUsersToday, uniqueComradesToday, totalTasks,
    timestamp: new Date().toISOString(),
  });
});

// 4. CUSTOMER FEEDBACK — post-task feedback submission (requires auth + task ownership)
router.post("/admin/feedback", requireUser, async (req, res): Promise<void> => {
  const user = req.user!;
  const { taskId, rating, feedback, issueReport } = req.body;
  if (!taskId || !rating) { res.status(400).json({ error: "taskId and rating required" }); return; }

  // Verify the user owns this task
  const [task] = await db.select({ userId: tasksTable.userId, runnerId: tasksTable.runnerId }).from(tasksTable).where(eq(tasksTable.id, taskId));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  if (task.userId !== user.id) { res.status(403).json({ error: "You can only review your own tasks" }); return; }

  const userId = user.id;
  const [existing] = await db.select().from(reviewsTable).where(eq(reviewsTable.taskId, taskId)).limit(1);
  if (existing) {
    const [updated] = await db.update(reviewsTable).set({ rating, feedback, issueReport, updatedAt: new Date() }).where(eq(reviewsTable.id, existing.id)).returning();
    res.json(updated);
    return;
  }
  const [review] = await db.insert(reviewsTable).values({ taskId, userId, rating, feedback, issueReport }).returning();

  // Also store customer rating in quality reviews if exists
  if (task?.runnerId) {
    const [existingQuality] = await db.select({ id: qualityReviewsTable.id }).from(qualityReviewsTable).where(eq(qualityReviewsTable.taskId, taskId)).limit(1);
    if (existingQuality) {
      await db.update(qualityReviewsTable).set({ customerRating: rating, customerFeedback: feedback }).where(eq(qualityReviewsTable.id, existingQuality.id));
    } else {
      await db.insert(qualityReviewsTable).values({ taskId, runnerId: task.runnerId, customerRating: rating, customerFeedback: feedback, taskQualityScore: Math.max(0, Math.min(100, 50 + (rating - 3) * 15)), reviewedAt: new Date() });
    }
  }

  res.status(201).json(review);
});

// GET /admin/feedback/stats — CSAT score and feedback history
router.get("/admin/feedback/stats", requireAdmin, async (_req, res): Promise<void> => {
  const reviews = await db.select().from(reviewsTable).orderBy(desc(reviewsTable.createdAt)).limit(100);
  const avgRating = reviews.filter(r => r.rating).length > 0
    ? (reviews.filter(r => r.rating).reduce((s, r) => s + (r.rating || 0), 0) / reviews.filter(r => r.rating).length).toFixed(1)
    : "0.0";
  const csatScore = Math.round((Number(avgRating) / 5) * 100);
  const responseRate = reviews.length > 0
    ? Math.round((reviews.length / (reviews.length + 20)) * 100)
    : 0;
  res.json({ avgRating, csatScore, responseRate, total: reviews.length, recent: reviews.slice(0, 10) });
});

// 5. COMRADE PERFORMANCE LEADERBOARD
router.get("/admin/leaderboard", requireAdmin, async (req, res): Promise<void> => {
  const { period = "lifetime", limit = "20" } = req.query as Record<string, string>;
  const allRunners = await db.select().from(runnersTable).where(and(
    eq(runnersTable.kycStatus, "verified"),
    sql`${runnersTable.tasksCompleted} > 0`
  )).orderBy(desc(runnersTable.trustScore)).limit(Number(limit));

  const quality = await db.select({ runnerId: qualityReviewsTable.runnerId, rating: qualityReviewsTable.customerRating }).from(qualityReviewsTable);

  const ranked = allRunners.map(r => {
    const ratings = quality.filter(q => q.runnerId === r.id && q.rating).map(q => q.rating || 0);
    const avgRating = ratings.length > 0 ? (ratings.reduce((s, v) => s + v, 0) / ratings.length).toFixed(1) : "0.0";
    const completionRate = (r.tasksAccepted || 0) > 0 ? Math.round(((r.tasksCompleted || 0) / (r.tasksAccepted || 0)) * 100) : 0;
    const responseTime = r.averageResponseTime ? Number(r.averageResponseTime) : null;
    return {
      id: r.id, name: r.name || "Comrade", phone: r.phone,
      trustScore: r.trustScore ?? 50, trustBadge: r.trustBadge ?? "improving",
      tasksCompleted: r.tasksCompleted ?? 0, tasksAccepted: r.tasksAccepted ?? 0,
      tasksCancelled: r.tasksCancelled ?? 0, completionRate, avgRating,
      responseTime,
    };
  }).sort((a, b) => b.trustScore - a.trustScore);

  res.json({ period, comrades: ranked, total: ranked.length });
});

// 6. AREA PERFORMANCE ANALYTICS
router.get("/admin/area-performance", requireAdmin, async (_req, res): Promise<void> => {
  const AHMEDABAD_AREAS = ["Juhapura","Sarkhej","Prahladnagar","Makarba","Paldi","Vasna","Jamalpur","Kalupur"];
  // Fix #5: Removed limit(200) — use all tasks for accurate analytics
  const allTasks = await db.select().from(tasksTable).orderBy(desc(tasksTable.createdAt));
  const allRunners = await db.select().from(runnersTable);

  const areas = AHMEDABAD_AREAS.map(area => {
    const areaTasks = allTasks.filter(t => t.locationArea?.toLowerCase().includes(area.toLowerCase()) || t.toArea?.toLowerCase().includes(area.toLowerCase()));
    const areaRunners = allRunners.filter(r => r.area?.toLowerCase().includes(area.toLowerCase()));
    const completedTasks = areaTasks.filter(t => t.status === "completed");
    const acceptedTasks = areaTasks.filter(t => t.runnerId);
    const acceptTimes = acceptedTasks.map(t => t.timeToAcceptance).filter(Boolean);
    const completeTimes = completedTasks.filter(t => t.acceptedAt && t.completedAt).map(t => Math.round((new Date(t.completedAt!).getTime() - new Date(t.acceptedAt!).getTime()) / 60000));

    const avgAcceptTime = acceptTimes.length > 0 ? Math.round((acceptTimes as number[]).reduce((s: number, v: number) => s + v, 0) / acceptTimes.length) : 0;
    const avgCompleteTime = completeTimes.length > 0 ? Math.round((completeTimes as number[]).reduce((s: number, v: number) => s + v, 0) / completeTimes.length) : 0;

    return {
      area,
      tasks: areaTasks.length,
      completed: completedTasks.length,
      revenue: completedTasks.reduce((s, t) => s + Number(t.price || 0), 0),
      comrades: areaRunners.length,
      onlineComrades: areaRunners.filter(r => r.isOnline).length,
      avgAcceptTime,
      avgCompleteTime,
      shortage: Math.max(0, areaTasks.filter(t => ["pending","assigned"].includes(t.status)).length - areaRunners.filter(r => r.isOnline).length),
    };
  });

  const highDemand = areas.filter(a => a.shortage > 2).sort((a, b) => b.shortage - a.shortage);
  const lowSupply = areas.filter(a => a.comrades < 2).sort((a, b) => a.comrades - b.comrades);

  res.json({ areas, highDemand, lowSupply, totalTasks: allTasks.length, totalComrades: allRunners.length });
});

// 7. PILOT KPI TRACKER — goal progress
router.get("/admin/kpi-tracker", requireAdmin, async (_req, res): Promise<void> => {
  const allTasks = await db.select().from(tasksTable);
  const allRunners = await db.select().from(runnersTable);
  const allUsers = await db.select().from(usersTable);

  const goals = {
    tasks: {
      target: 100,
      current: allTasks.filter(t => t.status === "completed").length,
    },
    customers: {
      target: 50,
      current: new Set(allTasks.filter(t => t.userId).map(t => t.userId)).size,
    },
    comrades: {
      target: 20,
      current: allRunners.filter(r => r.kycStatus === "verified").length,
    },
  };

  const tasksObj = goals.tasks;
  const customersObj = goals.customers;
  const comradesObj = goals.comrades;

  const overall = Math.round(
    ((tasksObj.current / tasksObj.target) * 0.4 +
     Math.min(customersObj.current, customersObj.target) / customersObj.target * 0.3 +
     Math.min(comradesObj.current, comradesObj.target) / comradesObj.target * 0.3) * 100
  );

  res.json({ goals, overall, timestamp: new Date().toISOString() });
});

// 8. INCIDENT RESPONSE CENTER
router.get("/admin/incident-response", requireAdmin, async (_req, res): Promise<void> => {
  const incidents = await db.select().from(incidentsTable).orderBy(desc(incidentsTable.createdAt)).limit(50);

  const open = incidents.filter(i => i.status === "open" || i.status === "in_progress");
  const critical = incidents.filter(i => i.severity === "critical" || i.severity === "high");
  const resolved = incidents.filter(i => i.status === "resolved" || i.status === "closed");
  const resolvedWithTime = incidents.filter(i => i.resolvedAt && i.createdAt);
  const avgResolutionTime = resolvedWithTime.length > 0
    ? Math.round(resolvedWithTime.reduce((s, i) => s + Math.round((new Date(i.resolvedAt!).getTime() - new Date(i.createdAt).getTime()) / 60000), 0) / resolvedWithTime.length)
    : 0;

  const typeDist: Record<string, number> = {};
  for (const i of incidents) { typeDist[i.type] = (typeDist[i.type] || 0) + 1; }

  res.json({
    open: open.length, critical: critical.length, resolved: resolved.length,
    avgResolutionTime, total: incidents.length,
    typeDist, recent: incidents.slice(0, 10),
  });
});

// 9. EXECUTIVE REPORTS — daily, weekly, monthly
router.get("/admin/executive-report", requireAdmin, async (req, res): Promise<void> => {
  const { type = "daily" } = req.query as Record<string, string>;
  const now = new Date();
  let startDate: Date;

  if (type === "daily") {
    startDate = new Date(); startDate.setHours(0, 0, 0, 0);
  } else if (type === "weekly") {
    startDate = new Date(); startDate.setDate(startDate.getDate() - startDate.getDay()); startDate.setHours(0, 0, 0, 0);
  } else {
    startDate = new Date(); startDate.setDate(1); startDate.setHours(0, 0, 0, 0);
  }

  const allTasks = await db.select().from(tasksTable);
  const periodTasks = allTasks.filter(t => t.createdAt >= startDate);
  const periodCompleted = periodTasks.filter(t => t.status === "completed");
  const allRunners = await db.select().from(runnersTable);

  const revenue = periodCompleted.reduce((s, t) => s + Number(t.price || 0), 0);
  const revenueGrowth = periodCompleted.reduce((s, t) => s + Number(t.price || 0) + Number(t.platformFee || 0), 0);
  const uniqueUsers = new Set(periodTasks.map(t => t.userId)).size;
  const uniqueComrades = new Set(periodTasks.filter(t => t.runnerId).map(t => t.runnerId)).size;
  const avgTasksPerUser = uniqueUsers > 0 ? Math.round(periodTasks.length / uniqueUsers) : 0;

  // Top areas
  const areaCount: Record<string, { tasks: number; revenue: number }> = {};
  for (const t of periodCompleted) {
    const area = t.locationArea || "unknown";
    if (!areaCount[area]) areaCount[area] = { tasks: 0, revenue: 0 };
    areaCount[area].tasks++;
    areaCount[area].revenue += Number(t.price || 0);
  }
  const topAreas = Object.entries(areaCount)
    .map(([area, data]) => ({ area, ...data }))
    .sort((a, b) => b.tasks - a.tasks)
    .slice(0, 5);

  // Top comrades
  const topComrades = allRunners
    .filter(r => r.tasksCompleted > 0)
    .sort((a, b) => (b.trustScore ?? 0) - (a.trustScore ?? 0))
    .slice(0, 5)
    .map(r => ({ id: r.id, name: r.name || "Comrade", tasks: r.tasksCompleted, trustScore: r.trustScore }));

  const report = {
    type,
    period: { start: startDate.toISOString(), end: now.toISOString() },
    revenue,
    revenueGrowth,
    operations: {
      totalTasks: periodTasks.length,
      completed: periodCompleted.length,
      pending: periodTasks.filter(t => t.status === "pending").length,
      cancelled: periodTasks.filter(t => t.status === "cancelled").length,
      avgTasksPerUser,
    },
    customers: { uniqueUsers, uniqueComrades, totalUsers: allTasks.filter(t => t.userId).length },
    topAreas,
    topComrades,
    generatedAt: new Date().toISOString(),
  };

  res.json(report);
});

// 10. FOUNDER COMMAND CENTER — single-screen overview
router.get("/admin/founder", requireAdmin, async (_req, res): Promise<void> => {
  const allTasks = await db.select().from(tasksTable);
  const allRunners = await db.select().from(runnersTable);
  const allUsers = await db.select().from(usersTable);
  const quality = await db.select().from(qualityReviewsTable);
  const incidents = await db.select().from(incidentsTable);
  const tickets = await db.select().from(supportTicketsTable);
  const reviews = await db.select().from(reviewsTable);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayTasks = allTasks.filter(t => t.createdAt >= today);
  const completedToday = todayTasks.filter(t => t.status === "completed");
  const completed = allTasks.filter(t => t.status === "completed").length;
  const total = allTasks.length;

  const uniqueUsers = new Set(allTasks.map(t => t.userId)).size;
  const verifiedComrades = allRunners.filter(r => r.kycStatus === "verified").length;
  const activeNow = todayTasks.filter(t => ["assigned","on_the_way","at_location","in_progress"].includes(t.status)).length;
  const tasksToday = todayTasks.length;
  const revenueToday = completedToday.reduce((s, t) => s + Number(t.price || 0), 0);
  const totalRevenue = allTasks.filter(t => t.status === "completed").reduce((s, t) => s + Number(t.price || 0), 0);
  const avgTrust = verifiedComrades > 0
    ? Math.round(allRunners.filter(r => r.kycStatus === "verified").reduce((s, r) => s + (r.trustScore ?? 50), 0) / verifiedComrades)
    : 0;
  const avgWaitSaved = allTasks.filter(t => t.totalWaitingMinutes).length > 0
    ? Math.round(allTasks.filter(t => t.totalWaitingMinutes).reduce((s, t) => s + (t.totalWaitingMinutes || 0), 0) / allTasks.filter(t => t.totalWaitingMinutes).length)
    : 0;
  const avgRating = reviews.filter(r => r.rating).length > 0
    ? (reviews.filter(r => r.rating).reduce((s, r) => s + (r.rating || 0), 0) / reviews.filter(r => r.rating).length).toFixed(1)
    : "0.0";

  // Pilot progress
  const pilotGoals = {
    tasks: { current: completed, target: 100 },
    customers: { current: uniqueUsers, target: 50 },
    comrades: { current: verifiedComrades, target: 20 },
  };
  const pilotProgress = Math.round(
    ((completed / 100) * 0.4 + Math.min(uniqueUsers, 50) / 50 * 0.3 + Math.min(verifiedComrades, 20) / 20 * 0.3) * 100
  );

  // Growth trends (comparing last 7 days vs before)
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const lastWeek = allTasks.filter(t => t.createdAt >= twoWeeksAgo && t.createdAt < weekAgo);
  const thisWeek = allTasks.filter(t => t.createdAt >= weekAgo);
  const taskGrowth = lastWeek.length > 0 ? Math.round(((thisWeek.length - lastWeek.length) / lastWeek.length) * 100) : 0;

  res.json({
    users: { total: allUsers.length, uniqueWithTasks: uniqueUsers },
    comrades: { total: allRunners.length, verified: verifiedComrades, online: allRunners.filter(r => r.isOnline).length },
    tasks: { total, completed, activeNow, tasksToday, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0 },
    revenue: { today: revenueToday, total: totalRevenue },
    quality: { avgRating, avgTrustScore: avgTrust, avgWaitSaved, qualityReviews: quality.length },
    incidents: { open: incidents.filter(i => i.status === "open" || i.status === "in_progress").length, total: incidents.length },
    support: { open: tickets.filter(t => t.status === "open" || t.status === "in_progress").length, total: tickets.length },
    pilotGoals,
    pilotProgress,
    growth: { taskGrowth, weekTasks: thisWeek.length, prevWeekTasks: lastWeek.length },
    timestamp: new Date().toISOString(),
  });
});

// 12. FINAL PILOT READINESS REPORT (Phase 9 comprehensive)
router.get("/admin/pilot/readiness-report", requireAdmin, async (_req, res): Promise<void> => {
  // Fix #3: Parallel all DB queries instead of sequential awaits
  const [allTasks, allRunners, allUsers, recruits, quality, incidents, tickets, reviews, settingsArr] = await Promise.all([
    db.select().from(tasksTable),
    db.select().from(runnersTable),
    db.select().from(usersTable),
    db.select().from(recruitmentsTable),
    db.select().from(qualityReviewsTable),
    db.select().from(incidentsTable),
    db.select().from(supportTicketsTable),
    db.select().from(reviewsTable),
    db.select({ pilotMode: adminSettingsTable.pilotMode }).from(adminSettingsTable).limit(1),
  ]);
  const settings = settingsArr[0];

  const completed = allTasks.filter(t => t.status === "completed").length;
  const total = allTasks.length;
  const uniqueUsers = new Set(allTasks.map(t => t.userId)).size;
  const verifiedComrades = allRunners.filter(r => r.kycStatus === "verified").length;
  const activeRecruits = recruits.filter(r => r.stage === "pilot_active").length;
  const onlineComrades = allRunners.filter(r => r.isOnline && r.kycStatus === "verified").length;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayTasks = allTasks.filter(t => t.createdAt >= today);
  const completedToday = todayTasks.filter(t => t.status === "completed");
  const avgRating = reviews.filter(r => r.rating).length > 0
    ? (reviews.filter(r => r.rating).reduce((s, r) => s + (r.rating || 0), 0) / reviews.filter(r => r.rating).length).toFixed(1)
    : "0.0";

  // Scores
  const techScore = Math.round(
    (total > 0 ? 15 : 0) + (verifiedComrades > 0 ? 15 : 0) + (uniqueUsers > 0 ? 10 : 0) +
    (completed > 0 ? 10 : 0) + (quality.length > 0 ? 10 : 0) + (incidents.length > 0 ? 10 : 0) +
    (tickets.length > 0 ? 10 : 0) + (completedToday.length > 0 ? 10 : 0) + (onlineComrades > 0 ? 10 : 0)
  );
  const opsScore = Math.round(
    (recruits.length > 0 ? 15 : 0) + (activeRecruits > 0 ? 15 : 0) + (quality.length > 0 ? 10 : 0) +
    (incidents.length > 0 ? 10 : 0) + (tickets.length > 0 ? 10 : 0) + (onlineComrades >= 3 ? 10 : onlineComrades > 0 ? 5 : 0) +
    (completedToday.length >= 5 ? 10 : completedToday.length > 0 ? 5 : 0) + (allTasks.filter(t => t.runnerId).length > 0 ? 10 : 0) +
    (todayTasks.length > 0 ? 10 : 0)
  );
  const marketScore = Math.round(
    (uniqueUsers > 0 ? 20 : 0) + (uniqueUsers >= 10 ? 15 : uniqueUsers >= 5 ? 10 : 5) +
    (allTasks.filter(t => t.locationArea && PILOT_ZONES.some(z => t.locationArea!.toLowerCase().includes(z.toLowerCase()))).length > 0 ? 15 : 0) +
    (todayTasks.length > 0 ? 10 : 0) + (completedToday.length >= 3 ? 10 : completedToday.length > 0 ? 5 : 0) +
    (avgRating && Number(avgRating) >= 4 ? 10 : Number(avgRating) >= 3 ? 5 : 0) +
    (allTasks.filter(t => PILOT_CATEGORIES.includes(t.category)).length > 0 ? 10 : 0)
  );
  const pilotScore = Math.round((techScore + opsScore + marketScore) / 3);

  // Verdict
  let verdict = "NOT READY";
  if (pilotScore >= 85 && completed >= 20 && verifiedComrades >= 5 && uniqueUsers >= 10) verdict = "READY FOR MULTI-CITY EXPANSION";
  else if (pilotScore >= 70 && completed >= 10 && verifiedComrades >= 3 && uniqueUsers >= 5) verdict = "READY FOR AHMEDABAD PILOT";
  else if (pilotScore >= 50 && completed >= 3 && verifiedComrades >= 1) verdict = "READY FOR CLOSED PILOT";

  // Risks
  const remainingRisks: string[] = [];
  if (verifiedComrades < 5) remainingRisks.push(`Only ${verifiedComrades} verified comrades (need 5+)`);
  if (uniqueUsers < 10) remainingRisks.push(`Only ${uniqueUsers} unique users (need 10+)`);
  if (completed < 20) remainingRisks.push(`Only ${completed} completed tasks (need 20+)`);
  if (avgRating && Number(avgRating) < 4) remainingRisks.push(`Average rating ${avgRating} (need 4.0+)`);
  if (quality.length === 0) remainingRisks.push("No quality reviews collected");
  if (!settings?.pilotMode) remainingRisks.push("Pilot mode is not enabled — zones/categories not restricted");
  if (recruits.length === 0) remainingRisks.push("No recruitment pipeline active");
  if (incidents.length > 0 && incidents.filter(i => i.status === "open" || i.status === "in_progress").length > 3) remainingRisks.push(`${incidents.filter(i => i.status === "open" || i.status === "in_progress").length} open incidents`);

  const operationalGaps: string[] = [];
  if (onlineComrades === 0) operationalGaps.push("No comrades currently online");
  if (todayTasks.length === 0) operationalGaps.push("No tasks created today");
  if (completedToday.length === 0) operationalGaps.push("No tasks completed today");
  if (allTasks.filter(t => t.runnerId).length === 0) operationalGaps.push("No tasks have been accepted (dispatch flow untested)");
  if (allTasks.filter(t => t.otpVerified).length === 0) operationalGaps.push("No OTP completions (OTP flow untested)");
  if (allTasks.filter(t => t.proofPhotos && t.proofPhotos.length > 0).length === 0) operationalGaps.push("No proof photos uploaded");

  const scalingRisks: string[] = [];
  if (verifiedComrades < 10) scalingRisks.push(`Need ${10 - verifiedComrades} more verified comrades for multi-city`);
  if (uniqueUsers < 50) scalingRisks.push(`Need ${50 - uniqueUsers} more active users for scale`);
  if (completed < 100) scalingRisks.push(`Need ${100 - completed} more completed tasks for data confidence`);

  res.json({
    scores: {
      technology: { score: techScore, max: 100 },
      operational: { score: opsScore, max: 100 },
      market: { score: marketScore, max: 100 },
      overall: { score: pilotScore, max: 100 },
    },
    verdict,
    risks: { remaining: remainingRisks, operational: operationalGaps, scaling: scalingRisks },
    metrics: {
      tasks: { total, completed, today: todayTasks.length, completedToday: completedToday.length },
      users: { total: allUsers.length, unique: uniqueUsers },
      comrades: { total: allRunners.length, verified: verifiedComrades, online: onlineComrades, activeRecruits },
      quality: { reviews: quality.length, avgRating },
    },
    checklist: {
      booking: total > 0,
      dispatch: allTasks.filter(t => t.runnerId).length > 0,
      tracking: allTasks.filter(t => t.runnerId && ["assigned","on_the_way","at_location","in_progress"].includes(t.status)).length > 0,
      proofUpload: allTasks.filter(t => t.proofPhotos && t.proofPhotos.length > 0).length > 0,
      queueUpdates: allTasks.filter(t => t.queueType).length > 0,
      otpCompletion: allTasks.filter(t => t.otpVerified).length > 0,
      revenue: allTasks.filter(t => t.status === "completed" && Number(t.price) > 0).length > 0,
      trustUpdates: allRunners.filter(r => r.trustScore !== 50).length > 0,
      familyTracking: allTasks.filter(t => t.familyTrackingToken).length > 0,
      adminMonitoring: quality.length > 0 || incidents.length > 0 || tickets.length > 0,
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
