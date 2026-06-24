import { pgTable, text, serial, timestamp, integer, doublePrecision, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { runnersTable } from "./runners";
import { tasksTable } from "./tasks";

// ============================================================
// Verification Sessions — Active challenge sessions for photo capture
// ============================================================
export const verificationSessionsTable = pgTable("verification_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  taskId: integer("task_id").references(() => tasksTable.id),
  challengeId: text("challenge_id").notNull().unique(), // VER-YYYY-XXXXX
  challengeCode: text("challenge_code").notNull(),       // Random 6-char code displayed to user
  status: text("status").notNull().default("active"),    // active | completed | expired | cancelled
  gpsLat: doublePrecision("gps_lat"),
  gpsLng: doublePrecision("gps_lng"),
  gpsAccuracy: doublePrecision("gps_accuracy"),          // meters from navigator.geolocation
  ipAddress: text("ip_address"),
  ipGeolocation: jsonb("ip_geolocation"),                // { lat, lng, country, city, org }
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => ({
  userIdx: index("idx_vsession_user_id").on(table.userId),
  taskIdx: index("idx_vsession_task_id").on(table.taskId),
  statusIdx: index("idx_vsession_status").on(table.status),
  challengeIdx: index("idx_vsession_challenge_id").on(table.challengeId),
}));

// ============================================================
// Photo Uploads — Individual photo records with full metadata
// ============================================================
export const photoUploadsTable = pgTable("photo_uploads", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => verificationSessionsTable.id),
  taskId: integer("task_id").references(() => tasksTable.id),
  userId: integer("user_id").references(() => usersTable.id),
  runnerId: integer("runner_id").references(() => runnersTable.id),
  originalHash: text("original_hash").notNull(),          // SHA-256 of original file bytes
  watermarkHash: text("watermark_hash"),                   // SHA-256 of watermarked image
  fileUrl: text("file_url").notNull(),
  originalFileUrl: text("original_file_url"),              // Original unprocessed image
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  gpsLat: doublePrecision("gps_lat"),
  gpsLng: doublePrecision("gps_lng"),
  gpsAccuracy: doublePrecision("gps_accuracy"),
  deviceInfo: jsonb("device_info"),                       // { userAgent, platform, screen }
  exifData: jsonb("exif_data"),                           // { camera, model, timestamp, gps, orientation }
  ipAddress: text("ip_address"),
  serverTimestamp: timestamp("server_timestamp", { withTimezone: true }).notNull(),
  proofType: text("proof_type"),                          // reached_pickup, completed, etc.
  riskScore: integer("risk_score").notNull().default(0),  // 0-100
  riskFactors: jsonb("risk_factors"),                     // [{ factor, weight, reason }]
  isDuplicate: boolean("is_duplicate").notNull().default(false),
  duplicateOfId: integer("duplicate_of_id"),
  verificationId: text("verification_id").notNull(),      // VER-YYYY-XXXXX (must match session)
  challengeCode: text("challenge_code").notNull(),         // Must appear in watermark
  watermarkApplied: boolean("watermark_applied").notNull().default(false),
  status: text("status").notNull().default("uploaded"),   // uploaded | verified | flagged | rejected
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  sessionIdx: index("idx_photo_session_id").on(table.sessionId),
  taskIdx: index("idx_photo_task_id").on(table.taskId),
  runnerIdx: index("idx_photo_runner_id").on(table.runnerId),
  hashIdx: index("idx_photo_original_hash").on(table.originalHash),
  verificationIdx: index("idx_photo_verification_id").on(table.verificationId),
  statusIdx: index("idx_photo_status").on(table.status),
  createdAtIdx: index("idx_photo_created_at").on(table.createdAt),
}));

// ============================================================
// Verification Audit Logs — Complete audit trail
// ============================================================
export const verificationAuditLogsTable = pgTable("verification_audit_logs", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => verificationSessionsTable.id),
  photoId: integer("photo_id").references(() => photoUploadsTable.id),
  taskId: integer("task_id"),
  userId: integer("user_id"),
  runnerId: integer("runner_id"),
  action: text("action").notNull(),                       // session_created | photo_uploaded | risk_flagged | etc.
  riskScore: integer("risk_score"),
  riskFactors: jsonb("risk_factors"),
  metadata: jsonb("metadata"),                            // Arbitrary additional data
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  sessionIdx: index("idx_vaudit_session_id").on(table.sessionId),
  photoIdx: index("idx_vaudit_photo_id").on(table.photoId),
  actionIdx: index("idx_vaudit_action").on(table.action),
  createdAtIdx: index("idx_vaudit_created_at").on(table.createdAt),
}));

// ============================================================
// Verification Hashes — Deduplication index for original images
// ============================================================
export const verificationHashesTable = pgTable("verification_hashes", {
  id: serial("id").primaryKey(),
  originalHash: text("original_hash").notNull().unique(),
  photoId: integer("photo_id").references(() => photoUploadsTable.id),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  occurrenceCount: integer("occurrence_count").notNull().default(1),
}, (table) => ({
  hashIdx: index("idx_vhash_original_hash").on(table.originalHash),
}));

// ============================================================
// Zod schemas & types
// ============================================================
export const insertVerificationSessionSchema = createInsertSchema(verificationSessionsTable).omit({ id: true, createdAt: true });
export type InsertVerificationSession = z.infer<typeof insertVerificationSessionSchema>;
export type VerificationSession = typeof verificationSessionsTable.$inferSelect;

export const insertPhotoUploadSchema = createInsertSchema(photoUploadsTable).omit({ id: true, createdAt: true });
export type InsertPhotoUpload = z.infer<typeof insertPhotoUploadSchema>;
export type PhotoUpload = typeof photoUploadsTable.$inferSelect;

export const insertVerificationAuditLogSchema = createInsertSchema(verificationAuditLogsTable).omit({ id: true, createdAt: true });
export type InsertVerificationAuditLog = z.infer<typeof insertVerificationAuditLogSchema>;
export type VerificationAuditLog = typeof verificationAuditLogsTable.$inferSelect;

export const insertVerificationHashSchema = createInsertSchema(verificationHashesTable).omit({ id: true, firstSeenAt: true });
export type InsertVerificationHash = z.infer<typeof insertVerificationHashSchema>;
export type VerificationHash = typeof verificationHashesTable.$inferSelect;
