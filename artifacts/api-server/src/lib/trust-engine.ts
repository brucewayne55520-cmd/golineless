import { db, tasksTable, runnersTable, reviewsTable, taskTimelineEventsTable } from "@workspace/db";
import { eq, and, desc, inArray, sql, asc } from "drizzle-orm";

// Badge thresholds
const BADGES = [
  { minScore: 95, badge: "elite", label: "Elite" },
  { minScore: 90, badge: "trusted", label: "Trusted" },
  { minScore: 80, badge: "verified", label: "Verified" },
  { minScore: 70, badge: "active", label: "Active" },
  { minScore: 0, badge: "improving", label: "Improving" },
];

export function getTrustBadge(score: number): { badge: string; label: string } {
  for (const level of BADGES) {
    if (score >= level.minScore) return { badge: level.badge, label: level.label };
  }
  return { badge: "improving", label: "Improving" };
}

/**
 * Calculate trust score (0-100) for a comrade based on performance metrics.
 *
 * Weights:
 *   Completion Rate (35%): tasksCompleted / tasksAccepted
 *   Punctuality (20%): onTimeArrivals / (onTimeArrivals + lateArrivals)
 *   Client Ratings (20%): averageRating / 5
 *   Cancellation Rate (10%): 1 - (tasksCancelled / tasksAccepted)
 *   Response Time (10%): max 0, min 100 based on avg seconds
 *   KYC Verification (5%): 100 if verified, 0 otherwise
 */
export async function calculateTrustScore(runnerId: number): Promise<number> {
  const [runner] = await db.select().from(runnersTable).where(eq(runnersTable.id, runnerId));
  if (!runner) return 50;

  const accepted = runner.tasksAccepted ?? 0;
  const completed = runner.tasksCompleted ?? 0;
  const cancelled = runner.tasksCancelled ?? 0;
  const onTime = runner.onTimeArrivals ?? 0;
  const late = runner.lateArrivals ?? 0;
  const rating = runner.averageRating ? Number(runner.averageRating) : null;
  const avgResponseTime = runner.averageResponseTime ? Number(runner.averageResponseTime) : null;
  const isKycVerified = runner.kycStatus === "verified";

  // 1. Completion Rate (35%)
  let completionRate = 0;
  if (accepted > 0) completionRate = completed / accepted;
  const completionScore = completionRate * 100 * 0.35;

  // 2. Punctuality (20%)
  let punctualityRate = 0;
  const totalArrivals = onTime + late;
  if (totalArrivals > 0) punctualityRate = onTime / totalArrivals;
  const punctualityScore = punctualityRate * 100 * 0.20;

  // 3. Client Ratings (20%)
  let ratingScore = 0;
  if (rating != null && rating > 0) {
    ratingScore = (rating / 5) * 100 * 0.20;
  } else {
    // No ratings yet — neutral score
    ratingScore = 50 * 0.20;
  }

  // 4. Cancellation Rate (10%)
  let cancellationScore = 50 * 0.10; // neutral default
  if (accepted > 0) {
    const cancelRate = cancelled / accepted;
    cancellationScore = Math.max(0, (1 - cancelRate) * 100 * 0.10);
  }

  // 5. Response Time (10%)
  let responseScore = 50 * 0.10; // neutral default
  if (avgResponseTime != null) {
    // Faster response = higher score. < 60s = 100, > 600s = 0
    const respSeconds = Math.min(600, Math.max(0, avgResponseTime));
    responseScore = (1 - respSeconds / 600) * 100 * 0.10;
  }

  // 6. KYC Verification (5%)
  const kycScore = isKycVerified ? 100 * 0.05 : 0;

  // Bonus: repeat clients (up to 5 bonus points)
  const repeatBonus = Math.min(5, (runner.repeatClients ?? 0) * 2);

  const total = Math.round(completionScore + punctualityScore + ratingScore + cancellationScore + responseScore + kycScore + repeatBonus);
  return Math.max(0, Math.min(100, total));
}

/**
 * Recalculate and persist trust score + badge for a runner.
 */
export async function recalculateTrustScore(runnerId: number): Promise<{ trustScore: number; trustBadge: string }> {
  const trustScore = await calculateTrustScore(runnerId);
  const badge = getTrustBadge(trustScore);
  await db.update(runnersTable).set({
    trustScore,
    trustBadge: badge.badge,
  }).where(eq(runnersTable.id, runnerId));
  return { trustScore, trustBadge: badge.badge };
}

