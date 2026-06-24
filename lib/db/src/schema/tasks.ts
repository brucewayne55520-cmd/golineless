import { pgTable, text, serial, timestamp, integer, boolean, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { runnersTable } from "./runners";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  runnerId: integer("runner_id").references(() => runnersTable.id),
  category: text("category").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"),
  urgency: text("urgency").notNull().default("normal"),
  locationName: text("location_name"),
  locationArea: text("location_area"),
  locationCity: text("location_city"),
  locationLat: numeric("location_lat", { precision: 10, scale: 8 }),
  locationLng: numeric("location_lng", { precision: 11, scale: 8 }),
  distanceBand: text("distance_band"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  basePrice: numeric("base_price", { precision: 8, scale: 2 }).notNull().default("0"),
  distanceCharge: numeric("distance_charge", { precision: 8, scale: 2 }).notNull().default("0"),
  urgencyCharge: numeric("urgency_charge", { precision: 8, scale: 2 }).notNull().default("0"),
  price: numeric("price", { precision: 8, scale: 2 }).notNull().default("0"),
  runnerEarning: numeric("runner_earning", { precision: 8, scale: 2 }).notNull().default("0"),
  platformFee: numeric("platform_fee", { precision: 8, scale: 2 }).notNull().default("0"),
  paymentMethod: text("payment_method").notNull().default("cash"), // Default to cash for pilot mode (#6)
  paymentStatus: text("payment_status").notNull().default("pending"),
  paymentConfirmedBy: integer("payment_confirmed_by"), // (#1) Runner ID who confirmed cash
  paymentConfirmedAt: timestamp("payment_confirmed_at", { withTimezone: true }), // (#1) When cash was confirmed
  paidAmount: numeric("paid_amount", { precision: 8, scale: 2 }).notNull().default("0"), // (#12) Tracks how much has been paid (for partial payments)
  couponCode: text("coupon_code"),
  discountAmount: numeric("discount_amount", { precision: 8, scale: 2 }).notNull().default("0"),
  otp: text("otp"),
  otpVerified: boolean("otp_verified").notNull().default(false),
  seniorInvolved: boolean("senior_involved").notNull().default(false),
  specialInstructions: text("special_instructions"),
  proofPhotos: text("proof_photos").array().notNull().default([]),
  cancelReason: text("cancel_reason"),
  internalNotes: text("internal_notes"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  // Comrade Dispatch + Live Proof fields
  pickupRequired: boolean("pickup_required").notNull().default(false),
  pickupAddress: text("pickup_address"),
  pickupArea: text("pickup_area"),
  pickupLat: numeric("pickup_lat", { precision: 10, scale: 8 }),
  pickupLng: numeric("pickup_lng", { precision: 11, scale: 8 }),
  taskLat: numeric("task_lat", { precision: 10, scale: 8 }),
  taskLng: numeric("task_lng", { precision: 11, scale: 8 }),
  fromArea: text("from_area"),
  toArea: text("to_area"),
  estimatedDurationMinutes: integer("estimated_duration_minutes"),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  reachedPickupAt: timestamp("reached_pickup_at", { withTimezone: true }),
  reachedTaskLocationAt: timestamp("reached_task_location_at", { withTimezone: true }),
  taskTimeline: text("task_timeline").array().notNull().default([]),
  // Phase 6: Revenue Engine
  priorityLevel: text("priority_level").notNull().default("normal"),
  priorityFee: numeric("priority_fee", { precision: 8, scale: 2 }).notNull().default("0"),
  waitingChargeAmount: numeric("waiting_charge_amount", { precision: 8, scale: 2 }).notNull().default("0"),
  waitingEarnings: numeric("waiting_earnings", { precision: 8, scale: 2 }).notNull().default("0"),
  bonusEarnings: numeric("bonus_earnings", { precision: 8, scale: 2 }).notNull().default("0"),
  invoiceNumber: text("invoice_number"),
  // Phase 2: Waiting Timer
  waitingStartedAt: timestamp("waiting_started_at", { withTimezone: true }),
  waitingEndedAt: timestamp("waiting_ended_at", { withTimezone: true }),
  totalWaitingMinutes: integer("total_waiting_minutes"),
  // Phase 2: Queue Intelligence
  queueType: text("queue_type"),
  tokenNumber: text("token_number"),
  currentToken: text("current_token"),
  counterNumber: text("counter_number"),
  // Phase 2: Family Tracking
  familyContactName: text("family_contact_name"),
  familyContactPhone: text("family_contact_phone"),
  familyTrackingToken: text("family_tracking_token"),
  familyTokenExpiresAt: timestamp("family_token_expires_at", { withTimezone: true }),
  // Phase 7: GPS Validation
  gpsVerified: boolean("gps_verified"),
  gpsDistanceFromTask: integer("gps_distance_from_task"),
  // Phase 7.1: OTP Security
  otpAttempts: integer("otp_attempts").notNull().default(0),
  otpExpiresAt: timestamp("otp_expires_at", { withTimezone: true }),
  otpLockedUntil: timestamp("otp_locked_until", { withTimezone: true }),
  // Phase 7: Fraud Prevention
  fraudFlags: text("fraud_flags").array().notNull().default([]),
  // Phase 4: Queue Intelligence Engine
  expectedTokenNumber: text("expected_token_number"),
  queueGap: integer("queue_gap"),
  estimatedWaitMinutes: integer("estimated_wait_minutes"),
  queueProgressPercent: integer("queue_progress_percent"),
  queueNotes: text("queue_notes"),
  // Phase 3: Smart Dispatch Metrics
  dispatchAttempts: integer("dispatch_attempts").notNull().default(0),
  dispatchRadiusUsed: integer("dispatch_radius_used").notNull().default(0),
  dispatchNotifiedCount: integer("dispatch_notified_count").notNull().default(0),
  timeToAcceptance: integer("time_to_acceptance"),
  // Track which runner is currently active to prevent double-acceptance
  activeRunnerId: integer("active_runner_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  userIdIdx: index("idx_tasks_user_id").on(table.userId),
  runnerIdIdx: index("idx_tasks_runner_id").on(table.runnerId),
  statusIdx: index("idx_tasks_status").on(table.status),
  createdAtIdx: index("idx_tasks_created_at").on(table.createdAt),
  // Fix #34: Compound indexes for common query patterns
  statusRunnerIdx: index("idx_tasks_status_runner").on(table.status, table.runnerId),
  statusCategoryIdx: index("idx_tasks_status_category").on(table.status, table.category),
  userIdStatusIdx: index("idx_tasks_user_status").on(table.userId, table.status),
  runnerStatusIdx: index("idx_tasks_runner_status").on(table.runnerId, table.status),
  completedAtIdx: index("idx_tasks_completed_at").on(table.completedAt),
  paymentMethodStatusIdx: index("idx_tasks_payment_method_status").on(table.paymentMethod, table.paymentStatus),
}));

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
