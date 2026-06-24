import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FraudAlertsWidget from "../FraudAlertsWidget";
import type { FraudFlagListFlagsItem } from "@workspace/api-client-react";

describe("FraudAlertsWidget", () => {
  const mockFlags: FraudFlagListFlagsItem[] = [
    {
      id: "f1",
      type: "otp_brute_force",
      severity: "high",
      taskId: 123,
      runnerId: 45,
      reason: "Multiple OTP attempts detected",
      timestamp: "2025-06-15T10:30:00Z",
    },
    {
      id: "f2",
      type: "gps_validation_failed",
      severity: "medium",
      taskId: 456,
      reason: "GPS coordinates outside expected area",
      timestamp: "2025-06-15T10:25:00Z",
    },
  ];

  it("renders empty when no flags", () => {
    const { container } = render(<FraudAlertsWidget fraud={{ highSeverity: 0, total: 0 }} flags={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders section title", () => {
    render(<FraudAlertsWidget fraud={{ highSeverity: 1, total: 2 }} flags={mockFlags} />);
    expect(screen.getByText("Fraud Center")).toBeInTheDocument();
  });

  it("shows severity counts", () => {
    render(<FraudAlertsWidget fraud={{ highSeverity: 1, total: 2 }} flags={mockFlags} />);
    expect(screen.getByText("1 high")).toBeInTheDocument();
    expect(screen.getByText("2 total")).toBeInTheDocument();
  });

  it("renders fraud flag reasons", () => {
    render(<FraudAlertsWidget fraud={{ highSeverity: 1, total: 2 }} flags={mockFlags} />);
    expect(screen.getByText("Multiple OTP attempts detected")).toBeInTheDocument();
  });

  it("shows task and runner IDs", () => {
    render(<FraudAlertsWidget fraud={{ highSeverity: 1, total: 2 }} flags={mockFlags} />);
    expect(screen.getByText(/Task #123/)).toBeInTheDocument();
    expect(screen.getByText(/Comrade #45/)).toBeInTheDocument();
  });

  it("displays severity badges", () => {
    render(<FraudAlertsWidget fraud={{ highSeverity: 1, total: 2 }} flags={mockFlags} />);
    expect(screen.getByText("high")).toBeInTheDocument();
    expect(screen.getByText("medium")).toBeInTheDocument();
  });

  it("handles null/undefined fraud data gracefully", () => {
    render(<FraudAlertsWidget fraud={{}} flags={[]} />);
    expect(screen.queryByText("Fraud Center")).not.toBeInTheDocument();
  });

  it("does not show high-severity badge when highSeverity is 0", () => {
    render(<FraudAlertsWidget fraud={{ highSeverity: 0, total: 3 }} flags={mockFlags} />);
    // '0 high' count badge should NOT render
    expect(screen.queryByText(/\d+ high/)).not.toBeInTheDocument();
    expect(screen.getByText("3 total")).toBeInTheDocument();
  });

  it("shows severity count when highSeverity > 0", () => {
    render(<FraudAlertsWidget fraud={{ highSeverity: 2, total: 5 }} flags={mockFlags} />);
    expect(screen.getByText("2 high")).toBeInTheDocument();
    expect(screen.getByText("5 total")).toBeInTheDocument();
  });

  it("truncates flags list to 10 items", () => {
    const manyFlags: FraudFlagListFlagsItem[] = Array.from({ length: 15 }, (_, i) => ({
      id: `f${i}`,
      type: "test",
      severity: i < 5 ? "high" as const : "medium" as const,
      taskId: i,
      timestamp: "2025-06-15T10:00:00Z",
    }));
    const { container } = render(<FraudAlertsWidget fraud={{ highSeverity: 5, total: 15 }} flags={manyFlags} />);
    // Should render at most 10 flag rows
    const items = container.querySelectorAll("[class*='flex items-center gap-3 px-3 py-2']");
    expect(items.length).toBeLessThanOrEqual(10);
  });
});
