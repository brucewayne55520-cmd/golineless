import { Router, type IRouter } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getUserFromToken, getRunnerFromToken, resolveAdmin } from "../lib/auth";

const router: IRouter = Router();

// GET /notifications
router.get("/notifications", async (req, res): Promise<void> => {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) { res.json([]); return; }

  let userId: number | null = null;
  let runnerId: number | null = null;

  const user = await getUserFromToken(token);
  if (user) userId = user.id;
  if (!userId) {
    const runner = await getRunnerFromToken(token);
    if (runner) runnerId = runner.id;
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
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) { res.status(401).json({ error: "Authentication required" }); return; }

  const [notif] = await db.select().from(notificationsTable).where(eq(notificationsTable.id, id));
  if (!notif) { res.status(404).json({ error: "Notification not found" }); return; }

  // Check admin token
  const admin = await resolveAdmin(token);
  if (admin) {
    const [updated] = await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, id)).returning();
    res.json(updated);
    return;
  }

  const user = await getUserFromToken(token);
  if (user) {
    if (notif.userId !== user.id) { res.status(403).json({ error: "You can only read your own notifications" }); return; }
    const [updated] = await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, id)).returning();
    res.json(updated);
    return;
  }

  const runner = await getRunnerFromToken(token);
  if (runner) {
    if (notif.runnerId !== runner.id) { res.status(403).json({ error: "You can only read your own notifications" }); return; }
    const [updated] = await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, id)).returning();
    res.json(updated);
    return;
  }

  res.status(401).json({ error: "Invalid or expired token" });
});

// POST /notifications/read-all
router.post("/notifications/read-all", async (req, res): Promise<void> => {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) { res.status(401).json({ error: "Authentication required" }); return; }

  const user = await getUserFromToken(token);
  if (user) {
    await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, user.id));
    res.json({ message: "All notifications marked as read" });
    return;
  }

  const runner = await getRunnerFromToken(token);
  if (runner) {
    await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.runnerId, runner.id));
    res.json({ message: "All notifications marked as read" });
    return;
  }

  res.status(401).json({ error: "Invalid or expired token" });
});

// B9: POST /admin/notifications/broadcast — duplicate removed (canonical endpoint is in admin.ts)
// The admin.ts version includes audit logging. This file only handles user/runner notification CRUD.

export default router;
