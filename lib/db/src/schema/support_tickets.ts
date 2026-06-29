import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tasksTable } from "./tasks";

export const supportTicketsTable = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  ticketId: text("ticket_id").notNull(), // GL-SUP-XXXX
  taskId: integer("task_id").references(() => tasksTable.id),
  userId: integer("user_id"),
  runnerId: integer("runner_id"),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().default("general"), // general, complaint, refund, escalation, other
  status: text("status").notNull().default("open"), // open, in_progress, resolved, closed
  priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
  assignedAdmin: text("assigned_admin"),
  resolution: text("resolution"),
  refundAmount: integer("refund_amount"),
  resolutionTimeMinutes: integer("resolution_time_minutes"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  ticketIdIdx: index("idx_support_ticket_id").on(table.ticketId),
  statusIdx: index("idx_support_status").on(table.status),
  priorityIdx: index("idx_support_priority").on(table.priority),
  categoryIdx: index("idx_support_category").on(table.category),
  userIdIdx: index("idx_support_user_id").on(table.userId),
  runnerIdIdx: index("idx_support_runner_id").on(table.runnerId),
  taskIdIdx: index("idx_support_task_id").on(table.taskId),
  statusPriorityIdx: index("idx_support_status_priority").on(table.status, table.priority),
  createdAtIdx: index("idx_support_created_at").on(table.createdAt),
}));

export const insertSupportTicketSchema = createInsertSchema(supportTicketsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTicketsTable.$inferSelect;
