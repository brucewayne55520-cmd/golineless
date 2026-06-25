import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Router, type IRouter } from "express";
import { db, tasksTable, usersTable, runnersTable, notificationsTable, adminSettingsTable, runnerLocationsTable, reviewsTable, paymentAuditLogTable, proofPhotosTable, taskTimelineEventsTable, fraudFlagsTable, z } from "@workspace/db";
import { eq, and, desc, inArray, sql, type SQL } from "drizzle-orm";
import { requireUser, requireRunner, extractToken, getUserFromToken, getRunnerFromToken, resolveAdmin, generateOtp as generateAuthOtp } from "../lib/auth";
import { logger } from "../lib/logger";
import { getIo } from "../lib/socket";
import { startSmartDispatch, cancelDispatch } from "../lib/dispatch-engine";
import { updateRunnerMetrics } from "../lib/trust-engine";
import { getRevenueConfig, getPriorityFee, getUrgencyMultiplier, calculateWaitingCharge, calculateTaskRevenue, generateInvoiceNumber } from "../lib/revenue-engine";
import { validateGpsForProof, detectDuplicateProof, validateTimelineTransition, isValidCoordinate, safeParseNumber } from "../lib/gps-engine";
import { createOrder } from "../lib/payments";
import { uploadFile, isB2Configured } from "../lib/storage";
import { validateBody } from "../lib/validate";
import { sendEmail } from "../lib/email";
import { sendPaymentReceiptSms, sendPaymentConfirmedSms } from "../lib/sms";

// Fix #14: HTML escape helper to prevent XSS in email templates
function escapeHtml(str: string | null | undefined): string {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const router: IRouter = Router();

const createTaskSchema = z.object({
  category: z.string().min(1),
  urgency: z.enum(["normal", "urgent", "emergency"]).optional(),
}).passthrough();

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(1000).optional(),
}).passthrough();

import { CATEGORY_PRICES, DISTANCE_CHARGES, PILOT_ZONES, MAX_PROOF_PHOTOS_PER_TASK } from "../lib/constants";

// Helper to add timeline entry
function makeTimelineEntry(status: string, label: string, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    status,
    label,
    timestamp: new Date().toISOString(),
    ...extra,
  });
}

// --- Normalized table helpers (dual-write alongside legacy arrays) ---
// Fire-and-forget inserts into the new normalized tables.
// Errors are logged but never block the main request flow.

function recordTimelineEvent(taskId: number, status: string, label: string, eventTimestamp: Date, metadata?: Record<string, unknown>): void {
  db.insert(taskTimelineEventsTable).values({
    taskId, status, label, eventTimestamp,
    metadata: metadata && Object.keys(metadata).length > 0 ? metadata : undefined,
  }).catch(err => logger.error({ err, taskId }, "Failed to record timeline event"));
}

function recordFraudFlag(data: { taskId: number; runnerId?: number; type: string; fromStatus?: string; toStatus?: string; reason?: string; distanceMeters?: number; maxAllowed?: number; proofType?: string; duplicateCount?: number; metadata?: Record<string, unknown> }): void {
  db.insert(fraudFlagsTable).values(data).catch(err => logger.error({ err, taskId: data.taskId }, "Failed to record fraud flag"));
}

function recordProofPhoto(data: { taskId: number; runnerId: number; proofType: string; imageUrl: string; lat?: number; lng?: number; address?: string; taskStatus?: string; uploadedBy?: string; gpsVerified?: boolean }): void {
  db.insert(proofPhotosTable).values(data).catch(err => logger.error({ err, taskId: data.taskId }, "Failed to record proof photo"));
}

async function getTaskWithRelations(id: number) {
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task) return null;
  // Fix #19: Parallel user + runner lookups (was sequential before)
  const [user, runner] = await Promise.all([
    task.userId ? db.select().from(usersTable).where(eq(usersTable.id, task.userId)).then(r => r[0] ?? null) : Promise.resolve(null),
    task.runnerId ? db.select().from(runnersTable).where(eq(runnersTable.id, task.runnerId)).then(r => r[0] ?? null) : Promise.resolve(null),
  ]);
  const safeUser = user ? (({ otp, otpExpiresAt, ...u }) => u)(user) : null;
  const safeRunner = runner ? (({ otp, otpExpiresAt, aadhaarNumber, ...r }) => r)(runner) : null;
  return { ...task, user: safeUser, runner: safeRunner };
}

// GET /tasks
router.get("/tasks", async (req, res): Promise<void> => {
  const { status, role, limit = "20", offset = "0" } = req.query as Record<string, string>;
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) { res.status(401).json({ error: "Authentication required" }); return; }

  let userId: number | null = null;
  let runnerId: number | null = null;

  const user = await getUserFromToken(token);
  if (user) userId = user.id;
  if (!userId) {
    const runner = await getRunnerFromToken(token);
    if (runner) runnerId = runner.id;
  }

  if (!userId && !runnerId) {
    // Check admin token
    const admin = await resolveAdmin(token);
    if (!admin) {
      res.status(401).json({ error: "Invalid or expired token" }); return;
    }
  }

  const conditions: (SQL | undefined)[] = [];
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

// GET /tasks/available - for runners (Comrades)
router.get("/tasks/available", requireRunner, async (req, res): Promise<void> => {
  const tasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.status, "pending"))
    .orderBy(desc(tasksTable.createdAt))
    .limit(20);

  const enriched = await Promise.all(tasks.map(async (task) => {
    const [user] = task.userId ? await db.select().from(usersTable).where(eq(usersTable.id, task.userId)) : [null];
    const safeUser = user ? (({ otp, otpExpiresAt, phone, ...rest }) => rest)(user) : null;
    return { ...task, user: safeUser, runner: null };
  }));

  res.json(enriched);
});

