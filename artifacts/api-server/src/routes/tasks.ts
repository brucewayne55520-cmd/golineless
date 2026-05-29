import { Router, type IRouter } from "express";
import { db, tasksTable, usersTable, runnersTable, notificationsTable } from "@workspace/db";
import { eq, and, inArray, desc } from "drizzle-orm";
import { requireUser, requireRunner } from "../lib/auth";

const router: IRouter = Router();

const CATEGORY_PRICES: Record<string, number> = {
  hospital: 149, govt_office: 179, bank: 129, document: 139,
  medicine: 99, senior_care: 199, errand: 89, emergency: 299,
};

const DISTANCE_CHARGES: Record<string, number> = { "0-2": 0, "2-5": 20, "5+": 50 };

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function getTaskWithRelations(id: number) {
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task) return null;
  const [user] = task.userId ? await db.select().from(usersTable).where(eq(usersTable.id, task.userId)) : [null];
  const [runner] = task.runnerId ? await db.select().from(runnersTable).where(eq(runnersTable.id, task.runnerId)) : [null];
  const safeUser = user ? (({ otp, otpExpiresAt, ...u }) => u)(user) : null;
  const safeRunner = runner ? (({ otp, otpExpiresAt, aadhaarNumber, ...r }) => r)(runner) : null;
  return { ...task, user: safeUser, runner: safeRunner };
}

// GET /tasks
router.get("/tasks", async (req, res): Promise<void> => {
  const { status, role, limit = "20", offset = "0" } = req.query as Record<string, string>;
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  const { userSessionsTable, runnerSessionsTable } = await import("@workspace/db");
  const { eq: eqFn } = await import("drizzle-orm");

  let userId: number | null = null;
  let runnerId: number | null = null;

  if (token) {
    const [us] = await db.select().from(userSessionsTable).where(eqFn(userSessionsTable.token, token));
    if (us) userId = us.userId;
    if (!userId) {
      const [rs] = await db.select().from(runnerSessionsTable).where(eqFn(runnerSessionsTable.token, token));
      if (rs) runnerId = rs.runnerId;
    }
  }

  let query = db.select().from(tasksTable).$dynamic();

  const conditions: any[] = [];
  if (role === "runner" && runnerId) {
    conditions.push(eq(tasksTable.runnerId, runnerId));
  } else if (userId) {
    conditions.push(eq(tasksTable.userId, userId));
  }

  if (status) {
    const statuses = status.split(",");
    if (statuses.length === 1) {
      conditions.push(eq(tasksTable.status, statuses[0]));
    } else {
      conditions.push(inArray(tasksTable.status, statuses));
    }
  }

  const tasks = await db
    .select()
    .from(tasksTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(tasksTable.createdAt))
    .limit(Number(limit))
    .offset(Number(offset));

  const enriched = await Promise.all(tasks.map(async (task) => {
    const [user] = task.userId ? await db.select().from(usersTable).where(eq(usersTable.id, task.userId)) : [null];
    const [runner] = task.runnerId ? await db.select().from(runnersTable).where(eq(runnersTable.id, task.runnerId)) : [null];
    const safeUser = user ? (({ otp, otpExpiresAt, ...u }) => u)(user) : null;
    const safeRunner = runner ? (({ otp, otpExpiresAt, aadhaarNumber, ...r }) => r)(runner) : null;
    return { ...task, user: safeUser, runner: safeRunner };
  }));

  res.json(enriched);
});

// GET /tasks/available - for runners
router.get("/tasks/available", requireRunner, async (req, res): Promise<void> => {
  const tasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.status, "pending"))
    .orderBy(desc(tasksTable.createdAt))
    .limit(20);

  const enriched = await Promise.all(tasks.map(async (task) => {
    const [user] = task.userId ? await db.select().from(usersTable).where(eq(usersTable.id, task.userId)) : [null];
    const safeUser = user ? (({ otp, otpExpiresAt, ...u }) => u)(user) : null;
    return { ...task, user: safeUser, runner: null };
  }));

  res.json(enriched);
});

// POST /tasks
router.post("/tasks", requireUser, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const {
    category, description, urgency = "normal", locationName, locationArea, locationCity = "Ahmedabad",
    locationLat, locationLng, distanceBand = "0-2", scheduledDate, scheduledTime,
    paymentMethod = "online", couponCode, seniorInvolved = false, specialInstructions
  } = req.body;

  const basePrice = CATEGORY_PRICES[category] ?? 149;
  const distanceCharge = DISTANCE_CHARGES[distanceBand] ?? 0;
  const urgencyCharge = urgency === "urgent" ? 50 : 0;
  let price = basePrice + distanceCharge + urgencyCharge;
  let discountAmount = 0;
  if (couponCode?.toUpperCase() === "QBUDDY10") {
    discountAmount = Math.round(price * 0.1);
    price -= discountAmount;
  }
  const runnerEarning = Math.round(price * 0.7);
  const platformFee = price - runnerEarning;

  const otp = generateOtp();
  let scheduledAt: Date | undefined;
  if (scheduledDate && scheduledTime) {
    scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
  }

  const [task] = await db.insert(tasksTable).values({
    userId: user.id, category, description, urgency, locationName, locationArea, locationCity,
    locationLat: locationLat?.toString(), locationLng: locationLng?.toString(),
    distanceBand, scheduledAt, basePrice: basePrice.toString(),
    distanceCharge: distanceCharge.toString(), urgencyCharge: urgencyCharge.toString(),
    price: price.toString(), runnerEarning: runnerEarning.toString(), platformFee: platformFee.toString(),
    paymentMethod, couponCode, discountAmount: discountAmount.toString(),
    seniorInvolved, specialInstructions, otp, status: "pending",
  }).returning();

  await db.insert(notificationsTable).values({
    userId: user.id, type: "task_booked",
    title: "Task Booked!", message: `Your ${category} task has been booked. OTP: ${otp}`,
    taskId: task.id,
  });

  const enriched = await getTaskWithRelations(task.id);
  res.status(201).json(enriched);
});

