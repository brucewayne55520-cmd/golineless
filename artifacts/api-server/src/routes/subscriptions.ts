import { Router, type IRouter } from "express";
import { db, subscriptionPlansTable, subscriptionsTable, z } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireUser, requireAdmin } from "../lib/auth";
import { validateBody } from "../lib/validate";

const router: IRouter = Router();

const createSubscriptionSchema = z.object({
  planId: z.string().min(1),
  billingCycle: z.enum(["monthly", "yearly"]).optional(),
}).passthrough();

// GET /subscriptions/plans
router.get("/subscriptions/plans", async (_req, res): Promise<void> => {
  const plans = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.isActive, true));
  res.json(plans.map(p => ({
    ...p,
    priceMonthly: Number(p.priceMonthly),
    priceYearly: Number(p.priceYearly),
  })));
});

// POST /subscriptions/create-order
router.post("/subscriptions/create-order", requireUser, validateBody(createSubscriptionSchema), async (req, res): Promise<void> => {
  const user = req.user;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { planId, billingCycle = "monthly" } = req.body;

  const [plan] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, planId));
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }

  const amountPaise = Math.round((billingCycle === "yearly" ? Number(plan.priceYearly) : Number(plan.priceMonthly)) * 100);
  const receipt = `sub-${planId}-${Date.now()}`;

  // [OFFLINE MODE] Subscription orders return mock — no online payment needed for pilot
  // To re-enable Razorpay, uncomment the order creation below
  res.json({
    orderId: null,
    mock: true,
    amount: amountPaise,
    currency: "INR",
    receipt,
    keyId: null,
    price: amountPaise / 100,
  });
  return;

  // [OFFLINE MODE] Original Razorpay subscription order creation — uncomment to re-enable
  // const { createOrder } = await import("../lib/payments");
  // const order = await createOrder(amountPaise, "INR", receipt, { planId, userId: String(user.id) });
  // if (!order) { res.status(500).json({ error: "Failed to create payment order" }); return; }
  // res.json({ orderId: order.id, amount: order.amount, currency: order.currency, receipt: order.receipt, keyId: process.env.RAZORPAY_KEY_ID, price: amountPaise / 100 });
});

// GET /subscriptions/me
router.get("/subscriptions/me", requireUser, async (req, res): Promise<void> => {
  const user = req.user;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [sub] = await db.select().from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.userId, user.id), eq(subscriptionsTable.status, "active")))
    .limit(1);
  if (!sub) { res.status(404).json({ error: "No active subscription" }); return; }
  res.json({ ...sub, amount: Number(sub.amount) });
});

// POST /subscriptions
router.post("/subscriptions", requireUser, validateBody(createSubscriptionSchema), async (req, res): Promise<void> => {
  const user = req.user;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
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

// GET /admin/subscriptions — list all subscriptions (admin)
router.get("/admin/subscriptions", requireAdmin, async (_req, res): Promise<void> => {
  const subs = await db.select().from(subscriptionsTable).orderBy(desc(subscriptionsTable.createdAt));
  res.json(subs.map(s => ({ ...s, amount: Number(s.amount) })));
});

// PATCH /admin/subscriptions/:id — update subscription status (admin)
router.patch("/admin/subscriptions/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { status } = req.body;
  if (!status || !["active", "cancelled", "expired"].includes(status)) {
    res.status(400).json({ error: "status must be active, cancelled, or expired" }); return;
  }
  const [existing] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Subscription not found" }); return; }
  const [updated] = await db.update(subscriptionsTable).set({ status }).where(eq(subscriptionsTable.id, id)).returning();
  res.json({ ...updated, amount: Number(updated.amount) });
});

// PATCH /admin/subscriptions/:id/cancel — cancel a subscription (admin)
router.patch("/admin/subscriptions/:id/cancel", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [existing] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Subscription not found" }); return; }
  if (existing.status !== "active") { res.status(400).json({ error: "Subscription is not active" }); return; }
  const [updated] = await db.update(subscriptionsTable).set({ status: "cancelled" }).where(eq(subscriptionsTable.id, id)).returning();
  res.json({ ...updated, amount: Number(updated.amount), message: "Subscription cancelled" });
});

export default router;