// POST /tasks
router.post("/tasks", requireUser, validateBody(createTaskSchema), async (req, res): Promise<void> => {
  const user = req.user!;

  // S4: Enforce KYC for sensitive categories (senior care)
  const SENIOR_CATEGORIES = ["senior_care"];
  const { category: reqCategory } = req.body;
  if (SENIOR_CATEGORIES.includes(reqCategory) && user.kycStatus !== "verified") {
    res.status(403).json({
      error: "KYC verification required for senior care bookings",
      detail: "Please complete your identity verification (KYC) before booking senior care tasks.",
      kycStatus: user.kycStatus ?? "none",
    });
    return;
  }

  // Phase 9: Pilot Mode enforcement — zone + category validation
  const [settings] = await db.select({ pilotMode: adminSettingsTable.pilotMode, pilotCategories: adminSettingsTable.pilotCategories, maxTasksPerRunnerPerDay: adminSettingsTable.maxTasksPerRunnerPerDay }).from(adminSettingsTable).limit(1);
  if (settings?.pilotMode) {
    const allowedCats = settings.pilotCategories || ["medicine","document","bank","govt_office","courier","senior_care"];
    const { category, locationArea, locationCity } = req.body;

    if (!allowedCats.includes(category)) {
      res.status(403).json({ error: "Currently available only in Ahmedabad Pilot Zones", allowedCategories: allowedCats, reason: "Category not supported in pilot" });
      return;
    }
    if (locationCity && locationCity !== "Ahmedabad") {
      res.status(403).json({ error: "Currently available only in Ahmedabad Pilot Zones", reason: "City not supported" });
      return;
    }
    if (locationArea && !PILOT_ZONES.some(z => locationArea.toLowerCase().includes(z.toLowerCase()))) {
      res.status(403).json({ error: "Currently available only in Ahmedabad Pilot Zones", allowedZones: PILOT_ZONES, reason: "Area not in pilot zone" });
      return;
    }
  }

  // Phase 9.3: Enforce max concurrent tasks per user
  // Note: DB column is named maxTasksPerRunnerPerDay but controls USER concurrency (#3 fix)
  const maxConcurrent = Number(settings?.maxTasksPerRunnerPerDay ?? 10);
  if (maxConcurrent > 0) {
    const userActiveTasks = await db
      .select({ id: tasksTable.id })
      .from(tasksTable)
      .where(and(
        eq(tasksTable.userId, user.id),
        inArray(tasksTable.status, ["pending","assigned","on_the_way","at_location","in_progress","waiting_started"])
      ));
    if (userActiveTasks.length >= maxConcurrent) {
      res.status(429).json({ error: `Maximum ${maxConcurrent} concurrent tasks allowed. Complete or cancel existing tasks first.`, activeTasks: userActiveTasks.length, limit: maxConcurrent });
      return;
    }
  }

  try {
    const {
      category, description, urgency = "normal",
      locationName, locationArea, locationCity = "Ahmedabad",
      locationLat, locationLng, distanceBand = "0-2",
      scheduledDate, scheduledTime,
      paymentMethod = "cash", couponCode, seniorInvolved = false, specialInstructions,
      // New dispatch fields
      pickupRequired = false, pickupAddress, pickupArea, pickupLat, pickupLng,
      taskLat, taskLng, fromArea, toArea, estimatedDurationMinutes,
      // Phase 7: Queue Intelligence V2
      expectedTokenNumber,
    } = req.body;

    // Fix #3: Validate coordinates before processing
    const coordErrors: string[] = [];
    if (locationLat != null && locationLat !== "" && !isValidCoordinate(locationLat, "lat")) coordErrors.push("locationLat");
    if (locationLng != null && locationLng !== "" && !isValidCoordinate(locationLng, "lng")) coordErrors.push("locationLng");
    if (taskLat != null && taskLat !== "" && !isValidCoordinate(taskLat, "lat")) coordErrors.push("taskLat");
    if (taskLng != null && taskLng !== "" && !isValidCoordinate(taskLng, "lng")) coordErrors.push("taskLng");
    if (pickupLat != null && pickupLat !== "" && !isValidCoordinate(pickupLat, "lat")) coordErrors.push("pickupLat");
    if (pickupLng != null && pickupLng !== "" && !isValidCoordinate(pickupLng, "lng")) coordErrors.push("pickupLng");
    if (coordErrors.length > 0) {
      res.status(400).json({ error: "Invalid coordinates", fields: coordErrors });
      return;
    }

    // Fix #9: Input sanitization
    const sanitizedDescription = description?.trim();
    const sanitizedSpecialInstructions = specialInstructions?.trim();
    const sanitizedLocationName = locationName?.trim();
    const sanitizedLocationArea = locationArea?.trim();

    // Phase 6: Revenue Engine pricing
    const revenueConfig = await getRevenueConfig();
    const priorityLevel = req.body.priorityLevel || "normal";
    const basePriceVal = CATEGORY_PRICES[category] ?? 149;
    const distanceChargeVal = DISTANCE_CHARGES[distanceBand] ?? 0;
    const urgencyChargeVal = urgency === "urgent" ? 50 : 0;
    const priorityFee = getPriorityFee(priorityLevel, revenueConfig);
    const urgencyMultiplier = getUrgencyMultiplier(urgency, revenueConfig);
    const revenue = calculateTaskRevenue({
      basePrice: basePriceVal,
      distanceCharge: distanceChargeVal,
      urgencyCharge: urgencyChargeVal,
      waitingChargeAmount: 0,
      priorityFee,
      urgencyMultiplier,
      runnerPayoutPercent: 70,
    });
    let discountAmount = 0;
    let finalPrice = revenue.price;
    if (couponCode?.toUpperCase() === "GOLINELESS10") {
      discountAmount = Math.round(revenue.price * 0.1);
      finalPrice -= discountAmount;
    }
    const finalRunnerEarning = Math.round(finalPrice * 0.7);
    const finalPlatformFee = finalPrice - finalRunnerEarning;

    const otp = generateAuthOtp();
    // L5: Hash OTP before storing in DB (SHA-256)
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    let scheduledAt: Date | undefined;
    if (scheduledDate && scheduledTime) {
      scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
    }

    const initTimeline = [makeTimelineEntry("pending", "Task created by client")];
    const initTimelineTs = new Date();

    const [task] = await db.insert(tasksTable).values({
      userId: user.id, category, description: sanitizedDescription || description, urgency,
      locationName: sanitizedLocationName || locationName,
      locationArea: sanitizedLocationArea || locationArea,
      locationCity,
      locationLat: locationLat?.toString(), locationLng: locationLng?.toString(),
      distanceBand, scheduledAt,
      basePrice: basePriceVal.toString(), distanceCharge: distanceChargeVal.toString(),
      urgencyCharge: urgencyChargeVal.toString(), price: finalPrice.toString(),
      runnerEarning: finalRunnerEarning.toString(), platformFee: finalPlatformFee.toString(),
      paymentMethod, couponCode, discountAmount: discountAmount.toString(),
      seniorInvolved, specialInstructions: sanitizedSpecialInstructions || specialInstructions, otp: otpHash, otpExpiresAt: new Date(Date.now() + 30 * 60 * 1000), status: "pending",
      priorityLevel, priorityFee: priorityFee.toString(),
      waitingChargeAmount: "0", waitingEarnings: "0", bonusEarnings: "0",
      // New dispatch fields
      pickupRequired, pickupAddress, pickupArea,
      pickupLat: pickupLat?.toString(), pickupLng: pickupLng?.toString(),
      taskLat: taskLat?.toString(), taskLng: taskLng?.toString(),
      fromArea, toArea, estimatedDurationMinutes: estimatedDurationMinutes ?? undefined,
      expectedTokenNumber,
      tokenNumber: expectedTokenNumber,
      taskTimeline: initTimeline,
    }).returning();

    // Dual-write: insert timeline event into normalized table
    recordTimelineEvent(task.id, "pending", "Task created by client", initTimelineTs);

    // Generate invoice number after insert (task.id is now available)
    const invoiceNumber = generateInvoiceNumber(task.id);
    await db.update(tasksTable).set({ invoiceNumber }).where(eq(tasksTable.id, task.id));

    // [OFFLINE MODE] Razorpay order creation disabled for pilot — all tasks are cash-on-completion
    // Uncomment below to re-enable online payment order creation:
    // let paymentOrder: Record<string, unknown> | null = null;
    // if (paymentMethod === "online" && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    //   const amountPaise = Math.round(Number(finalPrice) * 100);
    //   paymentOrder = await createOrder(amountPaise, "INR", invoiceNumber, {
    //     taskId: String(task.id),
    //     userId: String(user.id),
    //   });
    // }

    // Notify user via Socket.IO
    getIo().to(`user_${user.id}`).emit("task_booked", { taskId: task.id });

    // Smart Dispatch: find nearby comrades and notify in waves
    const dispatchResult = await startSmartDispatch(task.id);

    // Create notification for the user
    await db.insert(notificationsTable).values({
      userId: user.id, type: "task_booked",
      title: "Task Booked!",
      message: `Your ${category} task has been dispatched to ${dispatchResult.comradesInRadius} nearby Comrades. Share OTP only when task is complete.`,
      taskId: task.id,
    });

    const enriched = await getTaskWithRelations(task.id);
    // [OFFLINE MODE] No payment order returned — tasks are cash-on-completion
    // Uncomment below to re-enable payment order in response:
    res.status(201).json({
      ...enriched,
      paymentOrder: null,
      // paymentOrder: paymentOrder
      //   ? {
      //       orderId: paymentOrder.id,
      //       amount: paymentOrder.amount,
      //       currency: paymentOrder.currency,
      //       keyId: process.env.RAZORPAY_KEY_ID,
      //     }
      //   : null,
    });
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    const errCode = err && typeof err === "object" ? (err as Record<string, unknown>).code as string | undefined : undefined;
    logger.error({ err: e, code: errCode }, "Booking error");
    res.status(500).json({
      error: "Booking failed",
      detail: e.message || "Unknown error",
      code: errCode || e.name || "INTERNAL_ERROR",
    });
  }
});

// GET /tasks/:id
router.get("/tasks/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) { res.status(401).json({ error: "Authentication required" }); return; }

  // Check admin token first
  const admin = await resolveAdmin(token);
  if (admin) {
    const task = await getTaskWithRelations(id);
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }
    res.json(task);
    return;
  }

  // Check user token
  const user = await getUserFromToken(token);
  if (user) {
    const task = await getTaskWithRelations(id);
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }
    if (task.userId !== user.id) { res.status(403).json({ error: "You can only access your own tasks" }); return; }
    res.json(task);
    return;
  }

  // Check runner token
  const runner = await getRunnerFromToken(token);
  if (runner) {
    const task = await getTaskWithRelations(id);
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }
    // Runners can view tasks assigned to them or pending tasks (for available feed)
    if (task.runnerId !== runner.id && task.status !== "pending") {
      res.status(403).json({ error: "You can only access tasks assigned to you" }); return;
    }
    res.json(task);
    return;
  }

  res.status(401).json({ error: "Invalid or expired token" });
});

