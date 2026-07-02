import { db, runnersTable, tasksTable, notificationsTable, adminSettingsTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";

interface NearbyRunner {
  id: number;
  name: string | null;
  phone: string | null;
  currentLat: string | null;
  currentLng: string | null;
  isOnline: boolean | null;
  kycStatus: string | null;
  trustScore: number | null;
  trustBadge: string | null;
  tasksCompleted: number | null;
  averageRating: string | null;
  [key: string]: unknown;
}
import { getIo } from "./socket";
import { logger } from "./logger";

// Active dispatch waves: map of taskId -> { timeouts, batchIndex, comradesNotified }
const activeDispatches = new Map<number, {
  timeouts: ReturnType<typeof setTimeout>[];
  batchIndex: number;
  totalNotified: Set<number>;
  dispatchedRadius: number;
}>();

// Periodic cleanup: remove orphaned dispatch entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [taskId, dispatch] of activeDispatches.entries()) {
    // Check if task is still pending by looking it up
    db.select({ status: tasksTable.status })
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .then(([task]) => {
        if (!task || task.status !== "pending") {
          for (const t of dispatch.timeouts) clearTimeout(t);
          activeDispatches.delete(taskId);
        }
      })
      .catch((cleanupErr) => { logger.error({ err: cleanupErr, taskId }, "Dispatch cleanup DB error"); });
  }
}, 5 * 60 * 1000);

/**
 * Haversine distance between two lat/lng points in km
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Load dispatch config from admin settings
 */
async function getDispatchConfig(): Promise<{
  initialRadius: number;
  expandDelay: number;
  maxRadius: number;
}> {
  const [settings] = await db.select().from(adminSettingsTable).limit(1);
  if (!settings) {
    return { initialRadius: 3, expandDelay: 60, maxRadius: 20 };
  }
  return {
    initialRadius: Number(settings.dispatchInitialRadius ?? 3),
    expandDelay: Number(settings.dispatchExpandDelay ?? 60),
    maxRadius: Number(settings.dispatchMaxRadius ?? 20),
  };
}

/**
 * Find and sort nearby verified online comrades by distance AND trust score.
 * Phase 5: Prioritizes higher trust score comrades.
 */
async function findNearbyComrades(
  taskLat: number,
  taskLng: number,
  maxRadiusKm: number
): Promise<{ runner: NearbyRunner; distanceKm: number; trustScore: number }[]> {
  const comrades = await db
    .select({
      id: runnersTable.id,
      name: runnersTable.name,
      phone: runnersTable.phone,
      currentLat: runnersTable.currentLat,
      currentLng: runnersTable.currentLng,
      isOnline: runnersTable.isOnline,
      kycStatus: runnersTable.kycStatus,
      trustScore: runnersTable.trustScore,
      trustBadge: runnersTable.trustBadge,
      tasksCompleted: runnersTable.tasksCompleted,
      averageRating: runnersTable.averageRating,
    })
    .from(runnersTable)
    .where(and(
      eq(runnersTable.isOnline, true),
      // Phase 6.1: Allow runners with dispatchAllowed=true even if KYC is pending
      or(
        eq(runnersTable.kycStatus, "verified"),
        eq(runnersTable.dispatchAllowed, true),
      ),
    ));

  const withDistance = comrades
    .map((c) => {
      const lat = c.currentLat ? Number(c.currentLat) : null;
      const lng = c.currentLng ? Number(c.currentLng) : null;
      const distanceKm = lat != null && lng != null
        ? haversineKm(taskLat, taskLng, lat, lng)
        : Infinity;
      // Normalize trust score (0-100) to a 0-1 scale
      const trustNorm = (c.trustScore ?? 50) / 100;
      return { runner: c, distanceKm, trustScore: trustNorm };
    })
    .filter((c) => c.distanceKm <= maxRadiusKm)
    .sort((a, b) => {
      // Sort by composite score: distance (lower better) + trust (higher better)
      // Weight: distance 70%, trust 30% for initial sort
      const aNormDistance = a.distanceKm / maxRadiusKm;
      const bNormDistance = b.distanceKm / maxRadiusKm;
      const aComposite = aNormDistance * 0.7 - a.trustScore * 0.3;
      const bComposite = bNormDistance * 0.7 - b.trustScore * 0.3;
      return aComposite - bComposite;
    });

  return withDistance;
}

