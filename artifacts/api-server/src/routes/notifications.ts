import { Router, type IRouter } from "express";
import { db, notificationsTable, userSessionsTable, runnerSessionsTable } from "@workspace/db";
import { eq, or, desc } from "drizzle-orm";

const router: IRouter = Router();

// GET /notifications
router.get("/notifications", async (req, res): Promise<void> => {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) { res.json([]); return; }

  let userId: number | null = null;
  let runnerId: number | null = null;

  const [us] = await db.select().from(userSessionsTable).where(eq(userSessionsTable.token, token));
  if (us) userId = us.userId;
  if (!userId) {
    const [rs] = await db.select().from(runnerSessionsTable).where(eq(runnerSessionsTable.token, token));
    if (rs) runnerId = rs.runnerId;
  }

  if (!userId && !runnerId) { res.json([]); return; }

  const notifs = await db.select().from(notificationsTable)
    .where(userId ? eq(notificationsTable.userId, userId) : eq(notificationsTable.runnerId, runnerId!))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  res.json(notifs);
});

// PATCH /notifications/:id/read
router.patch("/notifications/:id/read", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [notif] = await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, id)).returning();
  if (!notif) { res.status(404).json({ error: "Not found" }); return; }
  res.json(notif);
});

// POST /notifications/read-all
router.post("/notifications/read-all", async (req, res): Promise<void> => {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) { res.json({ message: "done" }); return; }

  const [us] = await db.select().from(userSessionsTable).where(eq(userSessionsTable.token, token));
  if (us) {
    await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, us.userId));
  }
  res.json({ message: "All notifications marked as read" });
});

export default router;
