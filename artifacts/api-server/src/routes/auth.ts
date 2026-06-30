import { Router, type IRouter } from "express";
import crypto from "crypto";
import { db, usersTable, runnersTable, userSessionsTable, runnerSessionsTable, adminsTable, adminSessionsTable, paymentAuditLogTable, z } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";
import { generateToken, verifyPassword, extractToken, hashPassword, setAuthCookie, clearAuthCookie, requireAdmin } from "../lib/auth";
import { validateNeonToken } from "../lib/neon-auth";

import { sendEmail } from "../lib/email";
import { validateBody } from "../lib/validate";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["user", "runner"]),
  name: z.string().optional(),
  phone: z.string().optional(),
}).passthrough();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(["user", "runner"]),
}).passthrough();

const forgotPasswordSchema = z.object({
  email: z.string().email(),
  role: z.enum(["user", "runner"]).optional(),
}).passthrough();

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(["user", "runner"]).optional(),
}).passthrough();



// POST /auth/logout
router.post("/auth/logout", async (req, res): Promise<void> => {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (token) {
    await db.delete(userSessionsTable).where(eq(userSessionsTable.token, token)).catch(() => {});
    await db.delete(runnerSessionsTable).where(eq(runnerSessionsTable.token, token)).catch(() => {});
  }
  clearAuthCookie(res);
  res.json({ message: "Logged out" });
});

// POST /auth/signup - Email/Password Signup
router.post("/auth/signup", validateBody(signupSchema), async (req, res): Promise<void> => {
  const { email, password, role = "user", name, phone } = req.body;

  try {
    // Check if user/runner already exists with this email
    const table = role === "runner" ? runnersTable : usersTable;
    const [existing] = await db.select().from(table).where(eq(table.email, email));
    if (existing) {
      res.status(400).json({ error: "Account with this email already exists" });
      return;
    }

    // Hash password
    const passwordHash = hashPassword(password);

    // Create new user/runner
    const newRecord = role === "runner"
      ? { email, passwordHash, name, phone }
      : { email, passwordHash, name, phone };

    const [record] = await db.insert(table).values(newRecord).returning();

    // Generate token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    if (role === "runner") {
      await db.insert(runnerSessionsTable).values({ runnerId: record.id, token, expiresAt });
      const { passwordHash: _, otp: __, otpExpiresAt: ___, ...safeRunner } = record;
      setAuthCookie(res, token);
      res.json({ token, role: "runner", runner: safeRunner });
    } else {
      await db.insert(userSessionsTable).values({ userId: record.id, token, expiresAt });
      const { passwordHash: _, otp: __, otpExpiresAt: ___, ...safeUser } = record;
      setAuthCookie(res, token);
      res.json({ token, role: "user", user: safeUser });
    }
  } catch (err) {
    logger.error({ err, email, role }, "signup: database error");
    res.status(500).json({ error: "Failed to create account. Please try again." });
  }
});