// PATCH /tasks/:id/status
router.patch("/tasks/:id/status", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const token = extractToken(req);
  const isAdmin = !!(token && await resolveAdmin(token));

  let runnerId: number | null = null;
  if (!isAdmin) {
    if (!token) { res.status(401).json({ error: "Authentication required" }); return; }
    const runner = await getRunnerFromToken(token);
    if (!runner) { res.status(401).json({ error: "Unauthorized" }); return; }
    runnerId = runner.id;
    req.runner = runner;
  }

  const { status } = req.body;

  const [existing] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!existing) { res.status(404).json({ error: "Task not found" }); return; }

  if (!isAdmin && runnerId && existing.runnerId !== runnerId) {
    res.status(403).json({ error: "You can only update tasks assigned to you" }); return;
  }

  // CRITICAL FIX 1: Validate state machine transition
  const transition = validateTimelineTransition(existing.status, status);
  if (!transition.valid) {
    // Store fraud flag for invalid transition attempt
    const fraudEntry = JSON.stringify({
      type: "invalid_status_transition",
      taskId: id,
      fromStatus: existing.status,
      toStatus: status,
      reason: transition.reason,
      timestamp: new Date().toISOString(),
    });
    const existingFlags = Array.isArray(existing.fraudFlags) ? existing.fraudFlags : [];
    await db.update(tasksTable).set({
      fraudFlags: [...existingFlags, fraudEntry],
    }).where(eq(tasksTable.id, id));

    // Dual-write: record fraud flag in normalized table
    recordFraudFlag({ taskId: id, type: "invalid_status_transition", fromStatus: existing.status, toStatus: status, reason: transition.reason || undefined });

    getIo().to("admin_fleet").emit("fraud_alert", {
      type: "invalid_status_transition",
      taskId: id,
      fromStatus: existing.status,
      toStatus: status,
      message: transition.reason,
    });

    res.status(400).json({ error: "Invalid task status transition", detail: transition.reason });
    return;
  }

  const updates: Record<string, unknown> = { status };
  const timelineEntries: string[] = existing.taskTimeline ? [...existing.taskTimeline] : [];

  const now = new Date();

  // Set timestamps based on status
  const statusTimestamps: Record<string, string> = {
    started: "startedAt",
    reached_pickup: "reachedPickupAt",
    reached_task_location: "reachedTaskLocationAt",
    completed: "completedAt",
    assigned: "acceptedAt",
  };
  if (statusTimestamps[status]) {
    updates[statusTimestamps[status]] = now;
  }

  // If completing, also set completedAt
  if (status === "completed") {
    updates.completedAt = now;
  }

  // If cancelling, stop dispatch and notify comrades
  if (status === "cancelled") {
    cancelDispatch(id);
    getIo().to("comrades_room").emit("task_cancelled", { taskId: id });
  }

  // Add timeline entry
  const timelineLabels: Record<string, string> = {
    assigned: "Comrade accepted the task",
    on_the_way: "Comrade started travel",
    reached_pickup: "Comrade reached pickup location",
    reached_task_location: "Comrade reached task location",
    in_progress: "Task started",
    completed: "Task completed",
    cancelled: "Task cancelled",
    at_location: "Comrade at location",
  };
  timelineEntries.push(makeTimelineEntry(status, timelineLabels[status] || `Status: ${status}`));
  updates.taskTimeline = timelineEntries;

  // Dual-write: record timeline event in normalized table
  recordTimelineEvent(id, status, timelineLabels[status] || `Status: ${status}`, now);

  const [task] = await db.update(tasksTable).set(updates).where(eq(tasksTable.id, id)).returning();
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }

  // Notify user
  const notifMessages: Record<string, string> = {
    assigned: "A Comrade has accepted your task! They are on the way.",
    on_the_way: "Your Comrade is on the way!",
    reached_pickup: "Your Comrade has reached the pickup location.",
    reached_task_location: "Your Comrade has reached the task location.",
    at_location: "Your Comrade has arrived at the location!",
    in_progress: "Your Comrade has started the task.",
    completed: "Your task has been completed!",
    cancelled: "Your task has been cancelled.",
  };
  if (notifMessages[status] && task.userId) {
    await db.insert(notificationsTable).values({
      userId: task.userId, type: `task_${status}`,
      title: "Task Update", message: notifMessages[status], taskId: task.id,
    });
  }

  // Broadcast via Socket.IO
  getIo().to(`task_${id}`).emit("task_status_changed", { taskId: id, status, timestamp: now.toISOString() });
  getIo().to("admin_fleet").emit("task_status_changed", { taskId: id, status, timestamp: now.toISOString() });

  const enriched = await getTaskWithRelations(task.id);
  res.json(enriched);
});

// POST /tasks/:id/proof-photo
router.post("/tasks/:id/proof-photo", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { imageUrl, proofType, lat, lng, address } = req.body;

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  if (task.runnerId !== runner.id) { res.status(403).json({ error: "Not assigned to this task" }); return; }

  // Fix #3: Validate proof photo coordinates
  if (lat != null && lng != null) {
    if (!isValidCoordinate(lat, "lat") || !isValidCoordinate(lng, "lng")) {
      res.status(400).json({ error: "Invalid GPS coordinates in proof photo" });
      return;
    }
    // Phase 7: GPS Validation — verify comrade is within allowed radius of task location
    const taskLat = task.taskLat || task.locationLat;
    const taskLng = task.taskLng || task.locationLng;
    const gpsResult = await validateGpsForProof(Number(lat), Number(lng), taskLat ? Number(taskLat) : null, taskLng ? Number(taskLng) : null);
    if (!gpsResult.valid) {
      // HIGH FIX 1: Store fraud flag for GPS validation failure
      const gpsFraudEntry = JSON.stringify({
        type: "gps_validation_failed",
        taskId: id, runnerId: runner.id,
        distanceMeters: gpsResult.distanceMeters,
        maxAllowed: gpsResult.radius,
        timestamp: new Date().toISOString(),
      });
      const existingFlags = Array.isArray(task.fraudFlags) ? task.fraudFlags : [];
      await db.update(tasksTable).set({
        fraudFlags: [...existingFlags, gpsFraudEntry],
      }).where(eq(tasksTable.id, id));

      // Dual-write: record GPS fraud flag in normalized table
      recordFraudFlag({ taskId: id, runnerId: runner.id, type: "gps_validation_failed", distanceMeters: gpsResult.distanceMeters, maxAllowed: gpsResult.radius });

      res.status(400).json({
        error: "Location verification failed",
        detail: `You are ${gpsResult.distanceMeters}m from the task location (max allowed: ${gpsResult.radius}m)`,
        gpsVerified: false,
        gpsDistanceFromTask: gpsResult.distanceMeters,
      });
      return;
    }
    // Store GPS verification result
    await db.update(tasksTable).set({
      gpsVerified: true,
      gpsDistanceFromTask: gpsResult.distanceMeters,
    }).where(eq(tasksTable.id, id));
  }

  // Fix #6: Enforce max photos per task to prevent unbounded array growth
  const existingPhotos = task.proofPhotos || [];
  if (existingPhotos.length >= MAX_PROOF_PHOTOS_PER_TASK) {
    res.status(400).json({ error: `Maximum ${MAX_PROOF_PHOTOS_PER_TASK} proof photos per task reached. Please contact admin if you need more.`, currentCount: existingPhotos.length, maxAllowed: MAX_PROOF_PHOTOS_PER_TASK });
    return;
  }
  const { isDuplicate, existingCount } = detectDuplicateProof(existingPhotos, proofType || "general");
  if (isDuplicate) {
    logger.warn({ taskId: id, runnerId: runner.id, proofType, existingCount }, "Duplicate proof upload detected");
    getIo().to("admin_fleet").emit("fraud_alert", {
      type: "duplicate_proof",
      taskId: id, runnerId: runner.id,
      proofType, count: existingCount,
      message: `Suspicious: ${existingCount}+ ${proofType} photos uploaded by runner ${runner.name || runner.id}`,
    });
    // HIGH FIX 1: Store fraud flag on DB
    const fraudEntry = JSON.stringify({
      type: "duplicate_proof",
      taskId: id, runnerId: runner.id,
      proofType, count: existingCount,
      timestamp: new Date().toISOString(),
    });
    const existingFlags = Array.isArray(task.fraudFlags) ? task.fraudFlags : [];
    await db.update(tasksTable).set({
      fraudFlags: [...existingFlags, fraudEntry],
    }).where(eq(tasksTable.id, id));

    // Dual-write: record duplicate proof fraud flag in normalized table
    recordFraudFlag({ taskId: id, runnerId: runner.id, type: "duplicate_proof", proofType: proofType || "general", duplicateCount: existingCount });
  }

  // Persist proof photo: prefer cloud storage (B2) when configured,
  // otherwise fall back to local disk (ephemeral — dev only).
  let savedImageUrl = imageUrl || "";
  if (savedImageUrl && savedImageUrl.startsWith("data:image/")) {
    const matches = savedImageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (matches) {
      const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
      const data = Buffer.from(matches[2], "base64");
      const filename = `proof_${id}_${proofType || "general"}_${Date.now()}.${ext}`;

      let stored = false;
      if (isB2Configured) {
        const result = await uploadFile(data, filename, "proofs");
        if (result) {
          savedImageUrl = result.url;
          stored = true;
        } else {
          logger.error({ taskId: id, filename }, "B2 proof upload failed — falling back to local disk");
        }
      }
      // Fall back to local disk when B2 is unconfigured or the upload failed.
      // Never persist the raw base64 payload in the DB.
      if (!stored) {
        try {
          const uploadsDir = path.join(__dirname, "..", "..", "uploads");
          if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
          fs.writeFileSync(path.join(uploadsDir, filename), data);
          savedImageUrl = `/uploads/${filename}`;
        } catch (e) {
          logger.error({ err: e }, "Failed to save photo to disk");
          savedImageUrl = "";
        }
      }
    }
  }

  // Build proof entry
  const proofEntry = JSON.stringify({
    id: Date.now() + Math.random(),
    taskId: id,
    runnerId: runner.id,
    proofType: proofType || "general",
    imageUrl: savedImageUrl,
    timestamp: new Date().toISOString(),
    lat: lat || null,
    lng: lng || null,
    address: address || null,
    taskStatus: task.status,
    uploadedBy: runner.name || "Comrade",
    gpsVerified: lat != null && lng != null, // Will be true if we passed validation above
  });

  const updatedPhotos = [...existingPhotos, proofEntry];

  // Add timeline entry
  const timelineEntries = task.taskTimeline ? [...task.taskTimeline] : [];
  const proofLabelMap: Record<string, string> = {
    reached_pickup: "Comrade uploaded pickup proof photo",
    reached_task_location: "Comrade uploaded location proof photo",
    in_progress: "Comrade uploaded progress proof photo",
    completed: "Comrade uploaded completion proof photo",
    general: "Comrade uploaded proof photo",
  };
  timelineEntries.push(makeTimelineEntry("proof_photo", proofLabelMap[proofType] || proofLabelMap.general, { proofType }));

  const [updated] = await db.update(tasksTable).set({
    proofPhotos: updatedPhotos,
    taskTimeline: timelineEntries,
  }).where(eq(tasksTable.id, id)).returning();

  // Dual-write: record proof photo and timeline event in normalized tables
  recordProofPhoto({ taskId: id, runnerId: runner.id, proofType: proofType || "general", imageUrl: savedImageUrl, lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined, address: address || undefined, taskStatus: task.status, uploadedBy: runner.name || "Comrade", gpsVerified: lat != null && lng != null });
  const proofTs = new Date();
  recordTimelineEvent(id, "proof_photo", proofLabelMap[proofType] || proofLabelMap.general, proofTs, { proofType });

  // Broadcast to all viewers
  getIo().to(`task_${id}`).emit("new_proof_photo", {
    taskId: id,
    proof: JSON.parse(proofEntry),
  });
  getIo().to("admin_fleet").emit("new_proof_photo", {
    taskId: id,
    proof: JSON.parse(proofEntry),
  });

  // Notify user
  if (task.userId) {
    await db.insert(notificationsTable).values({
      userId: task.userId, type: "proof_photo",
      title: "Proof Photo Uploaded",
      message: `Your Comrade uploaded a ${proofLabelMap[proofType] || "proof"} photo.`,
      taskId: task.id,
    });
  }

  res.json({ ...updated, proofPhotos: updatedPhotos });
});

