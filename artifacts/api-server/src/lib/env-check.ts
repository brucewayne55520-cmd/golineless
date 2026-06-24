import { logger } from "./logger";

export interface EnvCheck {
  name: string;
  required: boolean;
  value?: string;
  help?: string;
}

export const REQUIRED_VARS: EnvCheck[] = [
  { name: "PORT", required: true, help: "HTTP server port (e.g., 3001)" },
  { name: "DATABASE_URL", required: true, help: "PostgreSQL connection string" },
  { name: "ADMIN_TOKEN", required: true, help: "Secret admin API token (generate with: openssl rand -hex 32)" },
  { name: "NODE_ENV", required: false, help: "Set to 'production' in prod (default: development)" },
  { name: "ALLOWED_ORIGINS", required: false, help: "Comma-separated CORS origins" },
  { name: "LOG_LEVEL", required: false, help: "Pino log level: trace|debug|info|warn|error|fatal (default: info)" },
  { name: "TWILIO_ACCOUNT_SID", required: false, help: "Twilio account SID — enables WhatsApp OTP in production" },
  { name: "TWILIO_AUTH_TOKEN", required: false, help: "Twilio authentication token — enables WhatsApp OTP in production" },
  { name: "TWILIO_VERIFY_SERVICE_SID", required: false, help: "Twilio Verify Service SID — enables SMS OTP via Twilio Verify" },
  { name: "RAZORPAY_KEY_ID", required: false, help: "Razorpay payment gateway key ID" },
  { name: "RAZORPAY_KEY_SECRET", required: false, help: "Razorpay payment gateway key secret" },
  { name: "RAZORPAY_WEBHOOK_SECRET", required: false, help: "Razorpay webhook signature secret" },
  { name: "B2_KEY_ID", required: false, help: "Backblaze B2 application key ID (for photo storage)" },
  { name: "B2_APPLICATION_KEY", required: false, help: "Backblaze B2 application key (for photo storage)" },
  { name: "B2_BUCKET_NAME", required: false, help: "Backblaze B2 bucket name (for photo storage)" },
  { name: "B2_ENDPOINT", required: false, help: "Backblaze B2 S3 endpoint (default: https://s3.us-west-004.backblazeb2.com)" },
  { name: "SENTRY_DSN", required: false, help: "Sentry DSN for error monitoring" },
  { name: "SENTRY_AUTH_TOKEN", required: false, help: "Sentry auth token for source map uploads" },
];

/**
 * Validate environment variables at startup.
 * Returns true if all required vars are set, logs warnings for optional ones.
 */
export function validateEnv(): boolean {
  let allValid = true;

  for (const v of REQUIRED_VARS) {
    v.value = process.env[v.name];
    if (v.required && !v.value) {
      logger.error({ var: v.name, help: v.help }, `Missing required environment variable: ${v.name}`);
      allValid = false;
    } else if (!v.value && v.help) {
      logger.warn({ var: v.name, help: v.help }, `Optional env var ${v.name} is not set`);
    }
  }

  // Fix #86: Exit immediately for critical vars (PORT is already handled in index.ts)
  if (!process.env["DATABASE_URL"]) {
    logger.fatal("DATABASE_URL is required but missing. Cannot start without a database connection.");
  }
  if (!process.env["ADMIN_TOKEN"]) {
    logger.fatal("ADMIN_TOKEN is required but missing. Cannot start without admin authentication.");
  }

  return allValid;
}

/**
 * Get a summary of configured vs missing optional features.
 */
export function getFeatureStatus(): Record<string, "configured" | "missing"> {
  return {
    sms: process.env["TWILIO_ACCOUNT_SID"] && process.env["TWILIO_AUTH_TOKEN"] && process.env["TWILIO_VERIFY_SERVICE_SID"] ? "configured" : "missing",
    payments: process.env["RAZORPAY_KEY_ID"] && process.env["RAZORPAY_KEY_SECRET"] ? "configured" : "missing",
    storage: process.env["B2_KEY_ID"] && process.env["B2_APPLICATION_KEY"] && process.env["B2_BUCKET_NAME"] ? "configured" : "missing",
    monitoring: process.env["SENTRY_DSN"] ? "configured" : "missing",
  };
}
