import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

// ── Mock @workspace/db ──────────────────────────────────────────
// The auth.ts functions make chained db.select().from().where() calls.
// getRunnerFromToken / getUserFromToken do NOT call .limit() — they
// destructure the array result directly. So .where() must return a promise.
const mockWhere = vi.fn();
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

vi.mock("@workspace/db", () => ({
  db: { select: mockSelect },
  userSessionsTable: "user_sessions",
  runnerSessionsTable: "runner_sessions",
  usersTable: "users",
  runnersTable: "runners",
  adminsTable: "admins",
  adminSessionsTable: "admin_sessions",
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn(() => "eq_expr") }));

const { requireUser, requireRunner, requireAdmin, extractToken } = await import("../lib/auth");

// Extended request type for tests that access req.user / req.runner after middleware
type MockReqWithAuth = Request & { user?: Record<string, unknown>; runner?: Record<string, unknown> };

const mockReq = (authHeader?: string): MockReqWithAuth =>
  ({ headers: authHeader ? { authorization: authHeader } : {} }) as unknown as MockReqWithAuth;

const mockRes = (): Response => {
  const res: Record<string, any> = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res as unknown as Response;
};

const futureDate = new Date(Date.now() + 3600000);

// ── extractToken ────────────────────────────────────────────────
describe("extractToken", () => {
  it("extracts token from Authorization header", () => {
    expect(extractToken(mockReq("Bearer test-token-123"))).toBe("test-token-123");
  });

  it("returns null when no Authorization header", () => {
    expect(extractToken(mockReq())).toBeNull();
  });

  it("returns null when header has no Bearer prefix", () => {
    expect(extractToken(mockReq("Basic xyz"))).toBeNull();
  });

  it("requires capital B in Bearer (startsWith is case-sensitive)", () => {
    expect(extractToken(mockReq("bearer token"))).toBeNull();
  });
});

// ── requireAdmin ────────────────────────────────────────────────
describe("requireAdmin", () => {
  beforeEach(() => {
    process.env.ADMIN_TOKEN = "test-admin-token-2025";
  });

  it("returns 401 when token is null (no auth header at all)", () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("calls next() when admin token matches", () => {
    const req = mockReq("Bearer test-admin-token-2025");
    const res = mockRes();
    const next = vi.fn();

    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 401 when token does not match", async () => {
    const req = mockReq("Bearer wrong-token");
    const res = mockRes();
    const next = vi.fn();

    // Non-legacy token resolves an admin session asynchronously; mock it to none.
    mockWhere.mockResolvedValue([]);

    await requireAdmin(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  it("returns 401 when no token provided", () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ── requireUser ────────────────────────────────────────────────
describe("requireUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no Authorization header", async () => {
    const res = mockRes();
    const next = vi.fn();

    await requireUser(mockReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  it("returns 401 when session not found", async () => {
    const res = mockRes();
    const next = vi.fn();

    // getUserFromToken does db.select().from(userSessionsTable).where(eq(...))
    // No .limit() — destructures the array directly.
    mockWhere.mockResolvedValue([]);

    await requireUser(mockReq("Bearer invalid-token"), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() and sets req.user when valid session + user found", async () => {
    const req = mockReq("Bearer valid-token");
    const res = mockRes();
    const next = vi.fn();

    // getUserFromToken calls db.select() twice:
    // 1. Sessions query → returns session with userId + expiresAt
    // 2. Users query → returns full user object
    const mockUser = { id: 42, name: "Test User", phone: "+919999999999" };
    mockWhere
      .mockResolvedValueOnce([{ userId: 42, expiresAt: futureDate }])  // session
      .mockResolvedValueOnce([mockUser]);                                // user

    await requireUser(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual(mockUser);
  });

  it("returns 401 when session has expired", async () => {
    const res = mockRes();
    const next = vi.fn();

    const pastDate = new Date(Date.now() - 1000);
    mockWhere
      .mockResolvedValueOnce([{ userId: 42, expiresAt: pastDate }]);

    await requireUser(mockReq("Bearer expired-session-token"), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 401 when session exists but user record missing", async () => {
    const res = mockRes();
    const next = vi.fn();

    mockWhere
      .mockResolvedValueOnce([{ userId: 42, expiresAt: futureDate }])  // session
      .mockResolvedValueOnce([]);                                        // no user

    await requireUser(mockReq("Bearer valid-token"), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ── requireRunner ──────────────────────────────────────────────
describe("requireRunner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no Authorization header", async () => {
    const res = mockRes();
    const next = vi.fn();

    await requireRunner(mockReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 401 when session not found", async () => {
    const res = mockRes();
    const next = vi.fn();

    mockWhere.mockResolvedValue([]);

    await requireRunner(mockReq("Bearer invalid-token"), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("calls next() and sets req.runner when valid session + runner found", async () => {
    const req = mockReq("Bearer valid-token");
    const res = mockRes();
    const next = vi.fn();

    const mockRunner = { id: 7, name: "Test Comrade", phone: "+919999999998" };
    mockWhere
      .mockResolvedValueOnce([{ runnerId: 7, expiresAt: futureDate }])  // session
      .mockResolvedValueOnce([mockRunner]);                               // runner

    await requireRunner(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.runner).toEqual(mockRunner);
  });
});
