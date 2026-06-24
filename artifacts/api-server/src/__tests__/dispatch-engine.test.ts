import { describe, it, expect, vi } from "vitest";
import { haversineKm } from "../lib/dispatch-engine";

vi.mock("@workspace/db", () => ({
  db: { select: vi.fn(), update: vi.fn(), insert: vi.fn() },
  runnersTable: "runners",
  tasksTable: "tasks",
  notificationsTable: "notifications",
  adminSettingsTable: "admin_settings",
}));

vi.mock("../index", () => ({
  io: { to: vi.fn(() => ({ emit: vi.fn() })), emit: vi.fn() },
}));

describe("haversineKm", () => {
  it("returns 0 for same coordinates", () => {
    const d = haversineKm(23.0225, 72.5714, 23.0225, 72.5714);
    expect(d).toBe(0);
  });

  it("calculates ~5km between SG Highway and Satellite", () => {
    const d = haversineKm(23.0260, 72.5070, 23.0225, 72.5714);
    expect(d).toBeGreaterThan(4);
    expect(d).toBeLessThan(7);
  });

  it("calculates ~10km across Ahmedabad", () => {
    const d = haversineKm(23.0030, 72.4810, 23.0470, 72.5830);
    expect(d).toBeGreaterThan(8);
    expect(d).toBeLessThan(12);
  });

  it("is commutative (A→B = B→A)", () => {
    const d1 = haversineKm(23.0225, 72.5714, 23.0500, 72.6000);
    const d2 = haversineKm(23.0500, 72.6000, 23.0225, 72.5714);
    expect(d1).toBeCloseTo(d2, 6);
  });

  it("returns km not meters", () => {
    // 23.0225,72.5714 to 23.0260,72.5070 is roughly 5.5km
    const d = haversineKm(23.0225, 72.5714, 23.0260, 72.5070);
    expect(d).toBeLessThan(10);
    expect(d).toBeGreaterThan(3);
  });
});
