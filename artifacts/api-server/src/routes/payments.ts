import { Router, type IRouter } from "express";
import { db, tasksTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireUser } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/**
 * POST /payments/create-order
 *
 * Creates a Razorpay payment order for a task.
 * Called by the frontend after price confirmation, before showing the Razorpay checkout.
 *
 * Input:  { taskId: number }
 * Output: { orderId, amount, currency, receipt, keyId }
 */
router.post("/payments/create-order", requireUser, async (req, res): Promise<void> => {
  const user = req.user;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { taskId } = req.body;

  if (!taskId) { res.status(400).json({ error: "taskId required" }); return; }

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  if (task.userId !== user.id) { res.status(403).json({ error: "Not your task" }); return; }

  // [OFFLINE MODE] All tasks are cash-on-completion — always return cash response
  // To re-enable online payments, uncomment the Razorpay order creation below
  res.json({ orderId: null, method: "cash", price: Number(task.price || 0) });
  return;

  // [OFFLINE MODE] Original Razorpay order creation — uncomment to re-enable
  // const amountPaise = Math.round(Number(task.price || 0) * 100);
  // const receipt = task.invoiceNumber || `task-${task.id}`;
  // if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  //   res.json({ orderId: null, mock: true, amount: amountPaise, currency: "INR", receipt, keyId: null, price: Number(task.price || 0) });
  //   return;
  // }
  // const order = await createOrder(amountPaise, "INR", receipt, { taskId: String(task.id), userId: String(user.id) });
  // if (!order) { res.status(500).json({ error: "Failed to create payment order" }); return; }
  // res.json({ orderId: order.id, amount: order.amount, currency: order.currency, receipt: order.receipt, keyId: process.env.RAZORPAY_KEY_ID, price: Number(task.price || 0) });
});

/**
 * POST /payments/webhook
 *
 * Receives Razorpay webhook events.
 * Must be registered as a webhook URL in the Razorpay dashboard.
 *
 * Handles:
 * - payment.captured: Updates task.paymentStatus → "paid", adds timeline entry, notifies user
 * - payment.failed: Logs the failure
 */// [OFFLINE MODE] Razorpay webhook handler disabled for pilot — uncomment to re-enable
// All payments are now cash-on-completion, no webhooks needed
router.post("/payments/webhook", async (req, res): Promise<void> => {
  // (#5) If Razorpay is configured, webhook handler must NOT be a no-op
  const razorpayConfigured = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;
  if (razorpayConfigured) {
    // Verify webhook signature
    const signature = req.headers["x-razorpay-signature"] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const { verifyWebhookSignature } = await import("../lib/payments") as typeof import("../lib/payments");
      const rawBody = (req as unknown as { rawBody?: string }).rawBody;
      if (!rawBody || !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        logger.warn("Webhook signature verification failed");
        res.status(400).json({ error: "Invalid webhook signature" }); return;
      }
    }
    const { type, payload } = req.body?.event ? req.body : { type: req.body?.event, payload: req.body?.payload };
    logger.info({ type, event: req.body?.event }, "Razorpay webhook received");

    if (type === "payment.captured" || req.body?.event === "payment.captured") {
      const payment = payload?.payment?.entity ?? payload?.payment ?? req.body?.payload?.payment?.entity;
      if (payment?.order_id) {
        // Find task by order_id and mark paid
        const { tasksTable: tTable } = await import("@workspace/db");
        const [task] = await db.select().from(tTable).where(sql`metadata->>'orderId' = ${payment.order_id}`).limit(1);
        if (task && task.paymentStatus !== "paid") {
          await db.update(tTable).set({ paymentStatus: "paid" }).where(eq(tTable.id, task.id));
          logger.info({ taskId: task.id, paymentId: payment.id }, "Payment captured via webhook");
        }
      }
    }
    res.json({ received: true });
  } else {
    logger.info("[OFFLINE MODE] Razorpay webhook received but ignored — payments are cash-on-completion");
    res.json({ received: true, offline: true });
  }
});

export default router;
