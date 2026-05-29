import { Router, type IRouter } from "express";
import { db, subscriptionPlansTable, subscriptionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireUser } from "../lib/auth";

const router: IRouter = Router();

// GET /subscriptions/plans
router.get("/subscriptions/plans", async (_req, res): Promise<void> => {
  const plans = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.isActive, true));
  res.json(plans.map(p => ({
    ...p,
    priceMonthly: Number(p.priceMonthly),
    priceYearly: Number(p.priceYearly),
  })));
});

// GET /subscriptions/me
router.get("/subscriptions/me", requireUser, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const [sub] = await db.select().from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.userId, user.id), eq(subscriptionsTable.status, "active")))
    .limit(1);
  if (!sub) { res.status(404).json({ error: "No active subscription" }); return; }
  res.json({ ...sub, amount: Number(sub.amount) });
});

// POST /subscriptions
router.post("/subscriptions", requireUser, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { planId, billingCycle = "monthly" } = req.body;

  const [plan] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, planId));
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }

  const amount = billingCycle === "yearly" ? Number(plan.priceYearly) : Number(plan.priceMonthly);
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + (billingCycle === "yearly" ? 12 : 1));

  // Cancel existing
  await db.update(subscriptionsTable).set({ status: "cancelled" })
    .where(and(eq(subscriptionsTable.userId, user.id), eq(subscriptionsTable.status, "active")));

  const [sub] = await db.insert(subscriptionsTable).values({
    userId: user.id, planId, planName: plan.name, billingCycle,
    tasksPerMonth: plan.tasksPerMonth, amount: amount.toString(), endDate,
  }).returning();

  res.status(201).json({ ...sub, amount: Number(sub.amount) });
});

export default router;
