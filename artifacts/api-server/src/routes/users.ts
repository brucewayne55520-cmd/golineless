import { Router, type IRouter } from "express";
import { db, usersTable, tasksTable, subscriptionsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireUser } from "../lib/auth";

const router: IRouter = Router();

// GET /users/me
router.get("/users/me", requireUser, async (req, res): Promise<void> => {
  const user = req.user!;
  const { otp, otpExpiresAt, ...safe } = user;
  res.json(safe);
});

// PATCH /users/me
router.patch("/users/me", requireUser, async (req, res): Promise<void> => {
  const user = req.user!;
  const { name, email, city, area, language } = req.body;
  const [updated] = await db
    .update(usersTable)
    .set({ name, email, city, area, language })
    .where(eq(usersTable.id, user.id))
    .returning();
  const { otp, otpExpiresAt, ...safe } = updated;
  res.json(safe);
});

// GET /users/me/stats
router.get("/users/me/stats", requireUser, async (req, res): Promise<void> => {
  const user = req.user!;
  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.userId, user.id));
  const completedTasks = tasks.filter(t => t.status === "completed");
  const totalTasks = completedTasks.length;
  const hoursSaved = totalTasks * 2.5; // avg 2.5 hrs saved per task
  const valueSaved = completedTasks.reduce((sum, t) => sum + Number(t.price || 0), 0);
  res.json({ totalTasks, hoursSaved, valueSaved });
});

export default router;
