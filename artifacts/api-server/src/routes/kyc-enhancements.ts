import { Router, type IRouter } from "express";
import { db, runnersTable, usersTable, notificationsTable, paymentAuditLogTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRunner, requireAdmin } from "../lib/auth";
import { uploadDataUrl } from "../lib/storage";
import { encrypt } from "../lib/crypto";

const router: IRouter = Router();

// Runner KYC resubmission: allow rejected runners to update fields and resubmit
router.post("/runners/kyc/resubmit", requireRunner, async (req, res): Promise<void> => {
  const runner = req.runner;
  if (!runner) { res.status(401).json({ error: "Unauthorized" }); return; };
  if (runner.kycStatus !== "rejected") {
    res.status(400).json({ error: "Only rejected runners can resubmit KYC" });
    return;
  }
  const { fullName, aadhaarNumber, aadhaarFront, aadhaarBack, selfie, bankAccount, bankIfsc,
    bankAccountHolder, emergencyContactName, emergencyContactPhone, emergencyContactRelation } = req.body;

  // Upload images to B2 if provided as data URLs
  const [aadhaarFrontUrl, aadhaarBackUrl, selfieUrl] = await Promise.all([
    aadhaarFront ? uploadDataUrl(aadhaarFront, "kyc/runners") : Promise.resolve(null),
    aadhaarBack ? uploadDataUrl(aadhaarBack, "kyc/runners") : Promise.resolve(null),
    selfie ? uploadDataUrl(selfie, "kyc/runners") : Promise.resolve(null),
  ]);

  const kycUpdates: Record<string, unknown> = { kycStatus: "pending", kycRejectionReason: null };
  if (fullName) kycUpdates.fullName = fullName;
  if (aadhaarNumber) kycUpdates.aadhaarNumber = encrypt(aadhaarNumber);
  if (aadhaarFrontUrl) kycUpdates.aadhaarFront = encrypt(aadhaarFrontUrl);
  if (aadhaarBackUrl) kycUpdates.aadhaarBack = encrypt(aadhaarBackUrl);
  if (selfieUrl) kycUpdates.selfie = selfieUrl;
  if (bankAccount) kycUpdates.bankAccount = bankAccount;
  if (bankIfsc) kycUpdates.bankIfsc = bankIfsc;
  if (bankAccountHolder) kycUpdates.bankAccountHolder = bankAccountHolder;
  if (emergencyContactName) kycUpdates.emergencyContactName = emergencyContactName;
  if (emergencyContactPhone) kycUpdates.emergencyContactPhone = emergencyContactPhone;
  if (emergencyContactRelation) kycUpdates.emergencyContactRelation = emergencyContactRelation;

  const [updated] = await db.update(runnersTable).set(kycUpdates).where(eq(runnersTable.id, runner.id)).returning();
  const { otp, otpExpiresAt, aadhaarNumber: _an, ...safe } = updated;
  res.json({ ...safe, message: "KYC resubmitted for review" });
});

// Admin bulk KYC: approve or reject multiple users/runners at once
router.post("/admin/kyc/bulk", requireAdmin, async (req, res): Promise<void> => {
  const { type, ids, action, rejectionReason } = req.body;

  const entityType = type;
  if (!entityType || !Array.isArray(ids) || ids.length === 0 || (action !== "approve" && action !== "reject")) {
    res.status(400).json({ error: "type (user|runner), ids (number[]), and action (approve|reject) are required" });
    return;
  }

  if (ids.length > 50) {
    res.status(400).json({ error: "Maximum 50 items per bulk operation" });
    return;
  }

  // Validate all IDs are positive finite numbers
  if (!ids.every(id => typeof id === "number" && Number.isFinite(id) && id > 0)) {
    res.status(400).json({ error: "All IDs must be positive finite numbers" });
    return;
  }

  const table = entityType === "runner" ? runnersTable : usersTable;
  const results: { id: number; success: boolean; error?: string }[] = [];

  for (const id of ids) {
    try {
      const updates: Record<string, unknown> = {};
      if (action === "approve") {
        updates.kycStatus = "verified";
        if (entityType === "runner") updates.dispatchAllowed = true;
      } else {
        updates.kycStatus = "rejected";
        updates.kycRejectionReason = rejectionReason ?? null;
      }

      const [updated] = await db.update(table).set(updates).where(eq(table.id, id)).returning();
      if (!updated) {
        results.push({ id, success: false, error: "Not found" });
        continue;
      }

      // Audit log
      await db.insert(paymentAuditLogTable).values({
        taskId: null, previousStatus: null, newStatus: action,
        actor: req.admin?.username ?? "admin", actorType: "admin",
        reason: `Bulk ${action} KYC for ${entityType} #${id}${rejectionReason ? `: ${rejectionReason}` : ""}`,
        metadata: JSON.stringify({ id, entityType, action, bulk: true }),
      });

      // Create notification
      const notifData = entityType === "runner"
        ? { runnerId: id, type: action === "approve" ? "kyc_approved" : "kyc_rejected",
            title: action === "approve" ? "KYC Approved!" : "KYC Rejected",
            message: action === "approve" ? "Your KYC has been verified." : `Rejected: ${rejectionReason ?? "Please resubmit"}` }
        : { userId: id, type: action === "approve" ? "kyc_approved" : "kyc_rejected",
            title: action === "approve" ? "KYC Verified!" : "KYC Rejected",
            message: action === "approve" ? "Your identity has been verified." : `Rejected: ${rejectionReason ?? "Please resubmit"}` };
      await db.insert(notificationsTable).values(notifData);

      results.push({ id, success: true });
    } catch (err) {
      results.push({ id, success: false, error: String(err) });
    }
  }

  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  res.json({ succeeded, failed, total: ids.length, results });
});

export default router;
