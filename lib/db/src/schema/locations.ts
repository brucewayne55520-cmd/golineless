import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
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
});

export const insertRunnerLocationSchema = createInsertSchema(runnerLocationsTable).omit({ id: true, recordedAt: true });
export type InsertRunnerLocation = z.infer<typeof insertRunnerLocationSchema>;
export type RunnerLocation = typeof runnerLocationsTable.$inferSelect;

export const adminSettingsTable = pgTable("admin_settings", {
  id: serial("id").primaryKey(),
  appName: text("app_name").notNull().default("QBuddy"),
  companyName: text("company_name").notNull().default("IBNAY IFTRIBE PRIVATE LIMITED"),
  supportPhone: text("support_phone").notNull().default("+91-9999999999"),
  supportEmail: text("support_email").notNull().default("support@qbuddy.in"),
  whatsappNumber: text("whatsapp_number").notNull().default("+91-9999999999"),
  runnerPayoutPercent: numeric("runner_payout_percent", { precision: 5, scale: 2 }).notNull().default("70"),
  urgencySurcharge: numeric("urgency_surcharge", { precision: 8, scale: 2 }).notNull().default("50"),
  cancellationFee: numeric("cancellation_fee", { precision: 8, scale: 2 }).notNull().default("0"),
  maxTasksPerRunnerPerDay: integer("max_tasks_per_runner_per_day").notNull().default(20),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
