import { pgTable, text, serial, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";
import { runnersTable } from "./runners";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const trainingModulesTable = pgTable("training_modules", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  isRequired: boolean("is_required").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const runnerTrainingTable = pgTable("runner_training", {
  id: serial("id").primaryKey(),
  runnerId: integer("runner_id").notNull().references(() => runnersTable.id),
  moduleId: integer("module_id").notNull().references(() => trainingModulesTable.id),
  completed: boolean("completed").notNull().default(false),
  score: integer("score"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  runnerIdIdx: index("idx_rt_runner_id").on(table.runnerId),
  moduleIdIdx: index("idx_rt_module_id").on(table.moduleId),
  runnerModuleIdx: index("idx_rt_runner_module").on(table.runnerId, table.moduleId),
  completedIdx: index("idx_rt_completed").on(table.completed),
}));

export const insertTrainingModuleSchema = createInsertSchema(trainingModulesTable).omit({ id: true, createdAt: true });
export const insertRunnerTrainingSchema = createInsertSchema(runnerTrainingTable).omit({ id: true, createdAt: true });
export type InsertTrainingModule = z.infer<typeof insertTrainingModuleSchema>;
export type TrainingModule = typeof trainingModulesTable.$inferSelect;
export type RunnerTraining = typeof runnerTrainingTable.$inferSelect;
