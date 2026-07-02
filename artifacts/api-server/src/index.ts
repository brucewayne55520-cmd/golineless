import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import { logger } from "./lib/logger";
import { validateEnv, getFeatureStatus } from "./lib/env-check";
import { initSentry, getSentryErrorHandler } from "./lib/sentry";
import { setIo } from "./lib/socket";
import { getUserFromToken, getRunnerFromToken, getAdminFromToken } from "./lib/auth";
import { db, tasksTable, runnerLocationsTable, runnersTable, usersTable, userSessionsTable, runnerSessionsTable, adminSessionsTable, notificationsTable } from "@workspace/db";
import { eq, lt, and } from "drizzle-orm";

type SocketIdentity = { type: "user" | "runner" | "admin" | "family"; id: number; taskId?: number };

async function resolveSocketIdentity(token: string | null): Promise<SocketIdentity | null> {
  if (!token) return null;
  if (process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN) return { type: "admin", id: 0 };
  const user = await getUserFromToken(token);
  if (user) return { type: "user", id: user.id };
  const runner = await getRunnerFromToken(token);
  if (runner) return { type: "runner", id: runner.id };
  const admin = await getAdminFromToken(token);
  if (admin) return { type: "admin", id: admin.id };
  // Family tracking token: resolve to the specific task
  const [task] = await db.select({ id: tasksTable.id }).from(tasksTable).where(eq(tasksTable.familyTrackingToken, token)).limit(1);
  if (task) return { type: "family", id: 0, taskId: task.id };
  return null;
}

// --- Validate environment at startup ---
const envOk = validateEnv();
if (!envOk) {
  logger.fatal("Missing required environment variables. See above.");
  process.exit(1);
}

logger.info({ features: getFeatureStatus() }, "Feature status");

// --- Initialize Sentry (if configured) ---
await initSentry();

// --- Start Auto-Finalize Cron (#22) ---
import { startAutoFinalizeCron } from "./lib/auto-finalize";
startAutoFinalizeCron();

// --- Fix #13: Session Cleanup Cron — purge expired sessions every 6 hours ---
function startSessionCleanupCron() {
  const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours
  async function purgeExpiredSessions() {
    try {
      const now = new Date();
      const [userDeleted, runnerDeleted, adminDeleted] = await Promise.all([
        db.delete(userSessionsTable).where(lt(userSessionsTable.expiresAt, now)).returning({ id: userSessionsTable.id }),
        db.delete(runnerSessionsTable).where(lt(runnerSessionsTable.expiresAt, now)).returning({ id: runnerSessionsTable.id }),
        db.delete(adminSessionsTable).where(lt(adminSessionsTable.expiresAt, now)).returning({ id: adminSessionsTable.id }),
      ]);
      const total = userDeleted.length + runnerDeleted.length + adminDeleted.length;
      if (total > 0) {
        logger.info({ user: userDeleted.length, runner: runnerDeleted.length, admin: adminDeleted.length }, "Expired sessions purged");
      }
    } catch (err) {
      logger.error({ err }, "Session cleanup failed");
    }
  }
  // Run immediately on startup, then every 6 hours
  purgeExpiredSessions();
  setInterval(purgeExpiredSessions, CLEANUP_INTERVAL_MS);
  logger.info("Session cleanup cron started (every 6h)");
}
startSessionCleanupCron();

// Fix #69: Data Retention Policy — auto-delete old data to prevent unbounded growth
function startDataRetentionCron() {
  const RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000; // every 24 hours
  async function enforceRetention() {
    try {
      const now = new Date();
      const runnerLocationsCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days
      const notificationsCutoff = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days
      const auditCutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year

      const [locDeleted, notifDeleted] = await Promise.all([
        db.delete(runnerLocationsTable).where(lt(runnerLocationsTable.recordedAt, runnerLocationsCutoff)).returning({ id: runnerLocationsTable.id }),
        db.delete(notificationsTable).where(lt(notificationsTable.createdAt, notificationsCutoff)).returning({ id: notificationsTable.id }),
      ]);

      const total = locDeleted.length + notifDeleted.length;
      if (total > 0) {
        logger.info({ locations: locDeleted.length, notifications: notifDeleted.length }, "Data retention cleanup completed");
      }
    } catch (err) {
      logger.error({ err }, "Data retention cleanup failed");
    }
  }
  enforceRetention();
  setInterval(enforceRetention, RETENTION_INTERVAL_MS);
  logger.info("Data retention cron started (every 24h)");
}
startDataRetentionCron();

