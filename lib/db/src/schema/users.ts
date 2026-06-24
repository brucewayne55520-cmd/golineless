import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  phone: text("phone").unique(),
  email: text("email").unique(),
  googleId: text("google_id").unique(),
  passwordHash: text("password_hash"),
  city: text("city"),
  area: text("area"),
  avatar: text("avatar"),
  language: text("language").notNull().default("en"),
  uniqueId: text("unique_id").unique(),
  // KYC fields
  kycStatus: text("kyc_status").notNull().default("none"),
  aadhaarNumber: text("aadhaar_number"),
  aadhaarFront: text("aadhaar_front"),
  aadhaarBack: text("aadhaar_back"),
  idDocumentUrl: text("id_document_url"),
  emergencyContact: text("emergency_contact"),
  otp: text("otp"),
  otpExpiresAt: timestamp("otp_expires_at", { withTimezone: true }),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiresAt: timestamp("password_reset_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});


export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const userSessionsTable = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
