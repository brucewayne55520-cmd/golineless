import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @workspace/db since gps-engine imports it at module level
vi.mock("@workspace/db", () => ({
  db: { select: vi.fn(), update: vi.fn() },
  adminSettingsTable: "admin_settings",
}));
import {
  haversineMeters,
  detectDuplicateProof,
  validateTimelineTransition,
} from "../lib/gps-engine";

describe("haversineMeters", () => {
  it("returns 0 for same coordinates", () => {
    const d = haversineMeters(23.0225, 72.5714, 23.0225, 72.5714);
    expect(d).toBe(0);
  });

  it("calculates correct distance between known Ahmedabad points", () => {
    // SG Highway to Satellite (roughly ~5km)
    const d = haversineMeters(23.0260, 72.5070, 23.0225, 72.5714);
    expect(d).toBeGreaterThan(4000);
    expect(d).toBeLessThan(7000);
  });

  it("calculates reasonable distance across Ahmedabad", () => {
    // Bopal to CG Road (roughly ~10km)
    const d = haversineMeters(23.0030, 72.4810, 23.0470, 72.5830);
    expect(d).toBeGreaterThan(8000);
    expect(d).toBeLessThan(12000);
  });

  it("is symmetric (A→B same as B→A)", () => {
    const d1 = haversineMeters(23.0225, 72.5714, 23.0500, 72.6000);
    const d2 = haversineMeters(23.0500, 72.6000, 23.0225, 72.5714);
    expect(d1).toBe(d2);
  });
});

describe("detectDuplicateProof", () => {
  it("returns false for no existing photos", () => {
    const result = detectDuplicateProof([], "general");
    expect(result.isDuplicate).toBe(false);
    expect(result.existingCount).toBe(0);
  });

  it("returns false for fewer than 3 same-type photos", () => {
    const photos = [
      JSON.stringify({ proofType: "general" }),
      JSON.stringify({ proofType: "general" }),
    ];
    const result = detectDuplicateProof(photos, "general");
    expect(result.isDuplicate).toBe(false);
    expect(result.existingCount).toBe(2);
  });

  it("returns true for 3+ same-type photos", () => {
    const photos = [
      JSON.stringify({ proofType: "general" }),
      JSON.stringify({ proofType: "general" }),
      JSON.stringify({ proofType: "general" }),
    ];
    const result = detectDuplicateProof(photos, "general");
    expect(result.isDuplicate).toBe(true);
    expect(result.existingCount).toBe(3);
  });

  it("ignores different proof types", () => {
    const photos = [
      JSON.stringify({ proofType: "reached_pickup" }),
      JSON.stringify({ proofType: "reached_pickup" }),
      JSON.stringify({ proofType: "reached_pickup" }),
    ];
    const result = detectDuplicateProof(photos, "general");
    expect(result.isDuplicate).toBe(false);
    expect(result.existingCount).toBe(0);
  });

  it("handles malformed JSON gracefully", () => {
    const photos = ["invalid-json", JSON.stringify({ proofType: "general" })];
    const result = detectDuplicateProof(photos, "general");
    expect(result.isDuplicate).toBe(false);
    expect(result.existingCount).toBe(1);
  });

  it("handles null/undefined photos", () => {
    expect(detectDuplicateProof(null as unknown as string[], "test").isDuplicate).toBe(false);
    expect(detectDuplicateProof(undefined as unknown as string[], "test").isDuplicate).toBe(false);
  });
});

describe("validateTimelineTransition", () => {
  it("allows pending → assigned", () => {
    const result = validateTimelineTransition("pending", "assigned");
    expect(result.valid).toBe(true);
  });

  it("allows pending → cancelled", () => {
    const result = validateTimelineTransition("pending", "cancelled");
    expect(result.valid).toBe(true);
  });

  it("allows assigned → on_the_way", () => {
    const result = validateTimelineTransition("assigned", "on_the_way");
    expect(result.valid).toBe(true);
  });

  it("allows in_progress → completed", () => {
    const result = validateTimelineTransition("in_progress", "completed");
    expect(result.valid).toBe(true);
  });

  it("blocks completed → any", () => {
    expect(validateTimelineTransition("completed", "in_progress").valid).toBe(false);
    expect(validateTimelineTransition("completed", "cancelled").valid).toBe(false);
    expect(validateTimelineTransition("completed", "pending").valid).toBe(false);
  });

  it("blocks cancelled → any", () => {
    expect(validateTimelineTransition("cancelled", "pending").valid).toBe(false);
    expect(validateTimelineTransition("cancelled", "assigned").valid).toBe(false);
  });

  it("blocks skipping states (pending → in_progress)", () => {
    const result = validateTimelineTransition("pending", "in_progress");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Cannot transition");
  });

  it("allows waiting_started → in_progress", () => {
    const result = validateTimelineTransition("waiting_started", "in_progress");
    expect(result.valid).toBe(true);
  });

  it("allows any other status → cancelled", () => {
    const cancellable = ["assigned", "on_the_way", "at_location", "in_progress", "waiting_started"];
    for (const status of cancellable) {
      expect(validateTimelineTransition(status, "cancelled").valid).toBe(true);
    }
  });

  it("returns reason for invalid transitions", () => {
    const result = validateTimelineTransition("pending", "completed");
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
    expect(result.reason).toContain("pending");
    expect(result.reason).toContain("completed");
  });
});
