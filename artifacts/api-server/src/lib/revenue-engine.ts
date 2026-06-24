import { db, tasksTable, runnersTable, adminSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Load revenue settings from admin_settings
 */
export async function getRevenueConfig() {
  let settings;
  try {
    [settings] = await db.select().from(adminSettingsTable).limit(1);
  } catch (err) {
    // Table may not exist yet — return defaults
    logger.warn({ err }, "admin_settings table not available, using defaults");
    settings = undefined;
  }
  if (!settings) {
    return {
      freeWaitingMinutes: 15,
      waitingChargePerMinute: 2,
      waitingBracket1Min: 30,
      waitingBracket1Charge: 0,
      waitingBracket2Min: 60,
      waitingBracket2Charge: 30,
      waitingBracket3Min: 120,
      waitingBracket3Charge: 80,
      waitingBracket4Charge: 150,
      gpsValidationRadius: 250,
      priorityFeeAmount: 49,
      emergencyFeeAmount: 99,
      urgencyNormalMultiplier: 1.0,
      urgencyUrgentMultiplier: 1.25,
      urgencyEmergencyMultiplier: 1.5,
    };
  }
  return {
    freeWaitingMinutes: Number(settings.freeWaitingMinutes ?? 15),
    waitingChargePerMinute: Number(settings.waitingChargePerMinute ?? 2),
    waitingBracket1Min: Number(settings.waitingBracket1Min ?? 30),
    waitingBracket1Charge: Number(settings.waitingBracket1Charge ?? 0),
    waitingBracket2Min: Number(settings.waitingBracket2Min ?? 60),
    waitingBracket2Charge: Number(settings.waitingBracket2Charge ?? 30),
    waitingBracket3Min: Number(settings.waitingBracket3Min ?? 120),
    waitingBracket3Charge: Number(settings.waitingBracket3Charge ?? 80),
    waitingBracket4Charge: Number(settings.waitingBracket4Charge ?? 150),
    gpsValidationRadius: Number(settings.gpsValidationRadius ?? 250),
    priorityFeeAmount: Number(settings.priorityFeeAmount ?? 49),
    emergencyFeeAmount: Number(settings.emergencyFeeAmount ?? 99),
    urgencyNormalMultiplier: Number(settings.urgencyNormalMultiplier ?? 1.0),
    urgencyUrgentMultiplier: Number(settings.urgencyUrgentMultiplier ?? 1.25),
    urgencyEmergencyMultiplier: Number(settings.urgencyEmergencyMultiplier ?? 1.5),
  };
}

/**
 * Phase 7: Waiting Revenue V2 — tiered bracket-based waiting charges.
 * Default brackets (admin-configurable):
 *   0-30 min: Free
 *   31-60 min: Rs 30 flat
 *   61-120 min: Rs 80 flat
 *   120+ min: Rs 150 flat
 *
 * Returns bracket info for display: { waitingChargeAmount, totalWaitingMinutes, bracket, bracketLabel }
 */
export function calculateWaitingCharge(
  totalWaitingMinutes: number,
  config: {
    waitingBracket1Min: number; waitingBracket1Charge: number;
    waitingBracket2Min: number; waitingBracket2Charge: number;
    waitingBracket3Min: number; waitingBracket3Charge: number;
    waitingBracket4Charge: number;
  }  ): { waitingChargeAmount: number; totalWaitingMinutes: number; bracket: number; bracketLabel: string } {
  const b1 = config.waitingBracket1Min ?? 30;
  const b2 = config.waitingBracket2Min ?? 60;
  const b3 = config.waitingBracket3Min ?? 120;
  const charge1 = config.waitingBracket1Charge ?? 0;
  const charge2 = config.waitingBracket2Charge ?? 30;
  const charge3 = config.waitingBracket3Charge ?? 80;
  const charge4 = config.waitingBracket4Charge ?? 150;

  if (totalWaitingMinutes <= b1) {
    return { waitingChargeAmount: charge1, totalWaitingMinutes, bracket: 1, bracketLabel: `0-${b1} min` };
  }
  if (totalWaitingMinutes <= b2) {
    return { waitingChargeAmount: charge2, totalWaitingMinutes, bracket: 2, bracketLabel: `${b1+1}-${b2} min` };
  }
  if (totalWaitingMinutes <= b3) {
    return { waitingChargeAmount: charge3, totalWaitingMinutes, bracket: 3, bracketLabel: `${b2+1}-${b3} min` };
  }
  return { waitingChargeAmount: charge4, totalWaitingMinutes, bracket: 4, bracketLabel: `${b3+1}+ min` };
}

/**
 * Legacy wrapper — delegates to V2 with default bracket config.
 * Used by existing routes that pass { freeWaitingMinutes, waitingChargePerMinute }.
 */
export function calculateWaitingChargeLegacy(
  totalWaitingMinutes: number,
  config: { freeWaitingMinutes: number; waitingChargePerMinute: number }
): { waitingChargeAmount: number; chargeableMinutes: number } {
  const chargeableMinutes = Math.max(0, totalWaitingMinutes - config.freeWaitingMinutes);
  const waitingChargeAmount = chargeableMinutes * config.waitingChargePerMinute;
  return { waitingChargeAmount, chargeableMinutes };
}

/**
 * Calculate priority fee based on priority level
 */
export function getPriorityFee(priorityLevel: string, config: { priorityFeeAmount: number; emergencyFeeAmount: number }): number {
  if (priorityLevel === "emergency") return config.emergencyFeeAmount;
  if (priorityLevel === "priority") return config.priorityFeeAmount;
  return 0;
}

/**
 * Get urgency multiplier for pricing
 */
export function getUrgencyMultiplier(
  urgency: string,
  config: { urgencyNormalMultiplier: number; urgencyUrgentMultiplier: number; urgencyEmergencyMultiplier: number }
): number {
  switch (urgency) {
    case "emergency": return config.urgencyEmergencyMultiplier;
    case "urgent": return config.urgencyUrgentMultiplier;
    default: return config.urgencyNormalMultiplier;
  }
}

/**
 * Calculate total price with all revenue components.
 * Platform revenue = total price - runner earning - waiting charge - priority fee
 */
export function calculateTaskRevenue(params: {
  basePrice: number;
  distanceCharge: number;
  urgencyCharge: number;
  waitingChargeAmount: number;
  priorityFee: number;
  urgencyMultiplier: number;
  runnerPayoutPercent: number;
}): { price: number; runnerEarning: number; platformFee: number; waitingEarnings: number } {
  const subtotal = (params.basePrice + params.distanceCharge + params.urgencyCharge) * params.urgencyMultiplier;
  const totalWithAddons = subtotal + params.waitingChargeAmount + params.priorityFee;
  const runnerPercent = params.runnerPayoutPercent / 100;
  const runnerEarning = Math.round(totalWithAddons * runnerPercent);
  const waitingEarnings = Math.round(params.waitingChargeAmount * runnerPercent);
  const platformFee = totalWithAddons - runnerEarning;
  return {
    price: Math.round(totalWithAddons),
    runnerEarning,
    platformFee,
    waitingEarnings,
  };
}

/**
 * Generate a simple invoice number
 */
export function generateInvoiceNumber(taskId: number): string {
  const date = new Date();
  const prefix = `GL-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
  return `${prefix}-${String(taskId).padStart(5, "0")}`;
}

/**
 * Calculate pilot launch metrics from all tasks and runners
 */
interface PilotMetricTask {
  userId: number | null;
  runnerId: number | null;
  status: string;
  acceptedAt: Date | null;
  createdAt: Date;
  completedAt: Date | null;
  totalWaitingMinutes: number | null;
  price: string | number | null;
  [key: string]: unknown;
}

interface PilotMetricRunner {
  id: number;
  kycStatus: string | null;
  trustScore: number | null;
  [key: string]: unknown;
}

interface PilotMetricUser {
  id: number;
  [key: string]: unknown;
}

export function calculatePilotMetrics(
  allTasks: PilotMetricTask[],
  allRunners: PilotMetricRunner[],
  allUsers: PilotMetricUser[],
): Record<string, number> {
  const activeUsers = new Set(allTasks.filter(t => ["pending","assigned","on_the_way","at_location","in_progress"].includes(t.status)).map(t => t.userId)).size;
  const activeComrades = new Set(allTasks.filter(t => ["assigned","on_the_way","at_location","in_progress"].includes(t.status)).map(t => t.runnerId)).size;
  const completedTasks = allTasks.filter(t => t.status === "completed").length;
  const totalUsers = allUsers.length;
  const totalVerifiedRunners = allRunners.filter(r => r.kycStatus === "verified").length;

  // Avg acceptance time
  const acceptedTasks = allTasks.filter((t): t is PilotMetricTask & { acceptedAt: Date } => t.acceptedAt !== null && t.createdAt !== null);
  const avgAcceptanceTime = acceptedTasks.length > 0
    ? Math.round(acceptedTasks.reduce((s, t) => {
        return s + (t.acceptedAt.getTime() - t.createdAt.getTime()) / 1000;
      }, 0) / acceptedTasks.length)
    : 0;

  // Avg queue time (from waiting_started to waiting_ended)
  const waitingTasks = allTasks.filter((t): t is PilotMetricTask & { totalWaitingMinutes: number } => (t.totalWaitingMinutes ?? 0) > 0);
  const avgQueueTime = waitingTasks.length > 0
    ? Math.round(waitingTasks.reduce((s, t) => s + t.totalWaitingMinutes, 0) / waitingTasks.length)
    : 0;

  // Avg trust score
  const verifiedRunners = allRunners.filter(r => r.kycStatus === "verified");
  const avgTrustScore = verifiedRunners.length > 0
    ? Math.round(verifiedRunners.reduce((s, r) => s + (r.trustScore ?? 50), 0) / verifiedRunners.length)
    : 0;

  // Today's revenue
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayRevenue = allTasks
    .filter(t => t.status === "completed" && t.completedAt && new Date(t.completedAt) >= today)
    .reduce((s, t) => s + Number(t.price || 0), 0);

  return {
    activeUsers,
    activeComrades,
    completedTasks,
    totalUsers,
    totalVerifiedRunners,
    avgAcceptanceTime,
    avgQueueTime,
    avgTrustScore,
    revenueToday: todayRevenue,
  };
}