// Fix #U3: KYC Deadline Reminder — notify users/runners with pending KYC > 7 days
function startKycReminderCron() {
  const REMINDER_INTERVAL_MS = 12 * 60 * 60 * 1000; // every 12 hours
  async function sendKycReminders() {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      // Find users with pending KYC older than 7 days
      const staleUsers = await db
        .select({ id: usersTable.id, name: usersTable.name, phone: usersTable.phone, email: usersTable.email })
        .from(usersTable)
        .where(and(
          eq(usersTable.kycStatus, "pending"),
          lt(usersTable.updatedAt, sevenDaysAgo),
        ));

      // Find runners with pending KYC older than 7 days
      const staleRunners = await db
        .select({ id: runnersTable.id, name: runnersTable.name, phone: runnersTable.phone, email: runnersTable.email })
        .from(runnersTable)
        .where(and(
          eq(runnersTable.kycStatus, "pending"),
          lt(runnersTable.updatedAt, sevenDaysAgo),
        ));

      // Create in-app notifications for each stale submission
      const notifValues: { userId?: number; runnerId?: number; title: string; message: string; type: string; isRead: boolean }[] = [];
      for (const u of staleUsers) {
        notifValues.push({
          userId: u.id,
          title: "KYC Pending — Action Needed",
          message: `Hi ${u.name || 'there'}, your KYC verification has been pending for over 7 days. Please check your submission or contact support.`,
          type: "kyc_reminder",
          isRead: false,
        });
      }
      for (const r of staleRunners) {
        notifValues.push({
          runnerId: r.id,
          title: "KYC Pending — Action Needed",
          message: `Hi ${r.name || 'there'}, your KYC verification has been pending for over 7 days. Please check your submission or contact support.`,
          type: "kyc_reminder",
          isRead: false,
        });
      }

      if (notifValues.length > 0) {
        await db.insert(notificationsTable).values(notifValues);
        logger.info({ users: staleUsers.length, runners: staleRunners.length }, "KYC reminder notifications sent");
      }
    } catch (err) {
      logger.error({ err }, "KYC reminder cron failed");
    }
  }
  sendKycReminders();
  setInterval(sendKycReminders, REMINDER_INTERVAL_MS);
  logger.info("KYC reminder cron started (every 12h)");
}
startKycReminderCron();

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

// Apply Sentry error handler if available
const sentryErrorHandler = getSentryErrorHandler();
if (sentryErrorHandler) {
  app.use(sentryErrorHandler);
}

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000", "http://localhost:5173"];
const io = new SocketIOServer(httpServer, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true },
  path: "/api/socket.io",
  // L3: Socket heartbeat/keepalive for reliable connections
  pingInterval: 25000,
  pingTimeout: 60000,
});
setIo(io);

// --- Socket.IO Auth Hardening ---
const isProduction = process.env.NODE_ENV === "production";
io.use(async (socket, next) => {
  const token = (socket.handshake.auth?.token as string | undefined) || null;
  const identity = await resolveSocketIdentity(token);

  if (isProduction) {
    // In production, require a valid, resolvable identity.
    if (!identity) {
      logger.warn({ socketId: socket.id, ip: socket.handshake.address }, "Socket rejected — invalid/missing auth token");
      next(new Error("Authentication required"));
      return;
    }
    socket.data.identity = identity;
    socket.data.authenticated = true;
    logger.info({ socketId: socket.id, identity }, "Socket authenticated");
    next();
    return;
  }

  // Dev mode: permissive — attach identity if resolvable, else mark unauthenticated.
  socket.data.identity = identity;
  socket.data.authenticated = !!identity;
  next();
});

