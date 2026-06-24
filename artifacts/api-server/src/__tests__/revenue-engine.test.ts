import { describe, it, expect, vi } from "vitest";

// Mock @workspace/db since revenue-engine imports it at module level
vi.mock("@workspace/db", () => ({
  db: { select: vi.fn(), update: vi.fn(), insert: vi.fn() },
  tasksTable: "tasks",
  runnersTable: "runners",
  adminSettingsTable: "admin_settings",
}));
import {
  calculateWaitingCharge,
  calculateWaitingChargeLegacy,
  getPriorityFee,
  getUrgencyMultiplier,
  calculateTaskRevenue,
  generateInvoiceNumber,
} from "../lib/revenue-engine";

// Default bracket config matching the engine's defaults
const DEFAULT_BRACKET_CONFIG = {
  waitingBracket1Min: 30,
  waitingBracket1Charge: 0,
  waitingBracket2Min: 60,
  waitingBracket2Charge: 30,
  waitingBracket3Min: 120,
  waitingBracket3Charge: 80,
  waitingBracket4Charge: 150,
};

describe("calculateWaitingCharge", () => {
  it("returns bracket 1 (free) for 0-30 min waiting", () => {
    const result = calculateWaitingCharge(15, DEFAULT_BRACKET_CONFIG);
    expect(result.waitingChargeAmount).toBe(0);
    expect(result.bracket).toBe(1);
    expect(result.bracketLabel).toContain("min");
  });

  it("returns bracket 2 charge for 31-60 min waiting", () => {
    const result = calculateWaitingCharge(45, DEFAULT_BRACKET_CONFIG);
    expect(result.waitingChargeAmount).toBe(30);
    expect(result.bracket).toBe(2);
  });

  it("returns bracket 3 charge for 61-120 min waiting", () => {
    const result = calculateWaitingCharge(90, DEFAULT_BRACKET_CONFIG);
    expect(result.waitingChargeAmount).toBe(80);
    expect(result.bracket).toBe(3);
  });

  it("returns bracket 4 charge for 120+ min waiting", () => {
    const result = calculateWaitingCharge(180, DEFAULT_BRACKET_CONFIG);
    expect(result.waitingChargeAmount).toBe(150);
    expect(result.bracket).toBe(4);
  });

  it("handles exactly at bracket boundaries", () => {
    const b1 = calculateWaitingCharge(30, DEFAULT_BRACKET_CONFIG);
    expect(b1.bracket).toBe(1);

    const b2 = calculateWaitingCharge(31, DEFAULT_BRACKET_CONFIG);
    expect(b2.bracket).toBe(2);

    const b3 = calculateWaitingCharge(61, DEFAULT_BRACKET_CONFIG);
    expect(b3.bracket).toBe(3);

    const b4 = calculateWaitingCharge(121, DEFAULT_BRACKET_CONFIG);
    expect(b4.bracket).toBe(4);
  });
});

describe("calculateWaitingChargeLegacy", () => {
  it("charges nothing within free minutes", () => {
    const result = calculateWaitingChargeLegacy(10, { freeWaitingMinutes: 15, waitingChargePerMinute: 2 });
    expect(result.chargeableMinutes).toBe(0);
    expect(result.waitingChargeAmount).toBe(0);
  });

  it("charges for minutes beyond free threshold", () => {
    const result = calculateWaitingChargeLegacy(30, { freeWaitingMinutes: 15, waitingChargePerMinute: 2 });
    expect(result.chargeableMinutes).toBe(15);
    expect(result.waitingChargeAmount).toBe(30);
  });

  it("charges full amount with no free minutes", () => {
    const result = calculateWaitingChargeLegacy(60, { freeWaitingMinutes: 0, waitingChargePerMinute: 5 });
    expect(result.chargeableMinutes).toBe(60);
    expect(result.waitingChargeAmount).toBe(300);
  });
});