// POST /tasks/:id/accept
router.post("/tasks/:id/accept", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const now = new Date();

  // C7 FIX: Reject acceptance if runner KYC is not verified or dispatch-allowed
  if (runner.kycStatus !== "verified" && !runner.dispatchAllowed) {
    res.status(403).json({ error: "KYC verification required to accept tasks. Please complete your identity verification first." });
    return;
  }

  // HIGH FIX 3: Duplicate acceptance protection — check if runner already has an active task
  const existingActive = await db
    .select({ id: tasksTable.id })
    .from(tasksTable)
    .where(and(
      eq(tasksTable.runnerId, runner.id),
      inArray(tasksTable.status, ["assigned","on_the_way","at_location","in_progress","waiting_started"])
    ))
    .limit(1);
  if (existingActive.length > 0) {
    res.status(400).json({ error: "You already have an active task. Complete it first before accepting a new one." });
    return;
  }

  // Also check that no other runner is already assigned to this task
  const [currentTask] = await db
    .select({ id: tasksTable.id, runnerId: tasksTable.runnerId, status: tasksTable.status })
    .from(tasksTable)
    .where(eq(tasksTable.id, id));
  if (!currentTask || currentTask.status !== "pending") {
    res.status(409).json({ error: "This task is no longer available. Another Comrade may have accepted it." });
    return;
  }
  if (currentTask.runnerId && currentTask.runnerId !== runner.id) {
    res.status(409).json({ error: "This task is already assigned to another Comrade." });
    return;
  }

  const [task] = await db
    .update(tasksTable)
    .set({
      runnerId: runner.id,
      activeRunnerId: runner.id,
      status: "assigned",
      acceptedAt: now,
      taskTimeline: [
        makeTimelineEntry("assigned", `${runner.name || "A Comrade"} accepted the task`, { runnerId: runner.id }),
      ],
    })
    .where(and(eq(tasksTable.id, id), eq(tasksTable.status, "pending")))
    .returning();

  if (!task) { res.status(404).json({ error: "Task not found or already taken" }); return; }

  // Dual-write: record timeline event in normalized table
  recordTimelineEvent(id, "assigned", `${runner.name || "A Comrade"} accepted the task`, now, { runnerId: runner.id });

  // Notify user
  if (task.userId) {
    await db.insert(notificationsTable).values({
      userId: task.userId, type: "runner_assigned",
      title: "Comrade Assigned!",
      message: `${runner.name ?? "A Comrade"} has been assigned to your task. They'll be there shortly!`,
      taskId: task.id,
    });

    // Real-time notification to user
    getIo().to(`user_${task.userId}`).emit("task_accepted", {
      taskId: task.id,
      runner: { id: runner.id, name: runner.name, phone: runner.phone, rating: runner.rating ? Number(runner.rating) : null },
    });

    // Fix #61: Send email notification to user when runner accepts
    const [userData] = await db.select({ email: usersTable.email, name: usersTable.name }).from(usersTable).where(eq(usersTable.id, task.userId));
    if (userData?.email) {
      sendEmail({
        to: userData.email,
        subject: `Comrade Assigned — Task #${id}`,
        htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#0F2557">Go LineLess — Comrade Assigned</h2>
          <p>Hi ${escapeHtml(userData.name) || "there"},</p>
          <p>A Comrade has accepted your task. They'll be there shortly!</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold">Task ID</td><td style="padding:8px;border-bottom:1px solid #eee">#${id}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold">Category</td><td style="padding:8px;border-bottom:1px solid #eee">${task.category}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold">Comrade</td><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(runner.name) || "A Comrade"}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold">Status</td><td style="padding:8px;border-bottom:1px solid #eee;color:#16A34A">Assigned — On the way</td></tr>
          </table>
          <p style="font-size:13px;color:#666">Track your runner in the app. Share the OTP only after the task is complete.</p>
          <p style="font-size:12px;color:#999">Go LineLess · Life Without Waiting</p>
        </div>`,
      }).catch((e: Error) => logger.warn({ err: e }, "Brevo assignment email failed"));
    }
  }

  // B1 FIX: Increment tasksAccepted counter on the runner profile
  await db.update(runnersTable).set({
    isOnline: true,
    tasksAccepted: sql`${runnersTable.tasksAccepted} + 1`,
  }).where(eq(runnersTable.id, runner.id));

  // Cancel any pending dispatch waves
  cancelDispatch(task.id);

  // Broadcast to all comrades that this task is no longer available
  getIo().to("comrades_room").emit("task_taken", { taskId: id, runnerId: runner.id });

  // Notify admin with dispatch metrics
  const timeToAccept = Math.round((now.getTime() - new Date(task.createdAt).getTime()) / 1000);
  getIo().to("admin_fleet").emit("task_accepted", {
    taskId: id, runnerId: runner.id,
    runnerName: runner.name || "Comrade",
    timeToAcceptance: timeToAccept,
    dispatchAttempts: task.dispatchAttempts,
    dispatchRadiusUsed: task.dispatchRadiusUsed,
    dispatchNotifiedCount: task.dispatchNotifiedCount,
  });

  // Update time-to-acceptance metric
  await db.update(tasksTable).set({ timeToAcceptance: timeToAccept }).where(eq(tasksTable.id, id));

  const enriched = await getTaskWithRelations(task.id);
  res.json(enriched);
});

// POST /tasks/:id/confirm-cash — Runner confirms cash payment received from user
// (#1) Adds 24hr dispute window: paymentStatus goes to "cash_pending" first, auto-finalizes after 24h
// (#10) Uses atomic UPDATE WHERE to prevent race conditions
// (#19) Logs to payment_audit_log
// (#23) Rate limited via confirm-cash limiter in app.ts
router.post("/tasks/:id/confirm-cash", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

  // M6 FIX: Validate task is in an active status for cash confirmation
  const [preCheck] = await db.select({ status: tasksTable.status, paymentMethod: tasksTable.paymentMethod, paymentStatus: tasksTable.paymentStatus, runnerId: tasksTable.runnerId }).from(tasksTable).where(eq(tasksTable.id, id));
  if (!preCheck) { res.status(404).json({ error: "Task not found" }); return; }
  if (preCheck.runnerId !== runner.id) { res.status(403).json({ error: "Not assigned to this task" }); return; }
  if (preCheck.paymentMethod !== "cash") { res.status(400).json({ error: "Cash confirmation only available for cash payment tasks" }); return; }
  if (!["in_progress", "waiting_started", "at_location"].includes(preCheck.status)) {
    res.status(400).json({ error: "Cash can only be confirmed when task is in progress" }); return;
  }

  // Only allowed for cash payment tasks that haven't been paid yet
  // (#10) Atomic UPDATE WHERE prevents race conditions between concurrent requests
  const [updated] = await db
    .update(tasksTable)
    .set({
      paymentStatus: "cash_pending",
      paymentConfirmedBy: runner.id,
      paymentConfirmedAt: new Date(),
    })
    .where(and(
      eq(tasksTable.id, id),
      eq(tasksTable.paymentMethod, "cash"),
      eq(tasksTable.paymentStatus, "pending"),
    ))
    .returning();

  if (!updated) {
    // Check if it was already confirmed
    const [existing] = await db.select({ paymentStatus: tasksTable.paymentStatus, runnerId: tasksTable.runnerId }).from(tasksTable).where(eq(tasksTable.id, id));
    if (!existing) { res.status(404).json({ error: "Task not found" }); return; }
    if (existing.runnerId !== runner.id) { res.status(403).json({ error: "Not assigned to this task" }); return; }
    if (existing.paymentStatus === "cash_pending" || existing.paymentStatus === "paid") {
      res.json({ paymentStatus: existing.paymentStatus, message: "Cash payment already confirmed" }); return;
    }
    res.status(400).json({ error: "Cash confirmation only available for cash payment tasks with pending payment" }); return;
  }

  const now = new Date();
  const timelineEntries = updated.taskTimeline ? [...updated.taskTimeline] : [];
  timelineEntries.push(makeTimelineEntry("cash_pending", `Cash payment of Rs ${updated.price} confirmed by Comrade ${runner.name || runner.id} — 24hr dispute window active`, { runnerId: runner.id, amount: updated.price }));

  await db.update(tasksTable).set({ taskTimeline: timelineEntries }).where(eq(tasksTable.id, id));

  // Dual-write: record timeline event in normalized table
  recordTimelineEvent(id, "cash_pending", `Cash payment of Rs ${updated.price} confirmed by Comrade ${runner.name || runner.id} — 24hr dispute window active`, now, { runnerId: runner.id, amount: updated.price });

  // (#19) Log to payment audit trail
  await db.insert(paymentAuditLogTable).values({
    taskId: id,
    previousStatus: "pending",
    newStatus: "cash_pending",
    actor: `runner:${runner.id}`,
    actorType: "runner",
    reason: "Runner confirmed cash received",
    metadata: JSON.stringify({ amount: updated.price, runnerId: runner.id, disputeWindowHours: 24 }),
  });

  // (#25) Send email receipt to user via Brevo + (#33) SMS receipt via Twilio
  if (updated.userId) {
    const [userData] = await db.select({ email: usersTable.email, name: usersTable.name, phone: usersTable.phone }).from(usersTable).where(eq(usersTable.id, updated.userId));
    if (userData?.email) {
      sendEmail({
        to: userData.email,
        subject: `Payment Receipt — Task #${id}`,
        htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#0F2557">Go LineLess — Payment Receipt</h2>
          <p>Hi ${escapeHtml(userData.name) || "there"},</p>
          <p>${escapeHtml(runner.name) || "Your Comrade"} has confirmed receiving cash payment for your task.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold">Task ID</td><td style="padding:8px;border-bottom:1px solid #eee">#${id}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold">Category</td><td style="padding:8px;border-bottom:1px solid #eee">${updated.category}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold">Amount</td><td style="padding:8px;border-bottom:1px solid #eee">Rs ${updated.price}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold">Invoice</td><td style="padding:8px;border-bottom:1px solid #eee">${updated.invoiceNumber || "N/A"}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold">Payment Method</td><td style="padding:8px;border-bottom:1px solid #eee">Cash</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold">Status</td><td style="padding:8px;border-bottom:1px solid #eee;color:#F59E0B">Pending confirmation (24hr dispute window)</td></tr>
          </table>
          <p style="font-size:13px;color:#666">Please confirm within 24 hours or dispute if incorrect.</p>
          <p style="font-size:12px;color:#999">Go LineLess · Life Without Waiting</p>
        </div>`,
      }).catch((e: Error) => logger.warn({ err: e }, "Brevo email send failed"));
    }
    // (#33) Send SMS receipt
    if (userData?.phone) {
      sendPaymentReceiptSms({
        phone: userData.phone,
        taskId: id,
        amount: updated.price,
        runnerName: runner.name || "Comrade",
        invoiceNumber: updated.invoiceNumber,
        category: updated.category,
      }).catch(() => {});
    }

    // Notify user via socket — ask them to confirm within 24hrs
    getIo().to(`user_${updated.userId}`).emit("cash_payment_confirmed", {
      taskId: id,
      amount: updated.price,
      runnerName: runner.name || "Comrade",
      disputeWindowHours: 24,
      timestamp: now.toISOString(),
    });

    // In-app notification with dispute prompt
    await db.insert(notificationsTable).values({
      userId: updated.userId,
      type: "payment_received",
      title: "Cash Payment Confirmed",
      message: `${runner.name || "Your Comrade"} confirmed receiving Rs ${updated.price} in cash for Task #${id}. Please confirm within 24 hours or dispute if incorrect.`,
      taskId: id,
    });
  }

  // Notify admin fleet
  getIo().to("admin_fleet").emit("cash_payment_confirmed", {
    taskId: id,
    runnerId: runner.id,
    runnerName: runner.name || "Comrade",
    amount: updated.price,
  });

  logger.info({ taskId: id, runnerId: runner.id, amount: updated.price }, "Cash payment confirmed by runner — 24hr dispute window active");
  res.json({ paymentStatus: "cash_pending", message: "Cash payment confirmed. User has 24 hours to dispute.", amount: Number(updated.price) });
});

