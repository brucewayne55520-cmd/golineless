import { describe, it, expect } from "vitest";

// ── Field redaction logic (replicates what GET /runners/:id does) ──
// The route handler destructures the runner and returns only safe fields.
// Sensitive fields: phone, email, aadhaarNumber, aadhaarFront, aadhaarBack,
//   bankAccount, bankIfsc, bankAccountHolder, emergencyContact*, otp*
describe("Runner field redaction", () => {
  const fullRunner = {
    id: 1,
    name: "Test Comrade",
    phone: "+919999999999",
    email: "test@example.com",
    city: "Ahmedabad",
    area: "Bopal",
    rating: "4.5",
    totalTasks: 25,
    totalEarnings: "50000",
    kycStatus: "verified",
    isOnline: true,
    avatar: null,
    aadhaarNumber: "1234-5678-9012",
    aadhaarFront: "data:image/jpg;base64,...",
    aadhaarBack: "data:image/jpg;base64,...",
    bankAccount: "1234567890",
    bankIfsc: "SBIN0001234",
    bankAccountHolder: "Test Holder",
    emergencyContactName: "Family",
    emergencyContactPhone: "+919999999998",
    emergencyContactRelation: "Spouse",
    otp: "123456",
    otpExpiresAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  // Replicate the safe-pick pattern used in the route handler
  const SAFE_FIELDS = [
    "id", "name", "city", "area", "avatar", "gender",
    "kycStatus", "kycRejectionReason", "isOnline",
    "rating", "totalTasks", "totalEarnings",
    "currentLat", "currentLng", "createdAt",
    "trustScore", "trustBadge", "averageRating", "averageResponseTime",
    "dispatchAllowed", "tasksCompleted", "onboardingStep",
  ] as const;

  const SENSITIVE_FIELDS = [
    "phone", "email", "aadhaarNumber", "aadhaarFront", "aadhaarBack",
    "bankAccount", "bankIfsc", "bankAccountHolder",
    "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation",
    "otp", "otpExpiresAt", "otpAttempts", "otpLockedUntil",
  ];

  it("keeps all safe fields from the runner object", () => {
    const redacted: Record<string, any> = {};
    for (const field of SAFE_FIELDS) {
      if (field in fullRunner) {
        redacted[field] = (fullRunner as Record<string, any>)[field];
      }
    }

    expect(redacted.id).toBe(1);
    expect(redacted.name).toBe("Test Comrade");
    expect(redacted.city).toBe("Ahmedabad");
    expect(redacted.rating).toBe("4.5");
    expect(redacted.totalTasks).toBe(25);
    expect(redacted.kycStatus).toBe("verified");
    expect(redacted.isOnline).toBe(true);
  });

  it("excludes all sensitive fields from the redacted output", () => {
    const redacted: Record<string, any> = {};
    for (const field of SAFE_FIELDS) {
      if (field in fullRunner) {
        redacted[field] = (fullRunner as Record<string, any>)[field];
      }
    }

    for (const field of SENSITIVE_FIELDS) {
      expect(redacted).not.toHaveProperty(field);
    }
  });

  it("handles null ratings gracefully (no crash)", () => {
    const runner = { ...fullRunner, rating: null };
    const rating = runner.rating !== null ? Number(runner.rating) : null;
    expect(rating).toBeNull();
  });

  it("converts rating string to number when present", () => {
    const rating = Number(fullRunner.rating);
    expect(rating).toBe(4.5);
  });
});
