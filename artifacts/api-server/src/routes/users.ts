import { Router, type IRouter } from "express";
import { db, usersTable, tasksTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireUser } from "../lib/auth";
import { logger } from "../lib/logger";
import crypto from "crypto";
import { encrypt, decrypt } from "../lib/crypto";
import { uploadDataUrl } from "../lib/storage";
import { sendOtp, verifyOtp } from "../lib/sms";

const router: IRouter = Router();

/**
 * Generate a unique ID for users: GLU-XXXX-XXXXXX
 * 6 random hex chars = 16M+ possibilities — safe for user-facing IDs.
 */
function generateUserUniqueId(id: number): string {
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `GLU-${String(id).padStart(4, "0")}-${suffix}`;
}

/** Fields to strip from user responses (sensitive/internal). */
const SENSITIVE_FIELDS = ["otp", "otpExpiresAt", "passwordHash", "passwordResetToken", "passwordResetExpiresAt"] as const;

// GET /users/me
router.get("/users/me", requireUser, async (req, res): Promise<void> => {
  const user = req.user;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const safe = Object.fromEntries(
    Object.entries(user).filter(([k]) => !SENSITIVE_FIELDS.includes(k as typeof SENSITIVE_FIELDS[number]))
  );
  res.json(safe);
});

// PATCH /users/me — update profile fields
router.patch("/users/me", requireUser, async (req, res): Promise<void> => {
  const user = req.user;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { name, email, city, area, language, phone } = req.body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (city !== undefined) updates.city = city;
  if (area !== undefined) updates.area = area;
  if (language !== undefined) updates.language = language;

  // S3: Phone update requires OTP verification — send OTP first, then call PATCH with otp field
  if (phone && phone !== user.phone) {
    const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.phone, phone));
    if (existing && existing.id !== user.id) {
      res.status(409).json({ error: "Phone number already in use" });
      return;
    }
    // Require OTP for phone change to prevent account takeover
    const { otp: phoneOtp } = req.body;
    if (!phoneOtp) {
      // Send OTP to the new phone number
      const sent = await sendOtp(phone);
      if (!sent) {
        res.status(500).json({ error: "Failed to send OTP to new phone number" });
        return;
      }
      res.status(202).json({ message: "OTP sent to new phone number. Please verify.", phoneOtpRequired: true });
      return;
    }
    // Verify OTP against new phone
    const valid = await verifyOtp(phone, phoneOtp);
    if (!valid) {
      res.status(401).json({ error: "Invalid OTP for phone verification" });
      return;
    }
    updates.phone = phone;
  }

  // Auto-generate unique_id if missing
  if (!user.uniqueId) {
    updates.uniqueId = generateUserUniqueId(user.id);
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, user.id))
    .returning();

  const safe = Object.fromEntries(
    Object.entries(updated).filter(([k]) => !SENSITIVE_FIELDS.includes(k as typeof SENSITIVE_FIELDS[number]))
  );
  res.json(safe);
});

// POST /users/me/kyc — submit user KYC (Aadhaar verification)
router.post("/users/me/kyc", requireUser, async (req, res): Promise<void> => {
  const user = req.user;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { aadhaarNumber, aadhaarFront, aadhaarBack, emergencyContact } = req.body;

  if (!aadhaarNumber || !aadhaarFront || !aadhaarBack) {
    res.status(400).json({ error: "Aadhaar number and both sides of the card are required" });
    return;
  }

  // Validate Aadhaar format (12 digits, optionally with spaces/dashes)
  const cleanAadhaar = aadhaarNumber.replace(/[\s-]/g, "");
  if (!/^\d{12}$/.test(cleanAadhaar)) {
    res.status(400).json({ error: "Invalid Aadhaar number. Must be 12 digits." });
    return;
  }

  logger.info({ userId: user.id }, "User KYC submitted");

  // S2: Upload Aadhaar images to B2 cloud storage instead of storing base64 in DB
  const [aadhaarFrontUrl, aadhaarBackUrl] = await Promise.all([
    uploadDataUrl(aadhaarFront, "kyc/users"),
    uploadDataUrl(aadhaarBack, "kyc/users"),
  ]);

  await db
    .update(usersTable)
    .set({
      aadhaarNumber: encrypt(cleanAadhaar),
      aadhaarFront: encrypt(aadhaarFrontUrl),
      aadhaarBack: encrypt(aadhaarBackUrl),
      kycStatus: "pending",
      emergencyContact: emergencyContact || null,
    })
    .where(eq(usersTable.id, user.id));

  res.json({ kycStatus: "pending", message: "KYC submitted. Under review — typically within 24 hours." });
});

// PATCH /users/me/avatar — upload profile photo
router.patch("/users/me/avatar", requireUser, async (req, res): Promise<void> => {
  const user = req.user;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { avatar } = req.body; // base64 data URL or URL string
  if (!avatar) {
    res.status(400).json({ error: "No avatar provided" }); return;
  }
  const avatarUrl = await uploadDataUrl(avatar, "avatars/users");
  if (!avatarUrl) {
    res.status(500).json({ error: "Failed to upload avatar" }); return;
  }
  const [updated] = await db
    .update(usersTable)
    .set({ avatar: avatarUrl })
    .where(eq(usersTable.id, user.id))
    .returning();
  res.json({ avatar: updated.avatar });
});

// GET /users/me/stats
router.get("/users/me/stats", requireUser, async (req, res): Promise<void> => {
  const user = req.user;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [stats] = await db.select({
    totalTasks: sql<number>`COUNT(CASE WHEN ${tasksTable.status} = 'completed' THEN 1 END)`,
    valueSaved: sql<number>`COALESCE(SUM(CASE WHEN ${tasksTable.status} = 'completed' THEN ${tasksTable.price}::numeric ELSE 0 END), 0)`,
  }).from(tasksTable).where(eq(tasksTable.userId, user.id));
  const totalTasks = Number(stats?.totalTasks ?? 0);
  const hoursSaved = totalTasks * 2.5; // avg 2.5 hrs saved per task
  const valueSaved = Number(stats?.valueSaved ?? 0);
  res.json({ totalTasks, hoursSaved, valueSaved });
});

export default router;