io.on("connection", (socket) => {
  logger.info({ socketId: socket.id, authenticated: socket.data.authenticated }, "Socket connected");

  // Identity-based authorization helpers. In production, enforce that the
  // socket identity is authorized for the event/room; in dev, stay permissive.
  const identity = socket.data.identity as SocketIdentity | null;
  const isAdmin = identity?.type === "admin";
  const allow = (cond: boolean) => !isProduction || cond;
  const getTaskActors = async (taskId: number) => {
    if (!Number.isFinite(taskId)) return null;
    const [task] = await db
      .select({ userId: tasksTable.userId, runnerId: tasksTable.runnerId })
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1);
    return task ?? null;
  };
  const canJoinTaskRoom = async (taskId: number): Promise<boolean> => {
    if (!isProduction) return true;
    if (!identity) return false;
    if (isAdmin) return true;
    if (identity.type === "family") return identity.taskId === taskId;
    const task = await getTaskActors(taskId);
    if (!task) return false;
    if (identity.type === "user") return task.userId === identity.id;
    if (identity.type === "runner") return task.runnerId === identity.id;
    return false;
  };
  const canWriteTaskRealtime = async (taskId: number): Promise<boolean> => {
    if (!isProduction) return true;
    if (!identity) return false;
    if (isAdmin) return true;
    if (identity.type !== "runner") return false;
    const task = await getTaskActors(taskId);
    return task?.runnerId === identity.id;
  };

  socket.on("runner_location", async (data: { taskId: number; runnerId: number; lat: number; lng: number; heading?: number; speed?: number }) => {
    const { taskId, runnerId, lat, lng, heading = 0, speed = 0 } = data;
    // Only the runner themselves (or an admin) may broadcast/persist a location.
    if (!allow(isAdmin || (identity?.type === "runner" && identity.id === runnerId))) {
      logger.warn({ socketId: socket.id, runnerId }, "Unauthorized runner_location");
      return;
    }
    const room = `task_${taskId}`;
    socket.join(room);

    io.to(room).emit("runner_location_update", { taskId, runnerId, lat, lng, heading, speed, timestamp: Date.now() });

    // Also broadcast to admin fleet room
    io.to("admin_fleet").emit("runner_location_update", { taskId, runnerId, lat, lng, heading, speed, timestamp: Date.now() });

    // Persist location
    try {
      await db.insert(runnerLocationsTable).values({
        runnerId, taskId, lat: lat.toString(), lng: lng.toString(),
        heading: heading.toString(), speed: speed.toString(),
      });
      await db.update(runnersTable).set({ currentLat: lat.toString(), currentLng: lng.toString() }).where(eq(runnersTable.id, runnerId));
    } catch (err) {
      logger.error({ err }, "Failed to persist runner location");
    }
  });

  // Join task room (requires an authenticated identity in production)
  // Family tracking tokens are authorized only for the specific task they were issued for
  socket.on("join_task", async (data: { taskId: number }) => {
    if (identity?.type === "family" && identity.taskId === data.taskId) {
      socket.join(`task_${data.taskId}`);
      logger.info({ socketId: socket.id, taskId: data.taskId }, "Joined task room via family tracking");
      return;
    }
    if (!await canJoinTaskRoom(data.taskId)) {
      logger.warn({ socketId: socket.id, taskId: data.taskId }, "Unauthorized join_task");
      return;
    }
    socket.join(`task_${data.taskId}`);
    logger.info({ socketId: socket.id, taskId: data.taskId }, "Joined task room");
  });

  // Task status update broadcast
  socket.on("task_status_update", async (data: { taskId: number; status: string; timestamp?: string }) => {
    if (!await canWriteTaskRealtime(data.taskId)) {
      logger.warn({ socketId: socket.id, taskId: data.taskId }, "Unauthorized task_status_update");
      return;
    }
    io.to(`task_${data.taskId}`).emit("task_status_changed", data);
    io.to("admin_fleet").emit("task_status_changed", data);
  });

  // Proof photo uploaded event
  socket.on("proof_photo_uploaded", async (data: { taskId: number; proof: Record<string, unknown> }) => {
    if (!await canWriteTaskRealtime(data.taskId)) {
      logger.warn({ socketId: socket.id, taskId: data.taskId }, "Unauthorized proof_photo_uploaded");
      return;
    }
    io.to(`task_${data.taskId}`).emit("new_proof_photo", data);
    io.to("admin_fleet").emit("new_proof_photo", data);
  });

  // Comrade joins the comrades room for dispatch notifications
  socket.on("join_comrades_room", (data: { runnerId: number }) => {
    if (!allow(isAdmin || (identity?.type === "runner" && identity.id === data.runnerId))) {
      logger.warn({ socketId: socket.id, runnerId: data.runnerId }, "Unauthorized join_comrades_room");
      return;
    }
    socket.join("comrades_room");
    socket.join(`comrade_${data.runnerId}`);
    logger.info({ socketId: socket.id, runnerId: data.runnerId }, "Comrade joined dispatch room");
  });

  // Client joins their own notification room
  socket.on("join_user_room", (data: { userId: number }) => {
    if (!allow(isAdmin || (identity?.type === "user" && identity.id === data.userId))) {
      logger.warn({ socketId: socket.id, userId: data.userId }, "Unauthorized join_user_room");
      return;
    }
    socket.join(`user_${data.userId}`);
    logger.info({ socketId: socket.id, userId: data.userId }, "User joined notification room");
  });

  // Comrade broadcasts waiting timer start
  socket.on("waiting_timer_start", async (data: { taskId: number }) => {
    if (!await canWriteTaskRealtime(data.taskId)) {
      logger.warn({ socketId: socket.id, taskId: data.taskId }, "Unauthorized waiting_timer_start");
      return;
    }
    io.to(`task_${data.taskId}`).emit("waiting_timer_update", { taskId: data.taskId, running: true, timestamp: Date.now() });
    io.to("admin_fleet").emit("waiting_timer_update", { taskId: data.taskId, running: true, timestamp: Date.now() });
  });

  // Comrade pauses waiting timer
  socket.on("waiting_timer_pause", async (data: { taskId: number; totalMinutes: number }) => {
    if (!await canWriteTaskRealtime(data.taskId)) {
      logger.warn({ socketId: socket.id, taskId: data.taskId }, "Unauthorized waiting_timer_pause");
      return;
    }
    io.to(`task_${data.taskId}`).emit("waiting_timer_update", { taskId: data.taskId, running: false, totalMinutes: data.totalMinutes, timestamp: Date.now() });
    io.to("admin_fleet").emit("waiting_timer_update", { taskId: data.taskId, running: false, totalMinutes: data.totalMinutes, timestamp: Date.now() });
  });

  // Comrade updates queue progress
  socket.on("queue_progress_update", async (data: { taskId: number; currentToken: string; counterNumber?: string }) => {
    if (!await canWriteTaskRealtime(data.taskId)) {
      logger.warn({ socketId: socket.id, taskId: data.taskId }, "Unauthorized queue_progress_update");
      return;
    }
    io.to(`task_${data.taskId}`).emit("queue_progress", data);
    io.to("admin_fleet").emit("queue_progress", data);
  });

  // Admin joins all-runners room (admin-only in production)
  socket.on("join_admin_map", () => {
    if (!allow(isAdmin)) {
      logger.warn({ socketId: socket.id }, "Unauthorized join_admin_map");
      return;
    }
    socket.join("admin_fleet");
    logger.info({ socketId: socket.id }, "Admin joined fleet map");
  });

  socket.on("disconnect", () => {
    logger.info({ socketId: socket.id }, "Socket disconnected");
  });
});

httpServer.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Go LineLess API server listening");
});

// Fix #87: Graceful shutdown — handle SIGTERM/SIGINT for clean HTTP + Socket.IO teardown
const SHUTDOWN_TIMEOUT_MS = 10_000; // 10 seconds max for graceful shutdown

function gracefulShutdown(signal: string) {
  logger.info({ signal }, "Received shutdown signal — starting graceful shutdown");

  const forceExitTimer = setTimeout(() => {
    logger.fatal("Graceful shutdown timed out — forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  // Stop accepting new connections
  httpServer.close(() => {
    logger.info("HTTP server closed — all connections drained");
    io.close(() => {
      logger.info("Socket.IO server closed");
      clearTimeout(forceExitTimer);
      process.exit(0);
    });
  });
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
