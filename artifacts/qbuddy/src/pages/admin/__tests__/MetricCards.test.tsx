import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MetricCards from "../MetricCards";
import { ClipboardList, Zap } from "lucide-react";
import { DARK, BLUE, BLUE_50, SURFACE } from "@/lib/theme";

const mockCards = [
  { label: "Tasks Today", val: 150, Icon: ClipboardList, color: DARK, bg: BLUE_50, trend: "All time" },
  { label: "Active Now", val: 12, Icon: Zap, color: BLUE, bg: BLUE_50, trend: "Live" },
];

describe("MetricCards", () => {
  it("renders loading skeleton when isLoading is true", () => {
    const { container } = render(<MetricCards cards={[]} isLoading={true} />);
    // Loading state renders 4 skeleton divs in a grid
    const children = container.querySelector(".grid")?.children;
    expect(children?.length).toBe(4);
  });

  it("renders card labels and values", () => {
    render(<MetricCards cards={mockCards} />);
    expect(screen.getByText("Tasks Today")).toBeInTheDocument();
    expect(screen.getByText("Active Now")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("renders trend badges", () => {
    render(<MetricCards cards={mockCards} />);
    expect(screen.getByText("All time")).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("renders empty when cards array is empty and not loading", () => {
    const { container } = render(<MetricCards cards={[]} />);
    // Should render a grid container without children
    const grid = container.querySelector(".grid");
    expect(grid?.children.length).toBe(0);
  });

  it("handles cards with and without trend badges", () => {
    const mixed = [
      { label: "With Trend", val: 10, Icon: ClipboardList, color: DARK, bg: SURFACE, trend: "Up" },
      { label: "No Trend", val: 20, Icon: Zap, color: DARK, bg: SURFACE },
    ];
    render(<MetricCards cards={mixed} />);
    expect(screen.getByText("With Trend")).toBeInTheDocument();
    expect(screen.getByText("No Trend")).toBeInTheDocument();
    expect(screen.getByText("Up")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });
});
