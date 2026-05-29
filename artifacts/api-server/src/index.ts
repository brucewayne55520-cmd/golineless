import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import { logger } from "./lib/logger";
import { db, runnerLocationsTable, runnersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  path: "/api/socket.io",
});

io.on("connection", (socket) => {
  logger.info({ socketId: socket.id }, "Socket connected");

  // Runner broadcasts location
  socket.on("runner_location", async (data: { taskId: number; runnerId: number; lat: number; lng: number; heading?: number; speed?: number }) => {
    const { taskId, runnerId, lat, lng, heading = 0, speed = 0 } = data;
    const room = `task_${taskId}`;
    socket.join(room);

    // Broadcast to all in room
    io.to(room).emit("runner_location_update", { taskId, runnerId, lat, lng, heading, speed, timestamp: Date.now() });

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

  // Join task room (users/admin)
  socket.on("join_task", (data: { taskId: number }) => {
    socket.join(`task_${data.taskId}`);
    logger.info({ socketId: socket.id, taskId: data.taskId }, "Joined task room");
  });

  // Task status update broadcast
  socket.on("task_status_update", (data: { taskId: number; status: string }) => {
    io.to(`task_${data.taskId}`).emit("task_status_changed", data);
  });

  // Admin joins all-runners room
  socket.on("join_admin_map", () => {
    socket.join("admin_fleet");
    logger.info({ socketId: socket.id }, "Admin joined fleet map");
  });

  socket.on("disconnect", () => {
    logger.info({ socketId: socket.id }, "Socket disconnected");
  });
});

// Export io for use in routes
export { io };

httpServer.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "QBuddy API server listening");
});