// POST /tasks/:id/confirm-cash-user — User confirms or disputes cash payment
router.post("/tasks/:id/confirm-cash-user", requireUser, async (req, res): Promise<void> => {
  const user = req.user!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { action, disputeReason } = req.body; // action: "confirm" | "dispute"

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  if (task.userId !== user.id) { res.status(403).json({ error: "Not your task" }); return; }
  if (task.paymentStatus !== "cash_pending") {
    res.status(400).json({ error: "No pending cash payment to confirm or dispute" }); return;
  }

  const now = new Date();
  const timelineEntries = task.taskTimeline ? [...task.taskTimeline] : [];

  if (action === "confirm") {
    // User confirms payment — finalize
    timelineEntries.push(makeTimelineEntry("cash_confirmed", `Cash payment of Rs ${task.price} confirmed by user`, { userId: user.id, amount: task.price }));
    // (#12) Track paid amount for partial payment support
    await db.update(tasksTable).set({ paymentStatus: "paid", paidAmount: task.price, taskTimeline: timelineEntries }).where(eq(tasksTable.id, id));

    // Dual-write: record timeline event in normalized table
    recordTimelineEvent(id, "cash_confirmed", `Cash payment of Rs ${task.price} confirmed by user`, now, { userId: user.id, amount: task.price });

    await db.insert(paymentAuditLogTable).values({
      taskId: id, previousStatus: "cash_pending", newStatus: "paid",
      actor: `user:${user.id}`, actorType: "user", reason: "User confirmed cash payment",
      metadata: JSON.stringify({ amount: task.price }),
    });

    // Notify runner
    if (task.runnerId) {
      await db.insert(notificationsTable).values({
        runnerId: task.runnerId, type: "payment_confirmed", title: "Payment Confirmed",
        message: `User confirmed receiving Rs ${task.price} cash for Task #${id}.`, taskId: id,
      });
    }

    res.json({ paymentStatus: "paid", message: "Payment confirmed" });
  } else if (action === "dispute") {
    // User disputes — revert to pending, flag for admin review
    timelineEntries.push(makeTimelineEntry("cash_disputed", `Cash payment disputed by user: ${disputeReason || "No reason provided"}`, { userId: user.id, disputeReason }));
    await db.update(tasksTable).set({ paymentStatus: "pending", taskTimeline: timelineEntries }).where(eq(tasksTable.id, id));

    // Dual-write: record timeline event in normalized table
    recordTimelineEvent(id, "cash_disputed", `Cash payment disputed by user: ${disputeReason || "No reason provided"}`, now, { userId: user.id, disputeReason });

    await db.insert(paymentAuditLogTable).values({
      taskId: id, previousStatus: "cash_pending", newStatus: "pending",
      actor: `user:${user.id}`, actorType: "user", reason: "User disputed cash payment",
      metadata: JSON.stringify({ disputeReason: disputeReason || "No reason provided", amount: task.price }),
    });

    // Notify admin
    getIo().to("admin_fleet").emit("payment_disputed", {
      taskId: id, userId: user.id, runnerId: task.runnerId,
      amount: task.price, disputeReason: disputeReason || "No reason provided",
    });

    res.json({ paymentStatus: "pending", message: "Payment disputed. Admin will review." });
  } else {
    res.status(400).json({ error: "action must be 'confirm' or 'dispute'" });
  }
});

// POST /tasks/:id/refund — Admin-only refund for confirmed payments (#11)
router.post("/tasks/:id/refund", requireUser, async (req, res): Promise<void> => {
  const token = extractToken(req);
  const isAdmin = !!(token && await resolveAdmin(token));
  if (!isAdmin) { res.status(401).json({ error: "Admin only" }); return; }

  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { reason } = req.body;

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  if (task.paymentStatus !== "paid" && task.paymentStatus !== "cash_pending") {
    res.status(400).json({ error: "Task payment is not in a refundable state" }); return;
  }

  const previousStatus = task.paymentStatus;
  const timelineEntries = task.taskTimeline ? [...task.taskTimeline] : [];
  timelineEntries.push(makeTimelineEntry("refunded", `Payment refunded by admin: ${reason || "No reason"}`, { amount: task.price }));

  await db.update(tasksTable).set({ paymentStatus: "refunded", taskTimeline: timelineEntries }).where(eq(tasksTable.id, id));

  // Dual-write: record timeline event in normalized table
  recordTimelineEvent(id, "refunded", `Payment refunded by admin: ${reason || "No reason"}`, new Date(), { amount: task.price });

  await db.insert(paymentAuditLogTable).values({
    taskId: id, previousStatus, newStatus: "refunded",
    actor: "admin", actorType: "admin", reason: reason || "Admin refund",
    metadata: JSON.stringify({ amount: task.price, refundBy: "admin" }),
  });

  // Notify user
  if (task.userId) {
    await db.insert(notificationsTable).values({
      userId: task.userId, type: "payment_refunded", title: "Payment Refunded",
      message: `Your payment of Rs ${task.price} for Task #${id} has been refunded.`, taskId: id,
    });
  }

  res.json({ paymentStatus: "refunded", message: "Payment refunded" });
});

