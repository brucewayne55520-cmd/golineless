import { pgTable, text, serial, timestamp, integer, boolean, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tasksTable } from "./tasks";
import { runnersTable } from "./runners";

export const qualityReviewsTable = pgTable("quality_reviews", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasksTable.id),
  runnerId: integer("runner_id").notNull().references(() => runnersTable.id),
  customerRating: integer("customer_rating"), // 1-5
  customerFeedback: text("customer_feedback"),
  runnerFeedback: text("comrade_feedback"),
  taskQualityScore: integer("task_quality_score"), // 0-100 computed
  slaGrade: text("sla_grade"), // excellent, good, average, poor
  acceptanceTimeSeconds: integer("acceptance_time_seconds"),
  arrivalTimeMinutes: integer("arrival_time_minutes"),
  completionTimeMinutes: integer("completion_time_minutes"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  taskIdIdx: index("idx_qr_task_id").on(table.taskId),
  runnerIdIdx: index("idx_qr_runner_id").on(table.runnerId),
  slaGradeIdx: index("idx_qr_sla_grade").on(table.slaGrade),
  createdAtIdx: index("idx_qr_created_at").on(table.createdAt),
}));

export const insertQualityReviewSchema = createInsertSchema(qualityReviewsTable).omit({ id: true, createdAt: true });
export type InsertQualityReview = z.infer<typeof insertQualityReviewSchema>;
export type QualityReview = typeof qualityReviewsTable.$inferSelect;
