import "express";

declare global {
  namespace Express {
    interface Request {
      rawBody?: string;
      user?: import("@workspace/db").User;
      runner?: import("@workspace/db").Runner;
      admin?: { id: number; username: string; role: string };
    }
  }
}