// POST /tasks/:id/verify-otp
router.post("/tasks/:id/verify-otp", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { otp } = req.body;

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  if (task.runnerId !== runner.id) { res.status(403).json({ error: "Not assigned to this task" }); return; }

  // C5 FIX: Handle already-completed tasks gracefully
  if (task.status === "completed") {
    res.json({ message: "Task already completed", alreadyCompleted: true });
    return;
  }

  // Validate state machine transition — can only complete from in_progress
  const stateTransition = validateTimelineTransition(task.status, "completed");
  if (!stateTransition.valid) {
    res.status(400).json({ error: "Cannot complete task from current status", detail: stateTransition.reason });
    return;
  }

  // CRITICAL FIX 2: OTP brute force protection
  const otpLockedUntil = task.otpLockedUntil ? new Date(task.otpLockedUntil) : null;
  const otpExpiresAt = task.otpExpiresAt ? new Date(task.otpExpiresAt) : null;

  // Check if OTP is locked
  if (otpLockedUntil) {
    if (otpLockedUntil > new Date()) {
      const remainingMin = Math.ceil((otpLockedUntil.getTime() - Date.now()) / 60000);
      res.status(429).json({ error: `OTP locked. Try again in ${remainingMin} minutes.`, lockedUntil: otpLockedUntil });
      return;
    }
    // Lock has expired — reset attempts
    await db.update(tasksTable).set({ otpAttempts: 0, otpLockedUntil: null }).where(eq(tasksTable.id, id));
  }

  // Check if OTP has expired (30 min)
  if (otpExpiresAt && otpExpiresAt < new Date()) {
    res.status(400).json({ error: "OTP has expired. Please contact support for a new OTP." });
    return;
  }

  // L5: Compare hashed OTP
  const inputHash = crypto.createHash("sha256").update(otp).digest("hex");
  if (task.otp !== inputHash) {
    // Atomic increment + fraud flag in a single UPDATE to prevent race condition (fix #1)
    const existingFlags = Array.isArray(task.fraudFlags) ? task.fraudFlags : [];

    const [attemptCheck] = await db.update(tasksTable)
      .set({
        otpAttempts: sql`${tasksTable.otpAttempts} + 1`,
        fraudFlags: sql`array_append(${tasksTable.fraudFlags}, ${JSON.stringify({
          type: "failed_otp_attempt",
          taskId: id,
          runnerId: runner.id,
          timestamp: new Date().toISOString(),
        })}::text)`,
      })
      .where(eq(tasksTable.id, id))
      .returning({ otpAttempts: tasksTable.otpAttempts });

    // Dual-write: record failed OTP fraud flag in normalized table
    recordFraudFlag({ taskId: id, runnerId: runner.id, type: "failed_otp_attempt" });

    const newAttempts = attemptCheck?.otpAttempts ?? 0;

    // Lock after 5 failed attempts
    if (newAttempts >= 5) {
      await db.update(tasksTable).set({ otpLockedUntil: new Date(Date.now() + 30 * 60 * 1000) }).where(eq(tasksTable.id, id));

      getIo().to("admin_fleet").emit("fraud_alert", {
        type: "otp_brute_force",
        taskId: id,
        runnerId: runner.id,
        attempts: newAttempts,
        message: `OTP brute force detected: ${newAttempts} failed attempts by runner ${runner.name || runner.id}`,
      });

      res.status(429).json({ error: "Too many invalid OTP attempts. Verification locked for 30 minutes.", locked: true });
      return;
    }

    res.status(400).json({ error: "Invalid OTP", attemptsRemaining: 5 - newAttempts });
    return;
  }

  const now = new Date();
  const timelineEntries = task.taskTimeline ? [...task.taskTimeline] : [];
  timelineEntries.push(makeTimelineEntry("otp_verified", "OTP verified — task completed"));

  // Dual-write: record timeline event in normalized table
  recordTimelineEvent(id, "otp_verified", "OTP verified — task completed", now);

  // H9 FIX: For cash tasks, require confirm-cash before OTP verification.
  // If runner verifies OTP without confirming cash, set status to cash_pending
  // to preserve the 24hr dispute window.
  const reconciledPaymentStatus =
    task.paymentMethod === "cash"
      ? (task.paymentStatus === "cash_pending" || task.paymentStatus === "paid"
          ? task.paymentStatus  // Already confirmed via confirm-cash
          : "cash_pending")     // OTP verified but cash not confirmed yet
      : task.paymentStatus === "paid"
        ? "paid"
        : "pending";
  const reconciledPaidAmount = reconciledPaymentStatus === "paid" ? Number(task.price) : 0;
  if (reconciledPaymentStatus !== "paid") {
    timelineEntries.push(makeTimelineEntry("payment_pending", "Task completed — online payment not yet captured"));
    // Dual-write: record payment_pending timeline event in normalized table
    recordTimelineEvent(id, "payment_pending", "Task completed — online payment not yet captured", now);
  }

  const [updated] = await db
    .update(tasksTable)
    .set({
      otpVerified: true,
      status: "completed",
      completedAt: now,
      paymentStatus: reconciledPaymentStatus,
      paidAmount: String(reconciledPaidAmount),
      activeRunnerId: null, // Clear active runner on completion
      otpAttempts: 0,
      otpLockedUntil: null,
      taskTimeline: timelineEntries,
    })
    .where(eq(tasksTable.id, id))
    .returning();

  // (#7) Update runner earnings including waiting charges and priority fees
  const totalRunnerEarning = Number(task.runnerEarning || 0) + Number(task.waitingEarnings || 0);
  await db.update(runnersTable).set({
    totalTasks: runner.totalTasks + 1,
    tasksCompleted: sql`${runnersTable.tasksCompleted} + 1`,
    totalEarnings: (Number(runner.totalEarnings || 0) + totalRunnerEarning).toString(),
  }).where(eq(runnersTable.id, runner.id));

  // Recalculate trust score after task completion
  try {
    await updateRunnerMetrics(runner.id);
  } catch (err) {
    logger.error({ err }, "Trust score update failed");
  }

  if (task.userId) {
    await db.insert(notificationsTable).values({
      userId: task.userId, type: "task_completed",
      title: "Task Completed!",
      message: `Your task has been completed successfully. Please rate your Comrade.`,
      taskId: task.id,
    });
    // Notify user via socket
    getIo().to(`user_${task.userId}`).emit("task_completed", { taskId: id, runnerEarning: Number(task.runnerEarning) });
  }

  await db.insert(notificationsTable).values({
    runnerId: runner.id, type: "task_completed",
    title: "Task Complete!",
    message: `You earned Rs ${task.runnerEarning} for completing the task.`,
    taskId: task.id,
  });

  // Broadcast status update
  getIo().to(`task_${id}`).emit("task_status_changed", { taskId: id, status: "completed", timestamp: now.toISOString() });
  getIo().to("admin_fleet").emit("task_status_changed", { taskId: id, status: "completed", timestamp: now.toISOString() });

  const enriched = await getTaskWithRelations(updated.id);
  res.json(enriched);
});

// POST /tasks/:id/cancel
// Fix #76: Fetch task once, then authorize based on role
router.post("/tasks/:id/cancel", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) { res.status(401).json({ error: "Authentication required" }); return; }

  // Fetch task once
  const [existing] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!existing) { res.status(404).json({ error: "Task not found" }); return; }

  // Check admin
  const admin = await resolveAdmin(token);
  if (admin) {
    return cancelAndRespond(existing, id, res, "admin");
  }

  // Check user ownership
  const user = await getUserFromToken(token);
  if (user) {
    if (existing.userId !== user.id) {
      res.status(403).json({ error: "You can only cancel your own tasks" }); return;
    }
    return cancelAndRespond(existing, id, res, "user");
  }

  // Check runner ownership
  const runner = await getRunnerFromToken(token);
  if (runner) {
    if (existing.runnerId !== runner.id) {
      res.status(403).json({ error: "You can only cancel tasks assigned to you" }); return;
    }
    return cancelAndRespond(existing, id, res, "comrade");
  }

  res.status(401).json({ error: "Invalid or expired token" });
});

// Shared cancel logic (accepts optional cancelledBy for audit)
async function cancelAndRespond(existing: typeof tasksTable.$inferSelect, id: number, res: import("express").Response, cancelledBy?: string): Promise<void> {

  // HIGH FIX 2: Cancel any pending dispatch waves
  cancelDispatch(id);

  const timelineEntries = existing.taskTimeline ? [...existing.taskTimeline] : [];
  const cancelledLabel = cancelledBy ? `Task cancelled by ${cancelledBy}` : "Task cancelled";
  timelineEntries.push(makeTimelineEntry("cancelled", cancelledLabel));

  // Dual-write: record timeline event in normalized table
  recordTimelineEvent(id, "cancelled", cancelledLabel, new Date());

  const [task] = await db
    .update(tasksTable)
    .set({ status: "cancelled", activeRunnerId: null, taskTimeline: timelineEntries })
    .where(eq(tasksTable.id, id))
    .returning();

  // B2 FIX: Increment tasksCancelled counter on the assigned runner
  if (existing.runnerId) {
    await db.update(runnersTable).set({
      tasksCancelled: sql`${runnersTable.tasksCancelled} + 1`,
    }).where(eq(runnersTable.id, existing.runnerId));
    updateRunnerMetrics(existing.runnerId).catch(err => logger.error({ err }, "Trust score update failed"));
  }

  // Broadcast cancellation
  getIo().to(`task_${id}`).emit("task_status_changed", { taskId: id, status: "cancelled" });
  getIo().to("comrades_room").emit("task_cancelled", { taskId: id });
  getIo().to("admin_fleet").emit("task_status_changed", { taskId: id, status: "cancelled" });

  const enriched = await getTaskWithRelations(task.id);
  res.json(enriched);
}

// POST /tasks/:id/review
router.post("/tasks/:id/review", requireUser, validateBody(reviewSchema), async (req, res): Promise<void> => {
  const user = req.user!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { rating, review } = req.body;

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task || !task.runnerId) { res.status(404).json({ error: "Task not found" }); return; }

  // Verify the user owns this task
  if (task.userId !== user.id) {
    res.status(403).json({ error: "You can only review your own tasks" }); return;
  }

  const [rev] = await db.insert(reviewsTable).values({
    taskId: id, userId: user.id, runnerId: task.runnerId, rating, review,
  }).returning();

  // Update runner rating
  const allReviews = await db.select().from(reviewsTable).where(eq(reviewsTable.runnerId, task.runnerId));
  const avgRating = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
  await db.update(runnersTable).set({ rating: avgRating.toFixed(2) }).where(eq(runnersTable.id, task.runnerId));

  // Recalculate trust score after review submitted
  updateRunnerMetrics(task.runnerId).catch(err => logger.error({ err }, "Trust score update failed"));

  res.status(201).json(rev);
});

