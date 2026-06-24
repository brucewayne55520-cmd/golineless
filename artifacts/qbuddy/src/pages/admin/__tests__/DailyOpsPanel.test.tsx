import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DailyOpsPanel from "../DailyOpsPanel";

vi.mock("@/lib/utils", () => ({
  formatCurrency: (v: number) => `₹${v?.toLocaleString("en-IN") ?? 0}`,
}));

describe("DailyOpsPanel", () => {
  const defaultProps = {
    tasksToday: 85,
    completed: 72,
    acceptanceRate: 91,
    completionRate: 85,
    cancellationRate: 5,
    revenueToday: 28000,
    avgRating: 4.5,
  };

  it("renders section title", () => {
    render(<DailyOpsPanel dailyOps={defaultProps} />);
    expect(screen.getByText("Daily Operations")).toBeInTheDocument();
  });

  it("displays all operation metrics", () => {
    render(<DailyOpsPanel dailyOps={defaultProps} />);
    expect(screen.getByText("85")).toBeInTheDocument();
    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.getByText("91%")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("5%")).toBeInTheDocument();
  });

  it("shows formatted revenue", () => {
    render(<DailyOpsPanel dailyOps={defaultProps} />);
    expect(screen.getByText("₹28,000")).toBeInTheDocument();
  });

  it("shows avg rating with fallback", () => {
    render(<DailyOpsPanel dailyOps={defaultProps} />);
    expect(screen.getByText("4.5")).toBeInTheDocument();
  });

  it("handles null rating with dash", () => {
    render(<DailyOpsPanel dailyOps={{ ...defaultProps, avgRating: null }} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