/**
 * Notify a batch of comrades about a new task
 */
async function notifyComrades(
  comrades: { runner: NearbyRunner; distanceKm: number; trustScore?: number }[],
  task: typeof tasksTable.$inferSelect,
  batchLabel: string,
  radiusKm: number
): Promise<number> {
  const payload = {
    taskId: task.id,
    category: task.category,
    description: task.description?.slice(0, 150),
    locationArea: task.locationArea || "Ahmedabad",
    fromArea: task.fromArea || null,
    toArea: task.toArea || null,
    price: Number(task.price),
    runnerEarning: Number(task.runnerEarning),
    urgency: task.urgency,
    seniorInvolved: task.seniorInvolved,
    estimatedDurationMinutes: task.estimatedDurationMinutes || null,
    pickupRequired: task.pickupRequired,
    distanceBand: task.distanceBand,
    dispatchRadius: radiusKm,
    batchLabel,
    createdAt: task.createdAt,
  };

  for (const c of comrades) {
    // B10: Notify via socket with retry on failure
    try {
      getIo().to(`comrade_${c.runner.id}`).emit("new_task_broadcast", payload);
    } catch (err) {
      logger.error({ err, runnerId: c.runner.id, taskId: task.id }, "Socket emit failed — notification deferred to DB only");
    }

    // Create DB notification (always persisted as fallback)
    await db.insert(notificationsTable).values({
      runnerId: c.runner.id,
      type: "new_task_available",
      title: "New Task Available!",
      message: `New ${task.category} task near you (${c.distanceKm.toFixed(1)}km) | Payout: Rs ${task.runnerEarning}`,
      taskId: task.id,
    });
  }

  return comrades.length;
}

/**
 * Start the smart dispatch process for a task
 * Called after task creation
 */
