import { db, tasksTable, runnersTable, reviewsTable } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";

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
  const allRunnerTasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.runnerId, runnerId));

  const accepted = allRunnerTasks.length;
  const completed = allRunnerTasks.filter(t => t.status === "completed").length;
  const cancelled = allRunnerTasks.filter(t => t.status === "cancelled").length;

  // Response time: time between task created and accepted
  const acceptedTasks = allRunnerTasks.filter(t => t.acceptedAt);
  let avgResponseTime: number | null = null;
  if (acceptedTasks.length > 0) {
    const totalResponse = acceptedTasks.reduce((sum, t) => {
      const created = new Date(t.createdAt).getTime();
      const acceptedDate = new Date(t.acceptedAt!).getTime();
      return sum + (acceptedDate - created) / 1000;
    }, 0);
    avgResponseTime = Math.round(totalResponse / acceptedTasks.length);
  }

  // Late/on time arrivals based on timeline
  let lateArrivals = 0;
  let onTimeArrivals = 0;
  for (const t of allRunnerTasks.filter(t => t.taskTimeline)) {
    const timeline = t.taskTimeline || [];
    const acceptedEntry = timeline.find(e => { try { return JSON.parse(e).status === "assigned"; } catch { return false; } });
    const completedEntry = timeline.find(e => { try { return JSON.parse(e).status === "completed"; } catch { return false; } });
    if (acceptedEntry && completedEntry) {
      try {
        const a = new Date(JSON.parse(acceptedEntry).timestamp);
        const c = new Date(JSON.parse(completedEntry).timestamp);
        const durationHours = (c.getTime() - a.getTime()) / 3600000;
        if (durationHours > 3) lateArrivals++;
        else onTimeArrivals++;
      } catch { /* skip */ }
    }
  }

  // Repeat clients (using allRunnerTasks already fetched above, avoiding a redundant DB query)
  const clientCounts: Record<number, number> = {};
  for (const t of allRunnerTasks) {
    if (t.userId) clientCounts[t.userId] = (clientCounts[t.userId] || 0) + 1;
  }
  const repeatClients = Object.values(clientCounts).filter(c => c >= 2).length;

  // Average rating from reviews
  const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.runnerId, runnerId));
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length)
    : null;

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
