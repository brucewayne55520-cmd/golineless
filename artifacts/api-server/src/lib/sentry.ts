import { logger } from "./logger";
import type { ErrorRequestHandler } from "express";
import type * as SentryTypes from "@sentry/node";

const SENTRY_DSN = process.env["SENTRY_DSN"] ?? "";

/**
 * Sentry is optionally initialized. If SENTRY_DSN is not set,
 * all sentry calls are no-ops so the app works without it.
 */

let Sentry: typeof SentryTypes | null = null;

export async function initSentry(): Promise<void> {
  if (!SENTRY_DSN) {
    logger.info("Sentry not configured — skipping initialization");
    return;
  }

  try {
    Sentry = await import("@sentry/node");
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env["NODE_ENV"] ?? "development",
      tracesSampleRate: 0.2,
      sampleRate: 1.0,
      integrations: [],
    });
    logger.info("Sentry initialized");
  } catch (err) {
    logger.error({ err }, "Failed to initialize Sentry");
    Sentry = null;
  }
}

export function captureException(err: Error, context?: Record<string, unknown>): void {
  if (Sentry) {
    if (context) {
      Sentry.withScope((scope: SentryTypes.Scope) => {
        scope.setExtras(context);
        Sentry!.captureException(err);
      });
    } else {
      Sentry.captureException(err);
    }
  }
}

/**
 * Get the Express error handler from Sentry.
 * Returns null if Sentry is not configured or if Handlers.errorHandler is unavailable.
 */
export function getSentryErrorHandler(): ErrorRequestHandler | null {
  if (!Sentry) return null;
  const errorHandler = (Sentry as unknown as { Handlers?: { errorHandler?: () => ErrorRequestHandler } }).Handlers?.errorHandler?.();
  return errorHandler ?? null;
}

export { Sentry };
