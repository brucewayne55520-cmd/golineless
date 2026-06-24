import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { runnersTable } from "./runners";
import { usersTable } from "./users";
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
  appName: text("app_name").notNull().default("Go LineLess"),
  companyName: text("company_name").notNull().default("IBNAY IFTRIBE PRIVATE LIMITED"),
  supportPhone: text("support_phone").notNull().default("+91-9999999999"),
  supportEmail: text("support_email").notNull().default("support@golineless.com"),
  whatsappNumber: text("whatsapp_number").notNull().default("+91-9999999999"),
  runnerPayoutPercent: numeric("runner_payout_percent", { precision: 5, scale: 2 }).notNull().default("70"),
  urgencySurcharge: numeric("urgency_surcharge", { precision: 8, scale: 2 }).notNull().default("50"),
  cancellationFee: numeric("cancellation_fee", { precision: 8, scale: 2 }).notNull().default("0"),
  maxTasksPerRunnerPerDay: integer("max_tasks_per_runner_per_day").notNull().default(20),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  // Phase 6: Revenue config
  freeWaitingMinutes: integer("free_waiting_minutes").notNull().default(15),
  waitingChargePerMinute: numeric("waiting_charge_per_minute", { precision: 5, scale: 2 }).notNull().default("2"),
  priorityFeeAmount: numeric("priority_fee_amount", { precision: 8, scale: 2 }).notNull().default("49"),
  emergencyFeeAmount: numeric("emergency_fee_amount", { precision: 8, scale: 2 }).notNull().default("99"),
  urgencyNormalMultiplier: numeric("urgency_normal_multiplier", { precision: 3, scale: 2 }).notNull().default("1.0"),
  urgencyUrgentMultiplier: numeric("urgency_urgent_multiplier", { precision: 3, scale: 2 }).notNull().default("1.25"),
  urgencyEmergencyMultiplier: numeric("urgency_emergency_multiplier", { precision: 3, scale: 2 }).notNull().default("1.5"),
  // Phase 7: GPS Validation
  gpsValidationRadius: integer("gps_validation_radius").notNull().default(250),
  // Phase 7: Waiting Revenue V2 brackets
  waitingBracket1Min: integer("waiting_bracket1_min").notNull().default(30),
  waitingBracket1Charge: numeric("waiting_bracket1_charge", { precision: 8, scale: 2 }).notNull().default("0"),
  waitingBracket2Min: integer("waiting_bracket2_min").notNull().default(60),
  waitingBracket2Charge: numeric("waiting_bracket2_charge", { precision: 8, scale: 2 }).notNull().default("30"),
  waitingBracket3Min: integer("waiting_bracket3_min").notNull().default(120),
  waitingBracket3Charge: numeric("waiting_bracket3_charge", { precision: 8, scale: 2 }).notNull().default("80"),
  waitingBracket4Charge: numeric("waiting_bracket4_charge", { precision: 8, scale: 2 }).notNull().default("150"),
  // Smart Dispatch config
  dispatchInitialRadius: integer("dispatch_initial_radius").notNull().default(3),
  dispatchExpandDelay: integer("dispatch_expand_delay").notNull().default(60),
  dispatchMaxRadius: integer("dispatch_max_radius").notNull().default(20),
  // Phase 9.3: Queue ETA multipliers
  queueEtaMultiplierHospital: numeric("queue_eta_multiplier_hospital", { precision: 3, scale: 1 }).notNull().default("5"),
  queueEtaMultiplierBank: numeric("queue_eta_multiplier_bank", { precision: 3, scale: 1 }).notNull().default("2"),
  queueEtaMultiplierGovt: numeric("queue_eta_multiplier_govt", { precision: 3, scale: 1 }).notNull().default("8"),
  queueEtaMultiplierDefault: numeric("queue_eta_multiplier_default", { precision: 3, scale: 1 }).notNull().default("3"),
  // Phase 9: Pilot Launch Mode
  pilotMode: boolean("pilot_mode").notNull().default(false),
  pilotCategories: text("pilot_categories").array().notNull().default(["medicine","document","bank","govt_office","courier","senior_care"]),
  // UPI Configuration
  upiId: text("upi_id").notNull().default("golineless@upi"),
  upiPayeeName: text("upi_payee_name").notNull().default("Go LineLess"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// Push Notification Foundation (future FCM integration)
export const deviceTokensTable = pgTable("device_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  runnerId: integer("runner_id").references(() => runnersTable.id),
  token: text("token").notNull(),
  platform: text("platform"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