// GET /tasks/:id
router.get("/tasks/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const task = await getTaskWithRelations(id);
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  res.json(task);
});

// PATCH /tasks/:id/status
router.patch("/tasks/:id/status", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { status } = req.body;

  const updates: any = { status };
  if (status === "completed") updates.completedAt = new Date();

  const [task] = await db.update(tasksTable).set(updates).where(eq(tasksTable.id, id)).returning();
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }

  // Notify user
  const notifMessages: Record<string, string> = {
    at_location: "Your runner has arrived at the location!",
    in_progress: "Your runner has started the task.",
    completed: "Your task has been completed!",
  };
  if (notifMessages[status] && task.userId) {
    await db.insert(notificationsTable).values({
      userId: task.userId, type: `task_${status}`,
      title: "Task Update", message: notifMessages[status], taskId: task.id,
    });
  }

  const enriched = await getTaskWithRelations(task.id);
  res.json(enriched);
});

// POST /tasks/:id/accept
router.post("/tasks/:id/accept", requireRunner, async (req, res): Promise<void> => {
  const runner = (req as any).runner;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

  const [task] = await db
    .update(tasksTable)
    .set({ runnerId: runner.id, status: "assigned" })
    .where(and(eq(tasksTable.id, id), eq(tasksTable.status, "pending")))
    .returning();

  if (!task) { res.status(404).json({ error: "Task not found or already taken" }); return; }

  if (task.userId) {
    await db.insert(notificationsTable).values({
      userId: task.userId, type: "runner_assigned",
      title: "Runner Assigned!", message: `${runner.name ?? "A runner"} has been assigned to your task.`,
      taskId: task.id,
    });
  }

  // Update runner status
  await db.update(runnersTable).set({ isOnline: true }).where(eq(runnersTable.id, runner.id));

  const enriched = await getTaskWithRelations(task.id);
  res.json(enriched);
});

// POST /tasks/:id/verify-otp
router.post("/tasks/:id/verify-otp", requireRunner, async (req, res): Promise<void> => {
  const runner = (req as any).runner;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { otp } = req.body;

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  if (task.otp !== otp) { res.status(400).json({ error: "Invalid OTP" }); return; }

  const [updated] = await db
    .update(tasksTable)
    .set({ otpVerified: true, status: "completed", completedAt: new Date(), paymentStatus: "paid" })
    .where(eq(tasksTable.id, id))
    .returning();

  // Update runner earnings
  await db.update(runnersTable).set({
    totalTasks: runner.totalTasks + 1,
    totalEarnings: (Number(runner.totalEarnings || 0) + Number(task.runnerEarning || 0)).toString(),
  }).where(eq(runnersTable.id, runner.id));

  if (task.userId) {
    await db.insert(notificationsTable).values({
      userId: task.userId, type: "task_completed",
      title: "Task Completed!", message: "Your task has been completed successfully. Please rate your runner.",
      taskId: task.id,
    });
  }
  await db.insert(notificationsTable).values({
    runnerId: runner.id, type: "task_completed",
    title: "Task Complete!", message: `You earned Rs ${task.runnerEarning} for completing the task.`,
    taskId: task.id,
  });

  const enriched = await getTaskWithRelations(updated.id);
  res.json(enriched);
});

// POST /tasks/:id/cancel
router.post("/tasks/:id/cancel", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [task] = await db
    .update(tasksTable)
    .set({ status: "cancelled" })
    .where(eq(tasksTable.id, id))
    .returning();
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  const enriched = await getTaskWithRelations(task.id);
  res.json(enriched);
});

// POST /tasks/:id/review
router.post("/tasks/:id/review", requireUser, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { rating, review } = req.body;

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task || !task.runnerId) { res.status(404).json({ error: "Task not found" }); return; }

  const { reviewsTable } = await import("@workspace/db");
  const [rev] = await db.insert(reviewsTable).values({
    taskId: id, userId: user.id, runnerId: task.runnerId, rating, review,
  }).returning();

  // Update runner rating
  const allReviews = await db.select().from(reviewsTable).where(eq(reviewsTable.runnerId, task.runnerId));
  const avgRating = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
  await db.update(runnersTable).set({ rating: avgRating.toFixed(2) }).where(eq(runnersTable.id, task.runnerId));

  res.status(201).json(rev);
});

export default router;