// POST /auth/login - Email/Password Login
router.post("/auth/login", validateBody(loginSchema), async (req, res): Promise<void> => {
  const { email, password, role = "user" } = req.body;

  try {
    const table = role === "runner" ? runnersTable : usersTable;
    const [record] = await db.select().from(table).where(eq(table.email, email));

    if (!record || !record.passwordHash) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    if (!verifyPassword(password, record.passwordHash)) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Generate token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    if (role === "runner") {
      await db.insert(runnerSessionsTable).values({ runnerId: record.id, token, expiresAt });
      const { passwordHash: _, otp: __, otpExpiresAt: ___, ...safeRunner } = record;
      setAuthCookie(res, token);
      res.json({ token, role: "runner", runner: safeRunner });
    } else {
      await db.insert(userSessionsTable).values({ userId: record.id, token, expiresAt });
      const { passwordHash: _, otp: __, otpExpiresAt: ___, ...safeUser } = record;
      setAuthCookie(res, token);
      res.json({ token, role: "user", user: safeUser });
    }
  } catch (err) {
    logger.error({ err, email, role }, "login: database error");
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// POST /auth/forgot-password
router.post("/auth/forgot-password", validateBody(forgotPasswordSchema), async (req, res): Promise<void> => {
  const { email, role = "user" } = req.body;

  const table = role === "runner" ? runnersTable : usersTable;
  const [record] = await db.select().from(table).where(eq(table.email, email));

  // Always return success to prevent email enumeration
  if (!record) {
    res.json({ message: "If an account exists with this email, a password reset link has been sent." });
    return;
  }

  // Generate password reset token
  const resetToken = generateToken();
  const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

  // Update the record
  await db.update(table).set({
    passwordResetToken: resetToken,
    passwordResetExpiresAt: expiresAt,
  }).where(eq(table.email, email));

  // Send email
  const resetLink = `${process.env.FRONTEND_URL || "https://golineless.com"}/reset-password?token=${resetToken}&role=${role}`;
  const htmlContent = `
    <h1>Password Reset Request</h1>
    <p>Hi there,</p>
    <p>You requested a password reset for your Go LineLess account.</p>
    <p>Click the link below to reset your password:</p>
    <a href="${resetLink}">${resetLink}</a>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, you can ignore this email.</p>
  `;
  const textContent = `
    Password Reset Request
    Hi there,
    You requested a password reset for your Go LineLess account.
    Click the link below to reset your password:
    ${resetLink}
    This link will expire in 1 hour.
    If you didn't request this, you can ignore this email.
  `;

  try {
    await sendEmail({
      to: email,
      subject: "Password Reset Request - Go LineLess",
      htmlContent,
      textContent,
    });
  } catch (e) {
    logger.error({ err: e }, "Failed to send password reset email");
  }

  res.json({ message: "If an account exists with this email, a password reset link has been sent." });
});

// POST /auth/reset-password
router.post("/auth/reset-password", validateBody(resetPasswordSchema), async (req, res): Promise<void> => {
  const { token, password, role = "user" } = req.body;

  const table = role === "runner" ? runnersTable : usersTable;
  const [record] = await db.select().from(table).where(eq(table.passwordResetToken, token));

  if (!record || !record.passwordResetExpiresAt || record.passwordResetExpiresAt < new Date()) {
    res.status(400).json({ error: "Invalid or expired password reset token" });
    return;
  }

  // Update password
  const passwordHash = hashPassword(password);
  await db.update(table).set({
    passwordHash,
    passwordResetToken: null,
    passwordResetExpiresAt: null,
  }).where(eq(table.id, record.id));

  res.json({ message: "Password reset successfully" });
});

// POST /auth/neon-callback — Exchange a Neon Auth JWT (magic link) for a GoLineLess session token
router.post("/auth/neon-callback", async (req, res): Promise<void> => {
  const { neonToken, role = "user" } = req.body;
  if (!neonToken) { res.status(400).json({ error: "Neon token required" }); return; }

  try {
    // Validate the Neon Auth JWT against their JWKS
    const neonUser = await validateNeonToken(neonToken);
    if (!neonUser || (!neonUser.email && !neonUser.phoneNumber)) {
      res.status(401).json({ error: "Invalid or expired Neon Auth token" }); return;
    }

    const email = neonUser.email || "";
    const name = neonUser.name || email.split("@")[0] || `user_${neonUser.phoneNumber || ""}`;
    const phoneNumber = neonUser.phoneNumber;

    // Security: check which table already has this email to prevent role escalation.
    // Never trust the client-supplied role — resolve it from the database.
    let existingUser: { id: number } | undefined;
    let existingRunner: { id: number } | undefined;

    if (email) {
      const [u] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
      existingUser = u;
      const [r] = await db.select({ id: runnersTable.id }).from(runnersTable).where(eq(runnersTable.email, email)).limit(1);
      existingRunner = r;
    }

    if (!existingUser && !existingRunner && phoneNumber) {
      // Look up by phone number for phone-OTP-based accounts
      const [u] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.phone, phoneNumber)).limit(1);
      existingUser = u;
      const [r] = await db.select({ id: runnersTable.id }).from(runnersTable).where(eq(runnersTable.phone, phoneNumber)).limit(1);
      existingRunner = r;
    }

    let record: { id: number; [key: string]: unknown };
    let resolvedRole: "user" | "runner";

    if (existingRunner) {
      resolvedRole = "runner";
      const [r] = await db.select().from(runnersTable).where(eq(runnersTable.id, existingRunner.id));
      record = r!;
    } else if (existingUser) {
      resolvedRole = "user";
      const [r] = await db.select().from(usersTable).where(eq(usersTable.id, existingUser.id));
      record = r!;
    } else if (email) {
      // New email — use client-requested role (safe since no account exists yet)
      resolvedRole = role === "runner" ? "runner" : "user";
      if (resolvedRole === "runner") {
        const [r] = await db.insert(runnersTable).values({ email, name, phone: phoneNumber || null }).returning();
        record = r;
      } else {
        const [r] = await db.insert(usersTable).values({ email, name, phone: phoneNumber || null }).returning();
        record = r;
      }
    } else if (phoneNumber) {
      // Pure phone-based account, no email
      resolvedRole = role === "runner" ? "runner" : "user";
      if (resolvedRole === "runner") {
        const [r] = await db.insert(runnersTable).values({ phone: phoneNumber }).returning();
        record = r;
      } else {
        const [r] = await db.insert(usersTable).values({ phone: phoneNumber }).returning();
        record = r;
      }
    } else {
      res.status(401).json({ error: "Could not resolve user identity from token" }); return;
    }

    // Create a GoLineLess session token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    if (resolvedRole === "runner") {
      await db.insert(runnerSessionsTable).values({ runnerId: record.id, token, expiresAt });
    } else {
      await db.insert(userSessionsTable).values({ userId: record.id, token, expiresAt });
    }

    // Strip sensitive fields
    const { passwordHash: _, otp: __, otpExpiresAt: ___, passwordResetToken: ____, passwordResetExpiresAt: _____, ...safeRecord } = record;

    if (resolvedRole === "runner") {
      res.json({ token, role: "runner", runner: safeRecord });
    } else {
      res.json({ token, role: "user", user: safeRecord });
    }
  } catch (err) {
    logger.error({ err }, "neon-callback: authentication error");
    res.status(500).json({ error: "Authentication failed. Please try again." });
  }
});

