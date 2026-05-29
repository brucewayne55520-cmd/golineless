import { Router, type IRouter } from "express";
import { db, usersTable, runnersTable, userSessionsTable, runnerSessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateOtp, generateToken } from "../lib/auth";

const router: IRouter = Router();

// POST /auth/send-otp
router.post("/auth/send-otp", async (req, res): Promise<void> => {
  const { phone, role = "user" } = req.body;
  if (!phone) { res.status(400).json({ error: "Phone required" }); return; }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  if (role === "runner") {
    const existing = await db.select().from(runnersTable).where(eq(runnersTable.phone, phone));
    if (existing.length === 0) {
      await db.insert(runnersTable).values({ phone, otp, otpExpiresAt: expiresAt });
    } else {
      await db.update(runnersTable).set({ otp, otpExpiresAt: expiresAt }).where(eq(runnersTable.phone, phone));
    }
  } else {
    const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
    if (existing.length === 0) {
      await db.insert(usersTable).values({ phone, otp, otpExpiresAt: expiresAt });
    } else {
      await db.update(usersTable).set({ otp, otpExpiresAt: expiresAt }).where(eq(usersTable.phone, phone));
    }
  }

  // In production, send SMS. For dev, return OTP in response.
  res.json({ message: "OTP sent", otp });
});

// POST /auth/verify-otp
router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  const { phone, otp, role = "user" } = req.body;
  if (!phone || !otp) { res.status(400).json({ error: "Phone and OTP required" }); return; }

  if (role === "runner") {
    const [runner] = await db.select().from(runnersTable).where(eq(runnersTable.phone, phone));
    if (!runner || runner.otp !== otp) { res.status(401).json({ error: "Invalid OTP" }); return; }
    if (runner.otpExpiresAt && runner.otpExpiresAt < new Date()) { res.status(401).json({ error: "OTP expired" }); return; }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await db.insert(runnerSessionsTable).values({ runnerId: runner.id, token, expiresAt });
    await db.update(runnersTable).set({ otp: null, otpExpiresAt: null }).where(eq(runnersTable.id, runner.id));

    const { otp: _, otpExpiresAt: __, aadhaarNumber: ___, ...safeRunner } = runner;
    res.json({ token, role: "runner", runner: { ...safeRunner, kycStatus: runner.kycStatus ?? "pending" } });
  } else {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
    if (!user || user.otp !== otp) { res.status(401).json({ error: "Invalid OTP" }); return; }
    if (user.otpExpiresAt && user.otpExpiresAt < new Date()) { res.status(401).json({ error: "OTP expired" }); return; }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(userSessionsTable).values({ userId: user.id, token, expiresAt });
    await db.update(usersTable).set({ otp: null, otpExpiresAt: null }).where(eq(usersTable.id, user.id));

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

// POST /admin/login
router.post("/admin/login", async (req, res): Promise<void> => {
  const { password } = req.body;
  if (password !== "qbuddy@admin2025") {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  res.json({ token: "qbuddy-admin-2025", role: "admin" });
});

export default router;
