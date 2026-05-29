import { pgTable, text, serial, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const runnersTable = pgTable("runners", {
  id: serial("id").primaryKey(),
  name: text("name"),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  city: text("city"),
  area: text("area"),
  avatar: text("avatar"),
  gender: text("gender"),
  kycStatus: text("kyc_status").notNull().default("pending"),
  kycRejectionReason: text("kyc_rejection_reason"),
  isOnline: boolean("is_online").notNull().default(false),
  rating: numeric("rating", { precision: 3, scale: 2 }),
  totalTasks: integer("total_tasks").notNull().default(0),
  totalEarnings: numeric("total_earnings", { precision: 10, scale: 2 }),
  currentLat: numeric("current_lat", { precision: 10, scale: 8 }),
  currentLng: numeric("current_lng", { precision: 11, scale: 8 }),
  // KYC fields
  fullName: text("full_name"),
  aadhaarNumber: text("aadhaar_number"),
  aadhaarFront: text("aadhaar_front"),
  aadhaarBack: text("aadhaar_back"),
  selfie: text("selfie"),
  bankAccount: text("bank_account"),
  bankIfsc: text("bank_ifsc"),
  bankAccountHolder: text("bank_account_holder"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyContactRelation: text("emergency_contact_relation"),
  otp: text("otp"),
  otpExpiresAt: timestamp("otp_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRunnerSchema = createInsertSchema(runnersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRunner = z.infer<typeof insertRunnerSchema>;
export type Runner = typeof runnersTable.$inferSelect;

export const runnerSessionsTable = pgTable("runner_sessions", {
  id: serial("id").primaryKey(),
  runnerId: integer("runner_id").notNull().references(() => runnersTable.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
