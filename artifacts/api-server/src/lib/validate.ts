import type { Request, Response, NextFunction } from "express";
import { z } from "@workspace/db";

/**
 * Express middleware factory that validates `req.body` against a Zod schema.
 * On success, the parsed (and coerced) data replaces `req.body`.
 * On failure, responds 400 with flattened validation issues.
 */
export function validateBody<T>(schema: z.ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        details: result.error.issues.map((i: { path: (string | number | symbol)[]; message: string }) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
