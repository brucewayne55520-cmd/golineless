import { pgTable, text, serial, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";


export const paymentAuditLogTable = pgTable("payment_audit_log", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id"),  // NOT NULL FK removed: KYC/admin audit entries use null task_id
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  actor: text("actor"),                     // user:123, runner:456, admin, system:auto_finalize
  actorType: text("actor_type"),            // user | runner | admin | system
  reason: text("reason"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  taskIdIdx: index("idx_payaudit_task_id").on(table.taskId),
  createdAtIdx: index("idx_payaudit_created_at").on(table.createdAt),
  newStatusIdx: index("idx_payaudit_new_status").on(table.newStatus),
  actorTypeIdx: index("idx_payaudit_actor_type").on(table.actorType),
}));

export const insertPaymentAuditLogSchema = createInsertSchema(paymentAuditLogTable).omit({ id: true, createdAt: true });
export type InsertPaymentAuditLog = z.infer<typeof insertPaymentAuditLogSchema>;
export type PaymentAuditLog = typeof paymentAuditLogTable.$inferSelect;
