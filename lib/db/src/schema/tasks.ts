import { pgTable, text, serial, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
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
  paymentMethod: text("payment_method").notNull().default("online"),
  paymentStatus: text("payment_status").notNull().default("pending"),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