describe("getPriorityFee", () => {
  const config = { priorityFeeAmount: 49, emergencyFeeAmount: 99 };

  it("returns 0 for normal priority", () => {
    expect(getPriorityFee("normal", config)).toBe(0);
  });

  it("returns priority fee for priority level", () => {
    expect(getPriorityFee("priority", config)).toBe(49);
  });

  it("returns emergency fee for emergency level", () => {
    expect(getPriorityFee("emergency", config)).toBe(99);
  });
});

describe("getUrgencyMultiplier", () => {
  const config = { urgencyNormalMultiplier: 1.0, urgencyUrgentMultiplier: 1.25, urgencyEmergencyMultiplier: 1.5 };

  it("returns 1.0 for normal urgency", () => {
    expect(getUrgencyMultiplier("normal", config)).toBe(1.0);
  });

  it("returns 1.25 for urgent", () => {
    expect(getUrgencyMultiplier("urgent", config)).toBe(1.25);
  });

  it("returns 1.5 for emergency", () => {
    expect(getUrgencyMultiplier("emergency", config)).toBe(1.5);
  });

  it("defaults to normal multiplier for unknown urgency", () => {
    expect(getUrgencyMultiplier("unknown", config)).toBe(1.0);
  });
});

describe("calculateTaskRevenue", () => {
  it("calculates revenue correctly for a basic task", () => {
    const result = calculateTaskRevenue({
      basePrice: 149,
      distanceCharge: 0,
      urgencyCharge: 0,
      waitingChargeAmount: 0,
      priorityFee: 0,
      urgencyMultiplier: 1.0,
      runnerPayoutPercent: 70,
    });
    expect(result.price).toBe(149);
    expect(result.runnerEarning).toBe(104); // 149 * 0.7 = 104.3 → 104
    expect(result.platformFee).toBe(45);     // 149 - 104 = 45
    expect(result.waitingEarnings).toBe(0);
  });

  it("includes distance charges in revenue", () => {
    const result = calculateTaskRevenue({
      basePrice: 149,
      distanceCharge: 20,
      urgencyCharge: 0,
      waitingChargeAmount: 0,
      priorityFee: 0,
      urgencyMultiplier: 1.0,
      runnerPayoutPercent: 70,
    });
    expect(result.price).toBe(169);
    expect(result.runnerEarning).toBe(118); // 169 * 0.7 ≈ 118
  });

  it("applies urgency multiplier correctly", () => {
    const result = calculateTaskRevenue({
      basePrice: 149,
      distanceCharge: 0,
      urgencyCharge: 0,
      waitingChargeAmount: 0,
      priorityFee: 0,
      urgencyMultiplier: 1.5,
      runnerPayoutPercent: 70,
    });
    expect(result.price).toBe(224); // 149 * 1.5 = 223.5 → 224
  });

  it("includes waiting charge and priority fee", () => {
    const result = calculateTaskRevenue({
      basePrice: 149,
      distanceCharge: 0,
      urgencyCharge: 0,
      waitingChargeAmount: 30,
      priorityFee: 49,
      urgencyMultiplier: 1.0,
      runnerPayoutPercent: 70,
    });
    expect(result.price).toBe(228); // 149 + 30 + 49 = 228
    expect(result.waitingEarnings).toBe(21); // 30 * 0.7 = 21
  });

  it("handles different payout percentages", () => {
    const result = calculateTaskRevenue({
      basePrice: 100,
      distanceCharge: 0,
      urgencyCharge: 0,
      waitingChargeAmount: 0,
      priorityFee: 0,
      urgencyMultiplier: 1.0,
      runnerPayoutPercent: 50,
    });
    expect(result.price).toBe(100);
    expect(result.runnerEarning).toBe(50);
    expect(result.platformFee).toBe(50);
  });
});

describe("generateInvoiceNumber", () => {
  it("generates correct format: GL-YYYYMM-XXXXX", () => {
    const invoice = generateInvoiceNumber(42);
    const now = new Date();
    const prefix = `GL-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    expect(invoice).toBe(`${prefix}-00042`);
  });

  it("pads task IDs up to 5 digits", () => {
    const invoice = generateInvoiceNumber(123456);
    expect(invoice).toMatch(/^GL-\d{6}-123456$/);
  });
});
