import { pgTable, text, serial, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { runnersTable } from "./runners";
import { tasksTable } from "./tasks";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  runnerId: integer("runner_id").references(() => runnersTable.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  taskId: integer("task_id").references(() => tasksTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // S5 FIX: Composite indexes for common query patterns
  userIdIsReadIdx: index("idx_notifications_user_read").on(table.userId, table.isRead),
  runnerIdIsReadIdx: index("idx_notifications_runner_read").on(table.runnerId, table.isRead),
  runnerIdIdx: index("idx_notifications_runner_id").on(table.runnerId),
  taskIdIdx: index("idx_notifications_task_id").on(table.taskId),
  typeIdx: index("idx_notifications_type").on(table.type),
}));

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
