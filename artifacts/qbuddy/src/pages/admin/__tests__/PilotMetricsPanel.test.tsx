import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PilotMetricsPanel from "../PilotMetricsPanel";

vi.mock("@/lib/utils", () => ({
  formatCurrency: (v: number) => `₹${v?.toLocaleString("en-IN") ?? 0}`,
}));

describe("PilotMetricsPanel", () => {
  const defaultProps = {
    activeUsers: 45,
    activeComrades: 12,
    completedTasks: 230,
    avgAcceptanceTime: 90,
    avgQueueTime: 8,
    avgTrustScore: 74,
    revenueToday: 8500,
    totalUsers: 320,
  };

  it("renders all pilot metrics", () => {
    render(<PilotMetricsPanel pilotMetrics={defaultProps} />);
    expect(screen.getByText("Pilot Launch Metrics")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("230")).toBeInTheDocument();
    expect(screen.getByText("74")).toBeInTheDocument();
    expect(screen.getByText("320")).toBeInTheDocument();
  });

  it("formats avgAcceptanceTime > 60s as minutes", () => {
    render(<PilotMetricsPanel pilotMetrics={defaultProps} />);
    // 90s = Math.round(90/60)=2m + 30s
    expect(screen.getByText(/2m/)).toBeInTheDocument();
  });

  it("formats avgAcceptanceTime < 60s as seconds", () => {
    render(<PilotMetricsPanel pilotMetrics={{ ...defaultProps, avgAcceptanceTime: 45 }} />);
    expect(screen.getByText("45s")).toBeInTheDocument();
  });

  it("renders revenue with formatCurrency", () => {
    render(<PilotMetricsPanel pilotMetrics={defaultProps} />);
    expect(screen.getByText("₹8,500")).toBeInTheDocument();
  });

  it("renders metric labels", () => {
    render(<PilotMetricsPanel pilotMetrics={defaultProps} />);
    expect(screen.getByText("Active Users")).toBeInTheDocument();
    expect(screen.getByText("Active Comrades")).toBeInTheDocument();
    expect(screen.getByText("Avg Accept")).toBeInTheDocument();
    expect(screen.getByText("Avg Queue")).toBeInTheDocument();
    expect(screen.getByText("Avg Trust")).toBeInTheDocument();
  });

  it("handles null avgAcceptanceTime with 0 fallback", () => {
    render(<PilotMetricsPanel pilotMetrics={{ ...defaultProps, avgAcceptanceTime: null }} />);
    expect(screen.getByText("0s")).toBeInTheDocument();
  });

  it("renders avgAcceptanceTime of 0 as '0s'", () => {
    render(<PilotMetricsPanel pilotMetrics={{ ...defaultProps, avgAcceptanceTime: 0 }} />);
    expect(screen.getByText("0s")).toBeInTheDocument();
  });

  it("renders avgAcceptanceTime exactly 60 as '60s' (not minutes)", () => {
    render(<PilotMetricsPanel pilotMetrics={{ ...defaultProps, avgAcceptanceTime: 60 }} />);
    // 60 > 60 is false, so it stays in seconds
    expect(screen.getByText("60s")).toBeInTheDocument();
  });

  it("renders avgAcceptanceTime of 61 as '1m'", () => {
    render(<PilotMetricsPanel pilotMetrics={{ ...defaultProps, avgAcceptanceTime: 61 }} />);
    // Math.round(61/60) = 1, 61 % 60 = 1 → "1m 1s"
    expect(screen.getByText(/1m/)).toBeInTheDocument();
  });

  it("handles null revenueToday with 0 fallback", () => {
    render(<PilotMetricsPanel pilotMetrics={{ ...defaultProps, revenueToday: null }} />);
    expect(screen.getByText("₹0")).toBeInTheDocument();
  });

  it("handles null avgTrustScore without crashing", () => {
    const { container } = render(<PilotMetricsPanel pilotMetrics={{ ...defaultProps, avgTrustScore: null }} />);
    // avgTrustScore field renders null as empty (no "0" text), but component doesn't crash
    expect(container.querySelector('[class*="grid"]')).toBeInTheDocument();
  });
});
