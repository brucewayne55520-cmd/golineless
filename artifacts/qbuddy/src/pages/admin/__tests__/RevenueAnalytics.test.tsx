import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RevenueAnalytics from "../RevenueAnalytics";

vi.mock("@/lib/utils", () => ({
  formatCurrency: (v: number) => `₹${v?.toLocaleString("en-IN") ?? 0}`,
}));

describe("RevenueAnalytics", () => {
  const defaultProps = {
    today: 12000,
    thisWeek: 75000,
    thisMonth: 320000,
    waitingRevenue: 4500,
    priorityRevenue: 2800,
    subscriptionRevenue: 15000,
  };

  it("renders revenue grid with formatted values", () => {
    render(<RevenueAnalytics revenueMetrics={defaultProps} />);
    expect(screen.getByText("Revenue Analytics")).toBeInTheDocument();
    expect(screen.getByText("₹12,000")).toBeInTheDocument();
    expect(screen.getByText("₹75,000")).toBeInTheDocument();
    expect(screen.getByText("₹3,20,000")).toBeInTheDocument();
  });

  it("renders all revenue category labels", () => {
    render(<RevenueAnalytics revenueMetrics={defaultProps} />);
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("This Week")).toBeInTheDocument();
    expect(screen.getByText("This Month")).toBeInTheDocument();
    expect(screen.getByText("Waiting Rev")).toBeInTheDocument();
    expect(screen.getByText("Priority Rev")).toBeInTheDocument();
    expect(screen.getByText("Platform Rev")).toBeInTheDocument();
  });

  it("handles null values with 0 fallback", () => {
    render(<RevenueAnalytics revenueMetrics={{}} />);
    const zeros = screen.getAllByText("₹0");
    expect(zeros.length).toBeGreaterThanOrEqual(6);
  });

  it("renders partial data — only sets provided fields", () => {
    render(<RevenueAnalytics revenueMetrics={{ today: 10000, thisMonth: 50000 }} />);
    expect(screen.getByText("₹10,000")).toBeInTheDocument();
    expect(screen.getByText("₹50,000")).toBeInTheDocument();
    // Unset fields fall back to ₹0
    const fallbacks = screen.getAllByText("₹0");
    expect(fallbacks.length).toBeGreaterThanOrEqual(4);
  });
});
