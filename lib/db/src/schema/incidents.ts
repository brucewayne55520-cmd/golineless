import { pgTable, text, serial, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tasksTable } from "./tasks";
import { runnersTable } from "./runners";
import { usersTable } from "./users";

export const incidentsTable = pgTable("incidents", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // customer_complaint, runner_misconduct, gps_failure, proof_failure, payment_issue, fraud_alert
  taskId: integer("task_id").references(() => tasksTable.id),
  runnerId: integer("runner_id").references(() => runnersTable.id),
  userId: integer("user_id").references(() => usersTable.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull().default("medium"), // low, medium, high, critical
  status: text("status").notNull().default("open"), // open, in_progress, resolved, closed
  assignedAdmin: text("assigned_admin"),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  statusIdx: index("idx_incidents_status").on(table.status),
  severityIdx: index("idx_incidents_severity").on(table.severity),
  typeIdx: index("idx_incidents_type").on(table.type),
  createdAtIdx: index("idx_incidents_created_at").on(table.createdAt),
  statusSeverityIdx: index("idx_incidents_status_severity").on(table.status, table.severity),
  taskIdIdx: index("idx_incidents_task_id").on(table.taskId),
  runnerIdIdx: index("idx_incidents_runner_id").on(table.runnerId),
  userIdIdx: index("idx_incidents_user_id").on(table.userId),
}));

export const insertIncidentSchema = createInsertSchema(incidentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidentsTable.$inferSelect;
