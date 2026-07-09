import { Router, type IRouter } from "express";
import { db, adminSettingsTable } from "@workspace/db";
import { getRevenueConfig, getPriorityFee, getUrgencyMultiplier, calculateTaskRevenue } from "../lib/revenue-engine";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const CATEGORY_PRICES: Record<string, number> = {
  hospital: 149, govt_office: 179, bank: 129, document: 139,
  medicine: 99, senior_care: 199, errand: 89, emergency: 299,
};

const DISTANCE_CHARGES: Record<string, number> = { "0-2": 0, "2-5": 20, "5+": 50 };

/**
 * POST /pricing/preview
 *
 * Authoritative backend pricing calculation.
 * Frontend must call this endpoint and display the result — never calculate locally.
 *
 * Input:  { category, distanceBand, urgency, priorityLevel, couponCode }
 * Output: { price, breakdown, appliedCoupon }
 */
router.post("/pricing/preview", async (req, res): Promise<void> => {
  try {
    const {
      category = "hospital",
      distanceBand = "0-2",
      urgency = "normal",
      priorityLevel = "normal",
      couponCode,
    } = req.body;

    const revenueConfig = await getRevenueConfig();

    const basePrice = CATEGORY_PRICES[category] ?? 149;
    const distanceCharge = DISTANCE_CHARGES[distanceBand] ?? 0;
    const urgencyCharge = urgency === "urgent" ? 50 : 0;
    const priorityFee = getPriorityFee(priorityLevel, revenueConfig);
    const urgencyMultiplier = getUrgencyMultiplier(urgency, revenueConfig);

    const revenue = calculateTaskRevenue({
      basePrice,
      distanceCharge,
      urgencyCharge,
      waitingChargeAmount: 0,
      priorityFee,
      urgencyMultiplier,
      runnerPayoutPercent: 70,
    });

    let finalPrice = revenue.price;
    let discountAmount = 0;
    let appliedCoupon: string | null = null;

    // M2: Check configurable coupons from admin settings
    const [couponSettings] = await db.select({ activeCoupons: adminSettingsTable.activeCoupons }).from(adminSettingsTable).limit(1);
    const activeCoupons = couponSettings?.activeCoupons ?? ["GOLINELESS10"];
    if (couponCode && activeCoupons.map(c => c.toUpperCase()).includes(couponCode.toUpperCase())) {
      discountAmount = Math.round(revenue.price * 0.1);
      finalPrice -= discountAmount;
      appliedCoupon = couponCode.toUpperCase();
    }

    res.json({
      price: finalPrice,
      originalPrice: revenue.price,
      discountAmount,
      appliedCoupon,
      breakdown: {
        basePrice,
        distanceCharge,
        urgencyCharge,
        priorityFee,
        urgencyMultiplier,
        subtotalBeforeMultiplier: basePrice + distanceCharge + urgencyCharge,
        subtotalAfterMultiplier: (basePrice + distanceCharge + urgencyCharge) * urgencyMultiplier,
        runnerEarning: revenue.runnerEarning,
        platformFee: revenue.platformFee,
      },
      meta: {
        calculatedAt: new Date().toISOString(),
        authoritative: true,
        note: "Final price confirmed at booking. May vary with waiting charges.",
      },
    });
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error("Unknown error");
    logger.error({ err: e }, "Pricing preview error");
    res.status(500).json({ error: "Pricing calculation failed", detail: (e as Error).message || "Unknown error" });
  }
});

export default router;
