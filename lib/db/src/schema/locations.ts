import { pgTable, text, serial, timestamp, integer, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { runnersTable } from "./runners";
import { tasksTable } from "./tasks";

export const runnerLocationsTable = pgTable("runner_locations", {
  id: serial("id").primaryKey(),
  runnerId: integer("runner_id").notNull().references(() => runnersTable.id),
  taskId: integer("task_id").references(() => tasksTable.id),
  lat: numeric("lat", { precision: 10, scale: 8 }).notNull(),
  lng: numeric("lng", { precision: 11, scale: 8 }).notNull(),
  heading: numeric("heading", { precision: 5, scale: 2 }).default("0"),
  speed: numeric("speed", { precision: 5, scale: 2 }).default("0"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  runnerIdIdx: index("idx_runner_locations_runner_id").on(table.runnerId),
  taskIdIdx: index("idx_runner_locations_task_id").on(table.taskId),
  recordedAtIdx: index("idx_runner_locations_recorded_at").on(table.recordedAt),
  runnerRecordedIdx: index("idx_runner_locations_runner_recorded").on(table.runnerId, table.recordedAt),
}));

export const insertRunnerLocationSchema = createInsertSchema(runnerLocationsTable).omit({ id: true, recordedAt: true });
export type InsertRunnerLocation = z.infer<typeof insertRunnerLocationSchema>;
export type RunnerLocation = typeof runnerLocationsTable.$inferSelect;