/**
 * Update runner metrics from tasks + reviews.
 * Called after task completion, cancellation, or review.
 */
export async function updateRunnerMetrics(runnerId: number): Promise<void> {
  // A8 FIX: Use SQL aggregation instead of loading all tasks into memory
  const [counts] = await db
    .select({
      accepted: sql<number>`count(*)::int`,
      completed: sql<number>`count(*) filter (where ${tasksTable.status} = 'completed')::int`,
      cancelled: sql<number>`count(*) filter (where ${tasksTable.status} = 'cancelled')::int`,
    })
    .from(tasksTable)
    .where(eq(tasksTable.runnerId, runnerId));

  const accepted = counts?.accepted ?? 0;
  const completed = counts?.completed ?? 0;
  const cancelled = counts?.cancelled ?? 0;

  // Response time: avg difference between createdAt and acceptedAt
  const [respRow] = await db
    .select({
      avgResp: sql<string | null>`avg(extract(epoch from (${tasksTable.acceptedAt} - ${tasksTable.createdAt})))::text`,
    })
    .from(tasksTable)
    .where(and(eq(tasksTable.runnerId, runnerId), sql`${tasksTable.acceptedAt} IS NOT NULL`));
  const avgResponseTime = respRow?.avgResp ? Math.round(Number(respRow.avgResp)) : null;

  // A8/D4 FIX: Use normalized taskTimelineEventsTable instead of JSON.parse on old taskTimeline array
  // Get distinct task IDs for this runner that have timeline events
  const runnerTaskIds = await db
    .select({ taskId: tasksTable.id })
    .from(tasksTable)
    .where(eq(tasksTable.runnerId, runnerId));
  const taskIds = runnerTaskIds.map(t => t.taskId);

  let lateArrivals = 0;
  let onTimeArrivals = 0;

  if (taskIds.length > 0) {
    // Batch query: get accepted + completed events for all tasks in one query
    const events = await db
      .select({
        taskId: taskTimelineEventsTable.taskId,
        status: taskTimelineEventsTable.status,
        eventTimestamp: taskTimelineEventsTable.eventTimestamp,
      })
      .from(taskTimelineEventsTable)
      .where(and(
        inArray(taskTimelineEventsTable.taskId, taskIds),
        inArray(taskTimelineEventsTable.status, ["assigned", "completed"]),
      ))
      .orderBy(asc(taskTimelineEventsTable.taskId), asc(taskTimelineEventsTable.eventTimestamp));

    // Group by taskId and compute late/on-time
    const byTask = new Map<number, { accepted?: Date; completed?: Date }>();
    for (const e of events) {
      if (!byTask.has(e.taskId)) byTask.set(e.taskId, {});
      const entry = byTask.get(e.taskId)!;
      if (e.status === "assigned" && !entry.accepted) entry.accepted = new Date(e.eventTimestamp);
      if (e.status === "completed" && !entry.completed) entry.completed = new Date(e.eventTimestamp);
    }
    for (const [, entry] of byTask) {
      const { accepted, completed } = entry;
      if (accepted && completed) {
        const durationHours = (completed.getTime() - accepted.getTime()) / 3600000;
        if (durationHours > 3) lateArrivals++;
        else onTimeArrivals++;
      }
    }
  }

  // Repeat clients: users who had >= 2 tasks with this runner
  const [repeatRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(
      db.select({ userId: tasksTable.userId })
        .from(tasksTable)
        .where(and(eq(tasksTable.runnerId, runnerId), sql`${tasksTable.userId} IS NOT NULL`))
        .groupBy(tasksTable.userId)
        .having(sql`count(*) >= 2`)
        .as('repeat_users')
    );
  const repeatClients = repeatRow?.count ?? 0;

  // Average rating from reviews
  const [ratingRow] = await db
    .select({ avg: sql<string | null>`avg(${reviewsTable.rating})::text` })
    .from(reviewsTable)
    .where(eq(reviewsTable.runnerId, runnerId));
  const avgRating = ratingRow?.avg ? Number(ratingRow.avg) : null;

  // Update runner record
  await db.update(runnersTable).set({
    tasksAccepted: accepted,
    tasksCompleted: completed,
    tasksCancelled: cancelled,
    averageRating: avgRating?.toFixed(2),
    averageResponseTime: avgResponseTime?.toString(),
    lateArrivals,
    onTimeArrivals,
    repeatClients,
  }).where(eq(runnersTable.id, runnerId));

  // Recalculate trust score
  await recalculateTrustScore(runnerId);
}
