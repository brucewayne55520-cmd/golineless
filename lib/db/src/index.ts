import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "./schema";

// cPanel/shared hosting blocks port 5432; Neon serverless uses WebSockets over HTTPS.
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Fix #26: Configure connection pool for production reliability
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX ?? 20),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT ?? 30000),
  connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT ?? 10000),
});
export const db = drizzle(pool, { schema });

export * from "./schema";

// Re-export zod so dependent workspace packages can import it through
// @workspace/db without listing zod as a direct dependency.
export { z } from "zod/v4";
