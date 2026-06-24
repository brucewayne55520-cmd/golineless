import { Router, type IRouter } from "express";
import { db, usersTable, runnersTable, userSessionsTable, runnerSessionsTable, adminsTable, adminSessionsTable, z } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateToken, verifyPassword, extractToken, hashPassword } from "../lib/auth";
import { validateNeonToken } from "../lib/neon-auth";
import { sendOtp, verifyOtp } from "../lib/sms";
import { sendEmail } from "../lib/email";
import { isValidIndianPhone } from "../lib/gps-engine";
import { validateBody } from "../lib/validate";

const router: IRouter = Router();

const sendOtpSchema = z.object({
  phone: z.string().min(1),
  role: z.enum(["user", "runner"]).optional(),
}).passthrough();

const verifyOtpSchema = z.object({
  phone: z.string().min(1),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
  role: z.enum(["user", "runner"]).optional(),
}).passthrough();

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

// POST /auth/send-otp — now uses Twilio Verify (generates & sends OTP automatically)
router.post("/auth/send-otp", validateBody(sendOtpSchema), async (req, res): Promise<void> => {
  const { phone, role = "user" } = req.body;
  if (!phone) { res.status(400).json({ error: "Phone required" }); return; }
  if (!isValidIndianPhone(phone)) {
    res.status(400).json({ error: "Invalid phone number. Please provide a valid 10-digit Indian mobile number." });
    return;
  }

  // Upsert the user/runner record (phone registration) — OTP is handled by Twilio
  if (role === "runner") {
    const existing = await db.select().from(runnersTable).where(eq(runnersTable.phone, phone));
    if (existing.length === 0) {
      await db.insert(runnersTable).values({ phone });
    }
  } else {
    const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
    if (existing.length === 0) {
      await db.insert(usersTable).values({ phone });
    }
  }

  const smsSent = await sendOtp(phone);

  res.json({
    message: smsSent ? "OTP sent" : "Failed to send OTP. Please try again.",
    sent: smsSent,
  });
});

// POST /auth/verify-otp — delegates to Twilio Verify for server-side validation
router.post("/auth/verify-otp", validateBody(verifyOtpSchema), async (req, res): Promise<void> => {
  const { phone, otp, role = "user" } = req.body;
  if (!phone || !otp) { res.status(400).json({ error: "Phone and OTP required" }); return; }

  // Verify code with Twilio Verify (in dev, accepts any 6-digit code)
  const isValid = await verifyOtp(phone, otp);
  if (!isValid) { res.status(401).json({ error: "Invalid OTP" }); return; }

  if (role === "runner") {
    const [runner] = await db.select().from(runnersTable).where(eq(runnersTable.phone, phone));
    if (!runner) { res.status(401).json({ error: "Runner not found. Please request OTP first." }); return; }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await db.insert(runnerSessionsTable).values({ runnerId: runner.id, token, expiresAt });

    const { otp: _, otpExpiresAt: __, ...safeRunner } = runner;
    res.json({ token, role: "runner", runner: safeRunner });
  } else {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
    if (!user) { res.status(401).json({ error: "User not found. Please request OTP first." }); return; }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(userSessionsTable).values({ userId: user.id, token, expiresAt });

    const { otp: _, otpExpiresAt: __, ...safeUser } = user;
    res.json({ token, role: "user", user: safeUser });
  }
});

// POST /auth/logout
router.post("/auth/logout", async (req, res): Promise<void> => {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (token) {
    await db.delete(userSessionsTable).where(eq(userSessionsTable.token, token)).catch(() => {});
    await db.delete(runnerSessionsTable).where(eq(runnerSessionsTable.token, token)).catch(() => {});
  }
  res.json({ message: "Logged out" });
});

// POST /auth/signup - Email/Password Signup
router.post("/auth/signup", validateBody(signupSchema), async (req, res): Promise<void> => {
  const { email, password, role = "user", name, phone } = req.body;

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
    res.json({ token, role: "runner", runner: safeRunner });
  } else {
    await db.insert(userSessionsTable).values({ userId: record.id, token, expiresAt });
    const { passwordHash: _, otp: __, otpExpiresAt: ___, ...safeUser } = record;
    res.json({ token, role: "user", user: safeUser });
  }
});

// POST /auth/login - Email/Password Login
router.post("/auth/login", validateBody(loginSchema), async (req, res): Promise<void> => {
  const { email, password, role = "user" } = req.body;

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
    res.json({ token, role: "runner", runner: safeRunner });
  } else {
    await db.insert(userSessionsTable).values({ userId: record.id, token, expiresAt });
    const { passwordHash: _, otp: __, otpExpiresAt: ___, ...safeUser } = record;
    res.json({ token, role: "user", user: safeUser });
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
    console.error("Failed to send password reset email:", e);
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

// POST /auth/neon-callback — Exchange a Neon Auth JWT for a GoLineLess session token
router.post("/auth/neon-callback", async (req, res): Promise<void> => {
  const { neonToken, role = "user" } = req.body;
  if (!neonToken) { res.status(400).json({ error: "Neon token required" }); return; }

  // Validate the Neon Auth JWT against their JWKS
  const neonUser = await validateNeonToken(neonToken);
  if (!neonUser || !neonUser.email) {
    res.status(401).json({ error: "Invalid or expired Neon Auth token" }); return;
  }

  const email = neonUser.email;
  const name = neonUser.name || email.split("@")[0];

  // Security: check which table already has this email to prevent role escalation.
  // Never trust the client-supplied role — resolve it from the database.
  const [existingUser] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
  const [existingRunner] = await db.select({ id: runnersTable.id }).from(runnersTable).where(eq(runnersTable.email, email)).limit(1);

  let record: { id: number; [key: string]: unknown };
  let resolvedRole: "user" | "runner";

  if (existingRunner) {
    // Email already registered as a runner
    resolvedRole = "runner";
    const [r] = await db.select().from(runnersTable).where(eq(runnersTable.email, email));
    record = r!;
  } else if (existingUser) {
    // Email already registered as a user
    resolvedRole = "user";
    const [r] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    record = r!;
  } else {
    // New email — use client-requested role (safe since no account exists yet)
    resolvedRole = role === "runner" ? "runner" : "user";
    if (resolvedRole === "runner") {
      const [r] = await db.insert(runnersTable).values({ email, name, phone: null }).returning();
      record = r;
    } else {
      const [r] = await db.insert(usersTable).values({ email, name, phone: null }).returning();
      record = r;
    }
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
    res.json({ token, role: admin.role, admin: { id: admin.id, username: admin.username, name: admin.name, role: admin.role } });
    return;
  }

  // Legacy shared-token login (bootstrap / backwards compatibility)
  if (process.env.ADMIN_TOKEN && password === process.env.ADMIN_TOKEN) {
    res.json({ token: process.env.ADMIN_TOKEN, role: "admin" });
    return;
  }

  res.status(401).json({ error: "Invalid credentials" });
});

// POST /admin/logout
router.post("/admin/logout", async (req, res): Promise<void> => {
  const token = extractToken(req);
  if (token) {
    await db.delete(adminSessionsTable).where(eq(adminSessionsTable.token, token)).catch(() => {});
  }
  res.json({ message: "Logged out" });
});

export default router;
