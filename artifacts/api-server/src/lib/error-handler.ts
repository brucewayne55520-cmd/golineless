import type { Request, Response, NextFunction } from "express";
import { logger } from "./logger";
import { captureException } from "./sentry";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// Fix #82: Extract request ID from pino-http or generate one for error responses
function getRequestId(req: Request): string | undefined {
  // pino-http attaches req.id by default
  return (req as { id?: string }).id;
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: "Not found",
    message: "The requested resource does not exist",
    requestId: getRequestId(_req),
  });
}

export function globalErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Fix #85: Include request context (method, path, IP) in error logs
  const requestContext = {
    method: _req.method,
    path: _req.path,
    ip: _req.ip,
    requestId: getRequestId(_req),
  };

  if (err instanceof AppError) {
    logger.warn(
      { statusCode: err.statusCode, details: err.details, ...requestContext },
      err.message,
    );
    res.status(err.statusCode).json({
      error: err.message,
      requestId: getRequestId(_req),
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Multer file size / type errors
  if (err.message?.startsWith("Only image files") || err.message?.includes("File too large")) {
    res.status(400).json({ error: err.message, requestId: getRequestId(_req) });
    return;
  }

  logger.error({ err, ...requestContext }, "Unhandled error");
  captureException(err, { ...requestContext, userAgent: _req.headers["user-agent"] });
  res.status(500).json({
    error: "Internal server error",
    requestId: getRequestId(_req),
    ...(process.env.NODE_ENV !== "production" ? { details: err.message } : {}),
  });
}
