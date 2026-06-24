import { beforeAll, vi } from "vitest";

// Set test environment variables before anything else
process.env.NODE_ENV = "test";
process.env.ADMIN_TOKEN = "test-admin-token-2025";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://localhost:5432/test";
process.env.SECRET_KEY = "test-secret-key-not-for-production";

// Mock pino logger to keep test output clean
vi.mock("pino", () => ({
  default: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  }),
}));
