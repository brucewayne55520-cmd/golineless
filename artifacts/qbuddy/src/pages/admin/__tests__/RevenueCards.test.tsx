import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RevenueCards from "../RevenueCards";
import { Wallet } from "lucide-react";

// Mock formatCurrency
vi.mock("@/lib/utils", () => ({
  formatCurrency: (v: number) => `₹${v?.toLocaleString("en-IN") ?? 0}`,
}));

const mockCards = [
  { label: "GMV Today", val: 50000, Icon: Wallet, color: "#0F2557" },
  { label: "Platform Revenue", val: 7500, Icon: Wallet, color: "#7C3AED" },
];

describe("RevenueCards", () => {
  it("renders all card labels", () => {
    render(<RevenueCards cards={mockCards} />);
    expect(screen.getByText("GMV Today")).toBeInTheDocument();
    expect(screen.getByText("Platform Revenue")).toBeInTheDocument();
  });

  it("displays formatted currency values", () => {
    render(<RevenueCards cards={mockCards} />);
    expect(screen.getByText("₹50,000")).toBeInTheDocument();
    expect(screen.getByText("₹7,500")).toBeInTheDocument();
  });
});