// POST /tasks/:id/waiting/start — Phase 6: Waiting charge calculation
router.post("/tasks/:id/waiting/start", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  if (task.runnerId !== runner.id) { res.status(403).json({ error: "Not assigned" }); return; }

  // Validate state machine transition
  const transition = validateTimelineTransition(task.status, "waiting_started");
  if (!transition.valid) {
    res.status(400).json({ error: "Cannot start waiting from current status", detail: transition.reason });
    return;
  }

  const now = new Date();
  const timeline = task.taskTimeline || [];
  timeline.push(makeTimelineEntry("waiting_started", "Comrade started waiting"));

  // Dual-write: record timeline event in normalized table
  recordTimelineEvent(id, "waiting_started", "Comrade started waiting", now);

  const [updated] = await db.update(tasksTable).set({
    waitingStartedAt: now, status: "waiting_started",
    taskTimeline: timeline,
  }).where(eq(tasksTable.id, id)).returning();
  getIo().to(`task_${id}`).emit("task_status_changed", { taskId: id, status: "waiting_started" });
  const enriched = await getTaskWithRelations(updated.id);
  res.json(enriched);
});

// POST /tasks/:id/waiting/pause — Phase 6: with waiting charge calculation
router.post("/tasks/:id/waiting/pause", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  if (task.runnerId !== runner.id) { res.status(403).json({ error: "Not assigned" }); return; }

  // Validate state machine transition
  const transition = validateTimelineTransition(task.status, "in_progress");
  if (!transition.valid) {
    res.status(400).json({ error: "Cannot pause waiting from current status", detail: transition.reason });
    return;
  }

  const now = new Date();
  const elapsedMin = task.waitingStartedAt
    ? Math.round((now.getTime() - new Date(task.waitingStartedAt).getTime()) / 60000)
    : 0;
  const totalMin = (task.totalWaitingMinutes || 0) + elapsedMin;
  // Calculate waiting charge
  const revConfig = await getRevenueConfig();
  const { waitingChargeAmount } = calculateWaitingCharge(totalMin, revConfig);
  const waitingEarnings = Math.round(waitingChargeAmount * 0.7);
  const timeline = task.taskTimeline || [];
  timeline.push(makeTimelineEntry("waiting_paused", `Comrade paused waiting after ${elapsedMin} min`));

  // Dual-write: record timeline event in normalized table
  recordTimelineEvent(id, "waiting_paused", `Comrade paused waiting after ${elapsedMin} min`, now);

  const [updated] = await db.update(tasksTable).set({
    waitingStartedAt: null, waitingEndedAt: now, totalWaitingMinutes: totalMin,
    waitingChargeAmount: waitingChargeAmount.toString(),
    waitingEarnings: waitingEarnings.toString(),
    status: "in_progress", taskTimeline: timeline,
  }).where(eq(tasksTable.id, id)).returning();
  getIo().to(`task_${id}`).emit("task_status_changed", { taskId: id, status: "in_progress" });
  const enriched = await getTaskWithRelations(updated.id);
  res.json(enriched);
});

// POST /tasks/:id/waiting/end — Phase 6: with waiting charge calculation
router.post("/tasks/:id/waiting/end", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  if (task.runnerId !== runner.id) { res.status(403).json({ error: "Not assigned" }); return; }

  // Validate state machine transition
  const transition = validateTimelineTransition(task.status, "in_progress");
  if (!transition.valid) {
    res.status(400).json({ error: "Cannot end waiting from current status", detail: transition.reason });
    return;
  }

  const now = new Date();
  const elapsedMin = task.waitingStartedAt
    ? Math.round((now.getTime() - new Date(task.waitingStartedAt).getTime()) / 60000)
    : 0;
  const totalMin = (task.totalWaitingMinutes || 0) + elapsedMin;
  // Calculate waiting charge
  const revConfig = await getRevenueConfig();
  const { waitingChargeAmount } = calculateWaitingCharge(totalMin, revConfig);
  const waitingEarnings = Math.round(waitingChargeAmount * 0.7);
  const timeline = task.taskTimeline || [];
  timeline.push(makeTimelineEntry("waiting_completed", `Waiting ended — ${totalMin} min total`));

  // Dual-write: record timeline event in normalized table
  recordTimelineEvent(id, "waiting_completed", `Waiting ended — ${totalMin} min total`, now);

  const [updated] = await db.update(tasksTable).set({
    waitingStartedAt: null, waitingEndedAt: now, totalWaitingMinutes: totalMin,
    waitingChargeAmount: waitingChargeAmount.toString(),
    waitingEarnings: waitingEarnings.toString(),
    status: "in_progress", taskTimeline: timeline,
  }).where(eq(tasksTable.id, id)).returning();
  getIo().to(`task_${id}`).emit("task_waiting_ended", { taskId: id, totalMinutes: totalMin });
  const enriched = await getTaskWithRelations(updated.id);
  res.json(enriched);
});

// Cached queue ETA config (refreshed every 5 minutes)
let queueEtaConfig: Record<string, number> | null = null;
let queueEtaConfigFetchedAt = 0;

async function getQueueEtaMultiplier(category?: string | null): Promise<number> {
  const now = Date.now();
  if (!queueEtaConfig || now - queueEtaConfigFetchedAt > 5 * 60 * 1000) {
    try {
      const [settings] = await db.select({
        hospital: adminSettingsTable.queueEtaMultiplierHospital,
        bank: adminSettingsTable.queueEtaMultiplierBank,
        govt: adminSettingsTable.queueEtaMultiplierGovt,
        default: adminSettingsTable.queueEtaMultiplierDefault,
      }).from(adminSettingsTable).limit(1);
      if (settings) {
        queueEtaConfig = {
          hospital: Number(settings.hospital) || 5,
          bank: Number(settings.bank) || 2,
          govt_office: Number(settings.govt) || 8,
          default: Number(settings.default) || 3,
        };
        queueEtaConfigFetchedAt = now;
      }
    } catch { /* fall back to defaults */ }
  }
  if (!queueEtaConfig) return 3;
  return queueEtaConfig[category ?? ""] || queueEtaConfig.default || 3;
}

// Helper: calculate queue intelligence fields
async function computeQueueIntelligence(tokenNumber?: string | null, currentToken?: string | null, category?: string | null) {
  const token = parseInt(tokenNumber || "", 10);
  const current = parseInt(currentToken || "", 10);
  const gap = !isNaN(token) && !isNaN(current) && currentToken && tokenNumber
    ? Math.max(0, token - current)
    : null;
  const multiplier = await getQueueEtaMultiplier(category);
  const estimatedWait = gap != null && !isNaN(gap) ? Math.round(gap * multiplier) : null;
  const progress = !isNaN(token) && !isNaN(current) && token > 0 && currentToken && tokenNumber
    ? Math.max(0, Math.min(100, Math.round((current / token) * 100)))
    : null;
  return {
    queueGap: gap != null && !isNaN(gap) ? gap : null,
    estimatedWaitMinutes: estimatedWait,
    queueProgressPercent: progress,
  };
}

// POST /tasks/:id/queue/progress — Phase 4: Queue Intelligence Engine
router.post("/tasks/:id/queue/progress", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { currentToken, counterNumber, queueNotes } = req.body;
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  if (task.runnerId !== runner.id) { res.status(403).json({ error: "Not assigned" }); return; }

  const updatedCurrent = currentToken || task.currentToken;
  const updatedCounter = counterNumber || task.counterNumber;
  const intelligence = await computeQueueIntelligence(task.tokenNumber, updatedCurrent, task.category);

  const timeline = task.taskTimeline || [];
  const queueLabel = `Queue updated — Token: ${updatedCurrent || "?"}${updatedCounter ? ` Counter: ${updatedCounter}` : ""}${intelligence.queueGap != null ? ` Gap: ${intelligence.queueGap}` : ""}`;
  timeline.push(makeTimelineEntry("queue_updated", queueLabel));

  // Dual-write: record timeline event in normalized table
  const queueTs = new Date();
  recordTimelineEvent(id, "queue_updated", queueLabel, queueTs);

  const [updated] = await db.update(tasksTable).set({
    currentToken: updatedCurrent,
    counterNumber: updatedCounter,
    queueNotes: queueNotes ?? task.queueNotes,
    queueGap: intelligence.queueGap,
    estimatedWaitMinutes: intelligence.estimatedWaitMinutes,
    queueProgressPercent: intelligence.queueProgressPercent,
    taskTimeline: timeline,
  }).where(eq(tasksTable.id, id)).returning();

  // Enriched realtime event to all viewers
  const queueUpdate = {
    taskId: id,
    currentToken: updated.currentToken,
    counterNumber: updated.counterNumber,
    queueGap: updated.queueGap,
    estimatedWaitMinutes: updated.estimatedWaitMinutes,
    queueProgressPercent: updated.queueProgressPercent,
    queueNotes: updated.queueNotes,
    timestamp: Date.now(),
  };
  getIo().to(`task_${id}`).emit("queue_updated", queueUpdate);
  getIo().to("admin_fleet").emit("queue_updated", queueUpdate);

  const enriched = await getTaskWithRelations(updated.id);
  res.json(enriched);
});

