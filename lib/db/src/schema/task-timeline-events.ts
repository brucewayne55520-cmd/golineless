import { pgTable, text, serial, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tasksTable } from "./tasks";

// ============================================================
// Task Timeline Events — Individual event records extracted
// from the legacy `tasksTable.taskTimeline` text array.
//
// Each row stores one timeline event (status change, proof
// photo upload, payment update, queue update, etc.).
//
// Columns are typed from the existing makeTimelineEntry shape:
//   { status, label, timestamp, ...extras }
//
// Extras vary by event type and include:
//   runnerId, userId, amount, proofType, disputeReason, etc.
// They are stored in the `metadata` JSONB column for flexibility.
// ============================================================
export const taskTimelineEventsTable = pgTable("task_timeline_events", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasksTable.id),
  status: text("status").notNull(),
  // pending | assigned | on_the_way | reached_pickup | reached_task_location |
  // in_progress | completed | cancelled | proof_photo | cash_pending |
  // cash_confirmed | cash_disputed | refunded | otp_verified | payment_pending |
  // queue_updated | waiting_started | waiting_paused | waiting_completed
  label: text("label").notNull(),
  eventTimestamp: timestamp("event_timestamp", { withTimezone: true }).notNull(),
  metadata: jsonb("metadata"),                // { runnerId?, userId?, amount?, proofType?, disputeReason?, ... }
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  taskIdx: index("idx_timeline_task_id").on(table.taskId),
  statusIdx: index("idx_timeline_status").on(table.status),
  eventTimestampIdx: index("idx_timeline_event_timestamp").on(table.eventTimestamp),
  taskStatusIdx: index("idx_timeline_task_status").on(table.taskId, table.status),
}));

export const insertTaskTimelineEventSchema = createInsertSchema(taskTimelineEventsTable).omit({ id: true, createdAt: true });
export type InsertTaskTimelineEvent = z.infer<typeof insertTaskTimelineEventSchema>;
export type TaskTimelineEvent = typeof taskTimelineEventsTable.$inferSelect;
