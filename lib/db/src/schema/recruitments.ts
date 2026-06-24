import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recruitmentsTable = pgTable("recruitments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  area: text("area").notNull(),
  vehicleType: text("vehicle_type").notNull().default("bicycle"),
  languages: text("languages").array().notNull().default(["{hindi}"]),
  availability: text("availability").notNull().default("full_time"),
  stage: text("stage").notNull().default("applied"), // applied, interview_scheduled, documents_submitted, training_pending, training_complete, pilot_active, suspended
  notes: text("notes"),
  interviewDate: timestamp("interview_date", { withTimezone: true }),
  documentsSubmittedAt: timestamp("documents_submitted_at", { withTimezone: true }),
  trainingCompletedAt: timestamp("training_completed_at", { withTimezone: true }),
  trainingScore: integer("training_score"),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  runnerId: integer("runner_id"), // linked runner account after activation
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRecruitmentSchema = createInsertSchema(recruitmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRecruitment = z.infer<typeof insertRecruitmentSchema>;
export type Recruitment = typeof recruitmentsTable.$inferSelect;