// POST /tasks/:id/family-tracking
router.post("/tasks/:id/family-tracking", requireUser, async (req, res): Promise<void> => {
  const user = req.user!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { familyContactName, familyContactPhone } = req.body;
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  if (task.userId !== user.id) { res.status(403).json({ error: "Not your task" }); return; }
  const token = crypto.randomBytes(32).toString("hex");
  // Token expires 48 hours from now (or task completion + 24h, whichever is later)
  const taskCompletedAt = task.completedAt ? new Date(task.completedAt) : null;
  const expiryFromComplete = taskCompletedAt ? new Date(taskCompletedAt.getTime() + 24 * 60 * 60 * 1000) : null;
  const expiryFromNow = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const familyTokenExpiresAt = expiryFromComplete && expiryFromComplete > expiryFromNow ? expiryFromComplete : expiryFromNow;
  
  const [updated] = await db.update(tasksTable).set({
    familyContactName, familyContactPhone,
    familyTrackingToken: token,
    familyTokenExpiresAt,
  }).where(eq(tasksTable.id, id)).returning();
  res.json({ familyTrackingToken: token, shareLink: `/family/track/${token}`, expiresAt: familyTokenExpiresAt });
});

// GET /family/track/:token - read-only family tracking (no auth required) — Phase 7 V2 with full data
router.get("/family/track/:token", async (req, res): Promise<void> => {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.familyTrackingToken, token));
  if (!task) { res.status(404).json({ error: "Tracking link not found" }); return; }
  // Check if token has expired
  if (task.familyTokenExpiresAt && new Date(task.familyTokenExpiresAt) < new Date()) {
    res.status(410).json({ error: "Tracking link expired", code: "TOKEN_EXPIRED" });
    return;
  }
  const [user] = task.userId ? await db.select().from(usersTable).where(eq(usersTable.id, task.userId)) : [null];
  const [runner] = task.runnerId ? await db.select().from(runnersTable).where(eq(runnersTable.id, task.runnerId)) : [null];
  // Strip sensitive data from runner
  const safeRunner = runner ? (({ otp, otpExpiresAt, aadhaarNumber, phone, ...safe }) => safe)(runner) : null;

  // Get latest runner location
  let runnerLocation: Record<string, unknown> | null = null;
  if (runner) {
    const [loc] = await db.select().from(runnerLocationsTable)
      .where(and(eq(runnerLocationsTable.runnerId, runner.id), eq(runnerLocationsTable.taskId, task.id)))
      .orderBy(desc(runnerLocationsTable.recordedAt))
      .limit(1);
    if (loc) {
      runnerLocation = {
        lat: Number(loc.lat), lng: Number(loc.lng),
        heading: loc.heading ? Number(loc.heading) : null,
        speed: loc.speed ? Number(loc.speed) : null,
        recordedAt: loc.recordedAt,
      };
    } else if (runner.currentLat && runner.currentLng) {
      runnerLocation = {
        lat: Number(runner.currentLat), lng: Number(runner.currentLng),
        heading: null, speed: null, recordedAt: null,
      };
    }
  }

  // Compute queue intelligence for display
  const queueGap = task.tokenNumber && task.currentToken
    ? Math.max(0, parseInt(task.tokenNumber) - parseInt(task.currentToken))
    : null;
  const multiplier = await getQueueEtaMultiplier(task.category);
  const estimatedWait = queueGap != null ? Math.round(queueGap * multiplier) : null;
  const queueProgress = task.tokenNumber && task.currentToken && parseInt(task.tokenNumber) > 0
    ? Math.max(0, Math.min(100, Math.round((parseInt(task.currentToken) / parseInt(task.tokenNumber)) * 100)))
    : null;

  // Calculate ETA
  let eta: string | null = null;
  if (task.estimatedDurationMinutes && task.acceptedAt) {
    const etaDate = new Date(task.acceptedAt);
    etaDate.setMinutes(etaDate.getMinutes() + task.estimatedDurationMinutes);
    eta = etaDate.toISOString();
  }

  res.json({
    task: {
      id: task.id, category: task.category, description: task.description,
      status: task.status,
      clientName: user?.name?.split(" ")[0] || "Client",
      locationName: task.locationName, locationArea: task.locationArea,
      locationLat: task.locationLat ? Number(task.locationLat) : null,
      locationLng: task.locationLng ? Number(task.locationLng) : null,
      taskLat: task.taskLat ? Number(task.taskLat) : null,
      taskLng: task.taskLng ? Number(task.taskLng) : null,
      proofPhotos: task.proofPhotos, taskTimeline: task.taskTimeline,
      pickupRequired: task.pickupRequired, fromArea: task.fromArea, toArea: task.toArea,
      estimatedDurationMinutes: task.estimatedDurationMinutes,
      waitingStartedAt: task.waitingStartedAt,
      waitingEndedAt: task.waitingEndedAt,
      totalWaitingMinutes: task.totalWaitingMinutes || 0,
      waitingChargeAmount: task.waitingChargeAmount ? Number(task.waitingChargeAmount) : 0,
      queueType: task.queueType,
      tokenNumber: task.tokenNumber,
      currentToken: task.currentToken,
      counterNumber: task.counterNumber,
      queueGap,
      estimatedWaitMinutes: estimatedWait,
      queueProgressPercent: queueProgress,
      createdAt: task.createdAt, acceptedAt: task.acceptedAt, completedAt: task.completedAt,
      price: task.price ? Number(task.price) : 0,
      runnerEarning: task.runnerEarning ? Number(task.runnerEarning) : 0,
      seniorInvolved: task.seniorInvolved,
      eta,
      invoiceNumber: task.invoiceNumber,
    },
    clientName: user?.name?.split(" ")[0] || "Client",
    runner: safeRunner ? {
      id: safeRunner.id,
      name: safeRunner.name,
      rating: safeRunner.rating ? Number(safeRunner.rating) : null,
      trustScore: safeRunner.trustScore ?? 50,
      trustBadge: safeRunner.trustBadge ?? "improving",
      tasksCompleted: safeRunner.tasksCompleted ?? 0,
      avatar: safeRunner.avatar,
    } : null,
    runnerLocation,
  });
});

// GET /tasks/:id/upi-qr — Generate UPI QR code data for cash tasks (#22)
router.get("/tasks/:id/upi-qr", requireUser, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const user = req.user!;

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  if (task.userId !== user.id) { res.status(403).json({ error: "Not your task" }); return; }
  if (task.paymentMethod !== "cash") { res.status(400).json({ error: "UPI QR only available for cash payment tasks" }); return; }

  // Use admin-configurable UPI ID from settings, fallback to env var, then default
  const [adminSettings] = await db.select({ upiId: adminSettingsTable.upiId, upiPayeeName: adminSettingsTable.upiPayeeName }).from(adminSettingsTable).limit(1);
  const upiId = adminSettings?.upiId || process.env.UPI_ID || "golineless@upi";
  const payeeName = adminSettings?.upiPayeeName || "Go LineLess";
  const amount = Number(task.waitingChargeAmount || 0) > 0
    ? Number(task.price) + Number(task.waitingChargeAmount)
    : Number(task.price);
  const note = `GoLineLess Task #${task.id} - ${task.category}`;

  // Generate UPI URI (RFC-compliant)
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

  res.json({
    upiUri,
    upiId,
    amount,
    note,
    taskId: task.id,
    invoiceNumber: task.invoiceNumber,
    breakdown: {
      taskPrice: Number(task.price),
      waitingCharge: Number(task.waitingChargeAmount || 0),
      total: amount,
    },
  });
});

// GET /tasks/:id/timeline
// Fix #77: Fetch task once, then authorize based on role
router.get("/tasks/:id/timeline", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) { res.status(401).json({ error: "Authentication required" }); return; }

  // Fetch task once (with just the fields we need)
  const [task] = await db.select({ userId: tasksTable.userId, runnerId: tasksTable.runnerId, taskTimeline: tasksTable.taskTimeline }).from(tasksTable).where(eq(tasksTable.id, id));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }

  // Check admin token
  const admin = await resolveAdmin(token);
  if (admin) {
    // S3: Read from normalized taskTimelineEventsTable
    const events = await db.select().from(taskTimelineEventsTable)
      .where(eq(taskTimelineEventsTable.taskId, id))
      .orderBy(taskTimelineEventsTable.eventTimestamp);
    res.json(events);
    return;
  }

  // Check user ownership
  const user = await getUserFromToken(token);
  if (user) {
    if (task.userId !== user.id) { res.status(403).json({ error: "You can only view your own task timelines" }); return; }
    const events = await db.select().from(taskTimelineEventsTable)
      .where(eq(taskTimelineEventsTable.taskId, id))
      .orderBy(taskTimelineEventsTable.eventTimestamp);
    res.json(events);
    return;
  }

  // Check runner ownership
  const runner = await getRunnerFromToken(token);
  if (runner) {
    if (task.runnerId !== runner.id) { res.status(403).json({ error: "You can only view timelines for tasks assigned to you" }); return; }
    const events = await db.select().from(taskTimelineEventsTable)
      .where(eq(taskTimelineEventsTable.taskId, id))
      .orderBy(taskTimelineEventsTable.eventTimestamp);
    res.json(events);
    return;
  }

  res.status(401).json({ error: "Invalid or expired token" });
});

export default router;
