import { pgTable, text, serial, timestamp, integer, jsonb, doublePrecision, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tasksTable } from "./tasks";
import { runnersTable } from "./runners";

// ============================================================
// Fraud Flags — Individual fraud/risk records extracted from
// the legacy `tasksTable.fraudFlags` text array.
//
// Each row stores one fraud detection event (invalid status
// transition, GPS validation failure, duplicate proof upload,
// OTP brute force, etc.).
//
// Columns are typed from the existing JSON shapes:
//   { type, taskId, timestamp, ... }  with type-specific extras:
//
//   invalid_status_transition:
//     { fromStatus, toStatus, reason }
//   gps_validation_failed:
//     { runnerId, distanceMeters, maxAllowed }
//   duplicate_proof:
//     { runnerId, proofType, count }
//   failed_otp_attempt / otp_brute_force:
//     { runnerId }
//
// The `metadata` JSONB column stores any extras not covered
// by dedicated columns, ensuring forward-compatibility.
// ============================================================
export const fraudFlagsTable = pgTable("fraud_flags", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasksTable.id),
  runnerId: integer("runner_id").references(() => runnersTable.id),
  type: text("type").notNull(),
  // invalid_status_transition | gps_validation_failed |
  // duplicate_proof | failed_otp_attempt | otp_brute_force
  fromStatus: text("from_status"),             // invalid_status_transition
  toStatus: text("to_status"),                 // invalid_status_transition
  reason: text("reason"),                      // invalid_status_transition
  distanceMeters: doublePrecision("distance_meters"), // gps_validation_failed
  maxAllowed: doublePrecision("max_allowed"),          // gps_validation_failed
  proofType: text("proof_type"),               // duplicate_proof
  duplicateCount: integer("duplicate_count"),  // duplicate_proof
  metadata: jsonb("metadata"),                 // catch-all for any extra data
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  taskIdx: index("idx_fraud_flag_task_id").on(table.taskId),
  runnerIdx: index("idx_fraud_flag_runner_id").on(table.runnerId),
  typeIdx: index("idx_fraud_flag_type").on(table.type),
  createdAtIdx: index("idx_fraud_flag_created_at").on(table.createdAt),
  runnerTypeIdx: index("idx_fraud_flag_runner_type").on(table.runnerId, table.type),
}));

export const insertFraudFlagSchema = createInsertSchema(fraudFlagsTable).omit({ id: true, createdAt: true });
export type InsertFraudFlag = z.infer<typeof insertFraudFlagSchema>;
export type FraudFlag = typeof fraudFlagsTable.$inferSelect;