export async function startSmartDispatch(taskId: number): Promise<{ wave: number; comradesInRadius: number }> {
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
  if (!task || task.status !== "pending") return { wave: 0, comradesInRadius: 0 };

  const config = await getDispatchConfig();
  const taskLat = task.taskLat ? Number(task.taskLat) : task.locationLat ? Number(task.locationLat) : null;
  const taskLng = task.taskLng ? Number(task.taskLng) : task.locationLng ? Number(task.locationLng) : null;

  // If no location data, fall back to broadcast to all (legacy)
  if (taskLat == null || taskLng == null) {
    const allOnline = await db
      .select({ id: runnersTable.id, name: runnersTable.name, phone: runnersTable.phone, currentLat: runnersTable.currentLat, currentLng: runnersTable.currentLng })
      .from(runnersTable)
      .where(and(eq(runnersTable.isOnline, true), eq(runnersTable.kycStatus, "verified")));
    const mapResult = allOnline.map(r => ({ runner: r as NearbyRunner, distanceKm: 0 }));
    const count = await notifyComrades(mapResult, task, "fallback_all", 0);
    return { wave: 1, comradesInRadius: count };
  }

  const dispatch = {
    timeouts: [] as ReturnType<typeof setTimeout>[],
    batchIndex: 0,
    totalNotified: new Set<number>(),
    dispatchedRadius: config.initialRadius,
  };
  activeDispatches.set(taskId, dispatch);

  // Wave 1: initial radius
  let currentRadius = config.initialRadius;
  const firstBatch = await findNearbyComrades(taskLat, taskLng, currentRadius);
  const firstCount = await notifyComrades(firstBatch, task, "wave_1", currentRadius);
  firstBatch.forEach(c => dispatch.totalNotified.add(c.runner.id));

  // Update dispatch metrics
  await db.update(tasksTable).set({
    dispatchAttempts: 1,
    dispatchRadiusUsed: currentRadius,
    dispatchNotifiedCount: firstCount,
  }).where(eq(tasksTable.id, taskId));

  // Schedule subsequent waves if task is still pending
  const scheduleNextWave = (radius: number, wave: number) => {
    const timeoutId = setTimeout(async () => {
      // Check if task is still pending (not accepted yet)
      const [currentTask] = await db.select({ status: tasksTable.status }).from(tasksTable).where(eq(tasksTable.id, taskId));
      if (!currentTask || currentTask.status !== "pending") return;

      const newRadius = radius + config.initialRadius; // Expand by initial radius each wave
      if (newRadius > config.maxRadius) {
        // Max radius reached — notify admin
        getIo().to("admin_fleet").emit("dispatch_max_radius", { taskId, radius: config.maxRadius });
        // M13: Notify user that dispatch failed — no comrades found in any radius
        try {
          const [taskOwner] = await db.select({ userId: tasksTable.userId }).from(tasksTable).where(eq(tasksTable.id, taskId));
          if (taskOwner?.userId) {
            await db.insert(notificationsTable).values({
              userId: taskOwner.userId,
              type: "dispatch_failed",
              title: "No Comrades Found",
              message: `Could not find available Comrades for your ${task.category} task within ${config.maxRadius}km. Please try again later.`,
              taskId,
            });
          }
        } catch (err) { logger.error({ err, taskId }, "Failed to send dispatch failure notification"); }
        return;
      }

      // Find comrades in the expanded ring (up to newRadius)
      const batch = await findNearbyComrades(taskLat, taskLng, newRadius);
      const newComrades = batch.filter(c => !dispatch.totalNotified.has(c.runner.id));

      if (newComrades.length > 0) {
        const count = await notifyComrades(newComrades, task, `wave_${wave + 1}`, newRadius);
        newComrades.forEach(c => dispatch.totalNotified.add(c.runner.id));
        dispatch.batchIndex = wave;

        // Update metrics
        await db.update(tasksTable).set({
          dispatchAttempts: wave + 1,
          dispatchRadiusUsed: newRadius,
          dispatchNotifiedCount: dispatch.totalNotified.size,
        }).where(eq(tasksTable.id, taskId));
      }

      // Broadcast radius expansion to admin
      getIo().to("admin_fleet").emit("dispatch_wave", {
        taskId,
        wave: wave + 1,
        radius: newRadius,
        comradesNotified: newComrades.length,
        totalNotified: dispatch.totalNotified.size,
      });



      // Schedule next wave
      scheduleNextWave(newRadius, wave + 1);
    }, config.expandDelay * 1000);

    dispatch.timeouts.push(timeoutId);
  };

  // Schedule wave 2+ if needed
  if (config.maxRadius > config.initialRadius) {
    scheduleNextWave(config.initialRadius, 1);
  }

  getIo().to("admin_fleet").emit("dispatch_started", {
    taskId,
    initialRadius: config.initialRadius,
    comradesInRadius: firstCount,
    wavesPlanned: Math.ceil((config.maxRadius - config.initialRadius) / config.initialRadius) + 1,
  });

  return { wave: 1, comradesInRadius: firstCount };
}

/**
 * Cancel all pending dispatch waves for a task
 * Called when a task is accepted
 */
export function cancelDispatch(taskId: number): void {
  const dispatch = activeDispatches.get(taskId);
  if (!dispatch) return;

  for (const timeoutId of dispatch.timeouts) {
    clearTimeout(timeoutId);
  }
  activeDispatches.delete(taskId);

  getIo().to("admin_fleet").emit("dispatch_cancelled", { taskId, reason: "task_accepted" });
}

/**
 * Get dispatch debug info (for admin)
 */
export function getActiveDispatches(): { taskId: number; batchIndex: number; totalNotified: number; radius: number }[] {
  return Array.from(activeDispatches.entries()).map(([taskId, d]) => ({
    taskId,
    batchIndex: d.batchIndex,
    totalNotified: d.totalNotified.size,
    radius: d.dispatchedRadius,
  }));
}
