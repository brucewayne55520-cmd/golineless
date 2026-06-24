import { describe, it, expect, vi } from "vitest";
import { getTrustBadge } from "../lib/trust-engine";

vi.mock("@workspace/db", () => ({
  db: { select: vi.fn(), update: vi.fn(), insert: vi.fn() },
  tasksTable: "tasks",
  runnersTable: "runners",
  reviewsTable: "reviews",
}));

describe("getTrustBadge", () => {
  it("returns 'elite' for score >= 95", () => {
    expect(getTrustBadge(95).badge).toBe("elite");
    expect(getTrustBadge(99).badge).toBe("elite");
    expect(getTrustBadge(100).badge).toBe("elite");
  });

  it("returns 'trusted' for score 90-94", () => {
    expect(getTrustBadge(90).badge).toBe("trusted");
    expect(getTrustBadge(92).badge).toBe("trusted");
    expect(getTrustBadge(94).badge).toBe("trusted");
  });

  it("returns 'verified' for score 80-89", () => {
    expect(getTrustBadge(80).badge).toBe("verified");
    expect(getTrustBadge(85).badge).toBe("verified");
    expect(getTrustBadge(89).badge).toBe("verified");
  });

  it("returns 'active' for score 70-79", () => {
    expect(getTrustBadge(70).badge).toBe("active");
    expect(getTrustBadge(75).badge).toBe("active");
    expect(getTrustBadge(79).badge).toBe("active");
  });

  it("returns 'improving' for score < 70", () => {
    expect(getTrustBadge(0).badge).toBe("improving");
    expect(getTrustBadge(50).badge).toBe("improving");
    expect(getTrustBadge(69).badge).toBe("improving");
  });

  it("includes human-readable label with each badge", () => {
    expect(getTrustBadge(95).label).toBe("Elite");
    expect(getTrustBadge(90).label).toBe("Trusted");
    expect(getTrustBadge(80).label).toBe("Verified");
    expect(getTrustBadge(70).label).toBe("Active");
    expect(getTrustBadge(50).label).toBe("Improving");
  });

  it("handles boundary values correctly", () => {
    expect(getTrustBadge(95).badge).toBe("elite");
    expect(getTrustBadge(89).badge).toBe("verified");
    expect(getTrustBadge(79).badge).toBe("active");
    expect(getTrustBadge(69).badge).toBe("improving");
  });
});
