/**
 * SMS module: OTP sending/verification + payment receipt SMS (#33)
 *
 * OTP: Uses Twilio Verify service when configured, falls back to in-memory OTP for dev.
 * Receipts: Sends payment confirmation SMS via Twilio SMS.
 */
import { logger } from "./logger";

// --- Twilio Verify (OTP) ---

let twilioClient: { messages: { create: (params: Record<string, unknown>) => Promise<unknown> }; verify: { v2: { services: (sid: string) => { verifications: { create: (params: Record<string, unknown>) => Promise<unknown> }; verificationChecks: { create: (params: Record<string, unknown>) => Promise<unknown> } } } } } | null = null;
let twilioVerifySid = "";

function getTwilioClient() {
  if (twilioClient) return twilioClient;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  twilioVerifySid = process.env.TWILIO_VERIFY_SID || "";
  if (!accountSid || !authToken) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const twilio = require("twilio");
    twilioClient = twilio(accountSid, authToken);
    logger.info("Twilio client initialized");
    return twilioClient;
  } catch (err) {
    logger.warn({ err }, "Failed to initialize Twilio client");
    return null;
  }
}

// Dev-mode OTP storage (in-memory)
const devOtpStore = new Map<string, { otp: string; expiresAt: number }>();

function generateDevOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send an OTP to the given phone number.
 * Uses Twilio Verify when configured, otherwise generates a dev OTP logged to console.
 */
export async function sendOtp(phone: string): Promise<boolean> {
  const client = getTwilioClient();

  // Production: Twilio Verify
  if (client && twilioVerifySid) {
    try {
      await client.verify.v2.services(twilioVerifySid).verifications.create({
        to: phone,
        channel: "sms",
      });
      logger.info({ phone }, "OTP sent via Twilio Verify");
      return true;
    } catch (err) {
      logger.error({ err, phone }, "Twilio Verify send failed");
      return false;
    }
  }

  // Dev mode: generate and store OTP in memory
  const otp = generateDevOtp();
  devOtpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });
  // Also try to send via Twilio SMS even without Verify service
  if (client && process.env.TWILIO_PHONE_NUMBER) {
    try {
      await client.messages.create({
        body: `Your Go LineLess verification code is: ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
      logger.info({ phone }, "OTP sent via Twilio SMS");
      return true;
    } catch (err) {
      logger.warn({ err, phone }, "Twilio SMS send failed — OTP available in dev logs only");
    }
  }
  if (process.env.NODE_ENV !== "production") {
    logger.info({ phone, otp }, "[DEV OTP]");
  } else {
    logger.warn({ phone }, "[PROD] OTP send failed — no fallback in production");
  }
  return true;
}

/**
 * Verify an OTP code against the given phone number.
 * Uses Twilio Verify when configured, otherwise checks dev OTP store.
 */
export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
  const client = getTwilioClient();

  // Production: Twilio Verify
  if (client && twilioVerifySid) {
    try {
      const check = await client.verify.v2.services(twilioVerifySid).verificationChecks.create({
        to: phone,
        code: otp,
      }) as { status?: string };
      return check.status === "approved";
    } catch (err) {
      logger.error({ err, phone }, "Twilio Verify check failed");
      return false;
    }
  }

  // Dev mode: check in-memory store
  const stored = devOtpStore.get(phone);
  if (!stored) return false;
  if (Date.now() > stored.expiresAt) {
    devOtpStore.delete(phone);
    return false;
  }
  if (stored.otp !== otp) return false;
  devOtpStore.delete(phone);
  return true;
}

// --- Payment Receipt SMS (#33) ---

/**
 * Send a payment receipt SMS to the user after cash payment confirmation.
 */
export async function sendPaymentReceiptSms(opts: {
  phone: string;
  taskId: number;
  amount: number | string;
  runnerName: string;
  invoiceNumber?: string | null;
  category?: string;
}): Promise<boolean> {
  const { phone, taskId, amount, runnerName, invoiceNumber, category } = opts;
  if (!phone) return false;

  const client = getTwilioClient();
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!client || !from) {
    logger.warn({ phone }, "Twilio not configured — skipping receipt SMS");
    return false;
  }

  const body = [
    `Go LineLess — Payment Receipt`,
    ``,
    `${runnerName} confirmed receiving Rs ${amount} cash for Task #${taskId}${category ? ` (${category})` : ""}.`,
    invoiceNumber ? `Invoice: ${invoiceNumber}` : "",
    ``,
    `Please confirm within 24hrs via the app, or dispute if incorrect.`,
    `— Go LineLess`,
  ].filter(Boolean).join("\n");

  try {
    await client.messages.create({ body, from, to: phone });
    logger.info({ phone, taskId }, "Payment receipt SMS sent");
    return true;
  } catch (err) {
    logger.warn({ err, phone }, "Receipt SMS failed");
    return false;
  }
}

/**
 * Send a payment confirmed SMS to the runner.
 */
export async function sendPaymentConfirmedSms(opts: {
  phone: string;
  taskId: number;
  amount: number | string;
  userName: string;
}): Promise<boolean> {
  const { phone, taskId, amount, userName } = opts;
  if (!phone) return false;

  const client = getTwilioClient();
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!client || !from) return false;

  const body = [
    `Go LineLess`,
    ``,
    `${userName || "User"} confirmed cash payment of Rs ${amount} for Task #${taskId}.`,
    `Payment finalized — no dispute filed within 24hrs.`,
    `— Go LineLess`,
  ].filter(Boolean).join("\n");

  try {
    await client.messages.create({ body, from, to: phone });
    logger.info({ phone, taskId }, "Payment confirmed SMS sent to runner");
    return true;
  } catch (err) {
    logger.warn({ err, phone }, "Payment confirmed SMS failed");
    return false;
  }
}
