import { pgTable, text, serial, timestamp, integer, doublePrecision, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tasksTable } from "./tasks";
import { runnersTable } from "./runners";

// ============================================================
// Proof Photos — Individual photo records extracted from
// the legacy `tasksTable.proofPhotos` text array.
//
// Each row stores one proof photo uploaded by a runner during
// task execution (pickup proof, location proof, completion proof, etc.).
//
// Columns are typed from the existing JSON shape:
//   { id, taskId, runnerId, proofType, imageUrl, timestamp,
//     lat, lng, address, taskStatus, uploadedBy, gpsVerified }
// ============================================================
export const proofPhotosTable = pgTable("proof_photos", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasksTable.id),
  runnerId: integer("runner_id").references(() => runnersTable.id),
  proofType: text("proof_type").notNull().default("general"),
  // reached_pickup | reached_task_location | in_progress | completed | general
  imageUrl: text("image_url").notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  address: text("address"),
  taskStatus: text("task_status"),            // status of task at time of upload
  uploadedBy: text("uploaded_by"),            // runner display name
  gpsVerified: boolean("gps_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  taskIdx: index("idx_proof_photo_task_id").on(table.taskId),
  runnerIdx: index("idx_proof_photo_runner_id").on(table.runnerId),
  proofTypeIdx: index("idx_proof_photo_type").on(table.proofType),
  createdAtIdx: index("idx_proof_photo_created_at").on(table.createdAt),
  taskTypeIdx: index("idx_proof_photo_task_type").on(table.taskId, table.proofType),
}));

export const insertProofPhotoSchema = createInsertSchema(proofPhotosTable).omit({ id: true, createdAt: true });
export type InsertProofPhoto = z.infer<typeof insertProofPhotoSchema>;
export type ProofPhoto = typeof proofPhotosTable.$inferSelect;
