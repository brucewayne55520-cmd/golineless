import { pgTable, text, serial, timestamp, integer, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { runnersTable } from "./runners";

export const runnerPayoutsTable = pgTable("runner_payouts", {
  id: serial("id").primaryKey(),
  runnerId: integer("runner_id").notNull().references(() => runnersTable.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  taskCount: integer("task_count").notNull().default(0),
  // Integer array of task IDs included in this payout
  taskIds: integer("task_ids").array().notNull().default([]),
  status: text("status").notNull().default("pending"), // pending | settled | cancelled
  settledBy: text("settled_by"), // admin username or "system"
  settledAt: timestamp("settled_at", { withTimezone: true }),
  reference: text("reference"), // UPI ref, bank ref, cash receipt, etc.
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  runnerIdIdx: index("idx_payouts_runner_id").on(table.runnerId),
  statusIdx: index("idx_payouts_status").on(table.status),
  runnerStatusIdx: index("idx_payouts_runner_status").on(table.runnerId, table.status),
  createdAtIdx: index("idx_payouts_created_at").on(table.createdAt),
}));

export const insertRunnerPayoutSchema = createInsertSchema(runnerPayoutsTable).omit({ id: true, createdAt: true });
export type InsertRunnerPayout = z.infer<typeof insertRunnerPayoutSchema>;
export type RunnerPayout = typeof runnerPayoutsTable.$inferSelect;