// POST /admin/login
router.post("/admin/login", async (req, res): Promise<void> => {
  const { username, password } = req.body;
  if (!password) { res.status(400).json({ error: "Password required" }); return; }

  // Per-admin account login
  if (username) {
    const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.username, username));
    if (!admin || !admin.isActive || !verifyPassword(password, admin.passwordHash)) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await db.insert(adminSessionsTable).values({ adminId: admin.id, token, expiresAt });
    await db.update(adminsTable).set({ lastLoginAt: new Date() }).where(eq(adminsTable.id, admin.id));
    // H6: Log admin login to audit trail
    try {
      await db.insert(paymentAuditLogTable).values({
        taskId: null,
        previousStatus: null,
        newStatus: "admin_login",
        actor: admin.username,
        actorType: "admin",
        reason: `Admin ${admin.username} logged in`,
        metadata: JSON.stringify({ adminId: admin.id, action: "login", role: admin.role }),
      });
    } catch { /* audit log is best-effort */ }
    res.json({ token, role: admin.role, admin: { id: admin.id, username: admin.username, name: admin.name, role: admin.role } });
    return;
  }

  // S2: Legacy shared-token login — disabled in production, use per-admin accounts instead
  if (process.env.ADMIN_TOKEN && process.env.NODE_ENV !== "production" && password === process.env.ADMIN_TOKEN) {
    logger.warn("Admin used legacy shared-token login — migrate to per-admin accounts");
    res.json({ token: process.env.ADMIN_TOKEN, role: "admin" });
    return;
  }

  res.status(401).json({ error: "Invalid credentials" });
});

