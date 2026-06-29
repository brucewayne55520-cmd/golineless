import { pgTable, text, serial, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { runnersTable } from "./runners";

// Push Notification Foundation (future FCM integration)
export const deviceTokensTable = pgTable("device_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  runnerId: integer("runner_id").references(() => runnersTable.id),
  token: text("token").notNull(),
  platform: text("platform"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  userIdx: index("idx_device_tokens_user_id").on(table.userId),
  runnerIdx: index("idx_device_tokens_runner_id").on(table.runnerId),
  tokenIdx: index("idx_device_tokens_token").on(table.token),
  activeIdx: index("idx_device_tokens_active").on(table.isActive),
}));
