import Razorpay from "razorpay";
import { createHmac } from "crypto";
import { logger } from "./logger";

/**
 * Get a Razorpay client instance.
 * Returns null if RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET are not configured
 * (graceful fallback for dev mode).
 */
function getClient(): Razorpay | null {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

/**
 * Create a payment order on Razorpay.
 *
 * @param amount - Amount in **paise** (e.g., 14900 for Rs 149)
 * @param currency - Currency code, defaults to INR
 * @param receipt - Unique receipt identifier (usually the invoice number)
 * @param notes - Optional metadata (taskId, userId, etc.)
 * @returns The Razorpay order object, or null if Razorpay is not configured
 */
interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  [key: string]: unknown;
}

interface RazorpayPayment extends Record<string, unknown> {
  id: string;
  status?: string;
  amount?: number;
}

export async function createOrder(
  amount: number,
  currency = "INR",
  receipt: string,
  notes?: Record<string, string>,
): Promise<RazorpayOrder | null> {
  const client = getClient();
  if (!client) {
    logger.warn({ amount, currency, receipt }, "[DEV] Razorpay not configured — skipping order creation");
    return null;
  }

  try {
    const result = await client.orders.create({
      amount,
      currency,
      receipt,
      payment_capture: true, // Auto-capture on payment
      notes: notes ?? {},
    });
    const order = result as unknown as RazorpayOrder;
    logger.info({ orderId: order.id, amount, receipt }, "Razorpay order created");
    return order;
  } catch (err) {
    logger.error({ err, amount, receipt }, "Failed to create Razorpay order");
    return null;
  }
}

/**
 * Capture a payment that was authorized but not yet captured.
 * Reserved for future use (e.g., manual payment capture flows).
 *
 * @param paymentId - Razorpay payment_id
 * @param amount - Amount in paise to capture
 * @returns The captured payment object, or null on failure
 */
export async function capturePayment(paymentId: string, amount: number): Promise<RazorpayPayment | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const result = await client.payments.capture(paymentId, amount, "INR");
    const payment = result as unknown as RazorpayPayment;
    logger.info({ paymentId, amount }, "Payment captured");
    return payment;
  } catch (err) {
    logger.error({ err, paymentId, amount }, "Failed to capture payment");
    return null;
  }
}

/**
 * Verify a Razorpay webhook signature.
 *
 * @param body - Raw request body (string or Buffer)
 * @param signature - The value of the `x-razorpay-signature` header
 * @param secret - The webhook secret from Razorpay dashboard
 * @returns true if the signature is valid
 */
export function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return expected === signature;
}
