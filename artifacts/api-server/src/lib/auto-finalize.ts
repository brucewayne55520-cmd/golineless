/**
 * Auto-Finalize Cron Job (#22)
 *
 * Runs every 5 minutes to auto-finalize cash_pending payments after 24 hours.
 * If the user hasn't disputed within 24hrs, the payment is marked as "paid".
 *
 * Also handles fraud detection (#30) for users who dispute >3 payments in 30 days.
 */
import { db, tasksTable, paymentAuditLogTable, notificationsTable, usersTable } from "@workspace/db";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { logger } from "./logger";

const DISPUTE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const CRON_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const FRAUD_DISPUTE_THRESHOLD = 3; // Max disputes in 30 days before flagging
const FRAUD_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

let cronRunning = false;
let cronInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Auto-finalize cash_pending payments that are past the 24hr dispute window.
 */
async function autoFinalizePayments(): Promise<number> {
  const cutoff = new Date(Date.now() - DISPUTE_WINDOW_MS);

  // Find all cash_pending tasks where paymentConfirmedAt is older than 24hrs
  const stalePending = await db
    .select({
      id: tasksTable.id,
      price: tasksTable.price,
      userId: tasksTable.userId,
      runnerId: tasksTable.runnerId,
      paymentConfirmedAt: tasksTable.paymentConfirmedAt,
      taskTimeline: tasksTable.taskTimeline,
    })
    .from(tasksTable)
    .where(and(
      eq(tasksTable.paymentStatus, "cash_pending"),
      lt(tasksTable.paymentConfirmedAt, cutoff),
    ));

  if (stalePending.length === 0) return 0;

  let finalized = 0;
  for (const task of stalePending) {
    try {
      const timelineEntries = task.taskTimeline ? [...task.taskTimeline] : [];
      timelineEntries.push(JSON.stringify({
        status: "cash_auto_finalized",
        label: `Payment auto-finalized after 24hr dispute window (no dispute filed)`,
        timestamp: new Date().toISOString(),
        amount: task.price,
      }));

      await db.update(tasksTable).set({
        paymentStatus: "paid",
        paidAmount: task.price,
        taskTimeline: timelineEntries,
      }).where(eq(tasksTable.id, task.id));

      // Log to audit trail
      await db.insert(paymentAuditLogTable).values({
        taskId: task.id,
        previousStatus: "cash_pending",
        newStatus: "paid",
        actor: "system",
        actorType: "system",
        reason: "Auto-finalized after 24hr dispute window — no dispute filed",
        metadata: JSON.stringify({ autoFinalized: true, price: task.price }),
      });

      // Notify user
      if (task.userId) {
        await db.insert(notificationsTable).values({
          userId: task.userId,
          type: "payment_confirmed",
          title: "Payment Confirmed",
          message: `Your cash payment of Rs ${task.price} for Task #${task.id} has been confirmed (24hr window passed without dispute).`,
          taskId: task.id,
        });
      }

      // Notify runner
      if (task.runnerId) {
        await db.insert(notificationsTable).values({
          runnerId: task.runnerId,
          type: "payment_confirmed",
          title: "Payment Auto-Finalized",
          message: `Cash payment of Rs ${task.price} for Task #${task.id} has been auto-finalized after 24hr window.`,
          taskId: task.id,
        });
      }

      finalized++;
      logger.info({ taskId: task.id, amount: task.price }, "Cash payment auto-finalized after 24hr window");
    } catch (err) {
      logger.error({ err, taskId: task.id }, "Failed to auto-finalize cash payment");
    }
  }

  return finalized;
}

/**
 * (#30) Fraud Detection: Flag users who dispute >3 payments in 30 days.
 */
async function detectDisputeFraud(): Promise<void> {
  const windowStart = new Date(Date.now() - FRAUD_WINDOW_MS);

  // Count disputes per user in last 30 days
  const disputeCounts = await db
    .select({
      actor: paymentAuditLogTable.actor,
      count: sql<number>`count(*)::int`,
    })
    .from(paymentAuditLogTable)
    .where(and(
      eq(paymentAuditLogTable.newStatus, "pending"),
      eq(paymentAuditLogTable.actorType, "user"),
      gte(paymentAuditLogTable.createdAt, windowStart),
    ))
    .groupBy(paymentAuditLogTable.actor);

  for (const row of disputeCounts) {
    if (row.count >= FRAUD_DISPUTE_THRESHOLD && row.actor) {
      const userIdStr = row.actor.replace("user:", "");
      const userId = parseInt(userIdStr, 10);
      if (isNaN(userId)) continue;

      logger.warn({ userId, disputeCount: row.count }, "Fraud alert: user has excessive disputes");

      // Notify admin
      const [user] = await db.select({ name: usersTable.name, phone: usersTable.phone }).from(usersTable).where(eq(usersTable.id, userId));
      logger.warn({
        type: "dispute_fraud",
        userId,
        userName: user?.name ?? "Unknown",
        userPhone: user?.phone ?? "Unknown",
        disputeCount: row.count,
        message: `User ${user?.name ?? userId} has ${row.count} disputes in 30 days — possible abuse`,
      }, "FRAUD DETECTION: Excessive disputes");
    }
  }
}

/**
 * Start the auto-finalize cron job. Call once at server startup.
 */
export function startAutoFinalizeCron(): void {
  if (cronRunning) return;
  cronRunning = true;

  logger.info("Auto-finalize cron job started (5min interval)");

  // Run immediately on startup, then every 5 minutes
  runCronCycle();
  cronInterval = setInterval(runCronCycle, CRON_INTERVAL_MS);
}

// Graceful shutdown: clear cron interval on SIGTERM/SIGINT
function handleShutdown(): void {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    logger.info("Auto-finalize cron stopped (shutdown)");
  }
}
process.on("SIGTERM", handleShutdown);
process.on("SIGINT", handleShutdown);

async function runCronCycle(): Promise<void> {
  try {
    const finalized = await autoFinalizePayments();
    if (finalized > 0) {
      logger.info({ finalized }, "Auto-finalize cron: finalized payments");
    }
  } catch (err) {
    logger.error({ err }, "Auto-finalize cron cycle failed");
  }

  try {
    await detectDisputeFraud();
  } catch (err) {
    logger.error({ err }, "Fraud detection cron cycle failed");
  }
}