// POST /admin/logout
// H6: Log admin logout to audit trail
router.post("/admin/logout", requireAdmin, async (req, res): Promise<void> => {
  const token = extractToken(req);
  if (token) {
    // H6: Log admin logout before deleting session
    if (req.admin && req.admin.id > 0) {
      try {
        await db.insert(paymentAuditLogTable).values({
          taskId: null,
          previousStatus: null,
          newStatus: "admin_logout",
          actor: req.admin.username,
          actorType: "admin",
          reason: `Admin ${req.admin.username} logged out`,
          metadata: JSON.stringify({ adminId: req.admin.id, action: "logout", role: req.admin.role }),
        });
      } catch { /* audit log is best-effort */ }
    }
    await db.delete(adminSessionsTable).where(eq(adminSessionsTable.token, token)).catch(() => {});
  }
  res.json({ message: "Logged out" });
});

// H3: GET /admin/sessions — list all active sessions for the logged-in admin
router.get("/admin/sessions", requireAdmin, async (req, res): Promise<void> => {
  const admin = req.admin!;
  const sessions = await db.select({
    id: adminSessionsTable.id,
    token: adminSessionsTable.token,
    createdAt: adminSessionsTable.createdAt,
    expiresAt: adminSessionsTable.expiresAt,
  }).from(adminSessionsTable).where(eq(adminSessionsTable.adminId, admin.id));
  res.json(sessions.map(s => ({
    ...s,
    isActive: s.expiresAt > new Date(),
    token: s.token.slice(0, 8) + "..." + s.token.slice(-4), // Mask token for security
  })));
});

// H3: DELETE /admin/sessions/:id — invalidate a specific session
router.delete("/admin/sessions/:id", requireAdmin, async (req, res): Promise<void> => {
  const admin = req.admin!;
  const sessionId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(sessionId)) { res.status(400).json({ error: "Invalid session ID" }); return; }

  // Only allow deleting own sessions (unless superadmin)
  const [session] = await db.select().from(adminSessionsTable).where(eq(adminSessionsTable.id, sessionId));
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  if (session.adminId !== admin.id && admin.role !== "superadmin") {
    res.status(403).json({ error: "Cannot delete other admin's session" }); return;
  }
  await db.delete(adminSessionsTable).where(eq(adminSessionsTable.id, sessionId));
  res.json({ message: "Session invalidated" });
});

// B9: Session rotation — invalidate all other sessions for this user/runner on sensitive actions
router.post("/auth/rotate-session", async (req, res): Promise<void> => {
  const token = extractToken(req);
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }

  // Check if it's a user session
  const [userSession] = await db.select().from(userSessionsTable).where(eq(userSessionsTable.token, token));
  if (userSession) {
    // Delete all OTHER sessions for this user (keep current)
    await db.delete(userSessionsTable).where(
      and(
        eq(userSessionsTable.userId, userSession.userId),
        ne(userSessionsTable.token, token)
      )
    ).catch(() => {});
    // Generate new token and replace current session
    const newToken = crypto.randomBytes(48).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.delete(userSessionsTable).where(eq(userSessionsTable.token, token)).catch(() => {});
    await db.insert(userSessionsTable).values({ userId: userSession.userId, token: newToken, expiresAt });
    setAuthCookie(res, newToken);
    res.json({ message: "Session rotated", token: newToken });
    return;
  }

  // Check if it's a runner session
  const [runnerSession] = await db.select().from(runnerSessionsTable).where(eq(runnerSessionsTable.token, token));
  if (runnerSession) {
    await db.delete(runnerSessionsTable).where(
      and(
        eq(runnerSessionsTable.runnerId, runnerSession.runnerId),
        ne(runnerSessionsTable.token, token)
      )
    ).catch(() => {});
    const newToken = crypto.randomBytes(48).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.delete(runnerSessionsTable).where(eq(runnerSessionsTable.token, token)).catch(() => {});
    await db.insert(runnerSessionsTable).values({ runnerId: runnerSession.runnerId, token: newToken, expiresAt });
    setAuthCookie(res, newToken);
    res.json({ message: "Session rotated", token: newToken });
    return;
  }

  res.status(401).json({ error: "No active session found" });
});



export default router;
