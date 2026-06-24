import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SLAWidget from "../SLAWidget";

import { useGetSlaMonitoring, type SlaData } from "@workspace/api-client-react";

vi.mock("@workspace/api-client-react", () => ({
  useGetSlaMonitoring: vi.fn(),
}));

type SlaMock = { data: SlaData | null };

describe("SLAWidget", () => {
  beforeEach(() => {
    const slaData: SlaData = {
      gradeDist: { excellent: 45, good: 120, average: 28, poor: 7 },
      avgAcceptanceTime: 95,
      avgCompletionTime: 28,
    };
    vi.mocked(useGetSlaMonitoring).mockReturnValue({ data: slaData } as SlaMock);
  });

  it("renders section title", () => {
    render(<SLAWidget />);
    expect(screen.getByText("SLA Monitoring")).toBeInTheDocument();
  });

  it("displays grade distribution counts", () => {
    render(<SLAWidget />);
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    // 28 appears for both average grade count and avg completion time
    const twentys = screen.getAllByText("28");
    expect(twentys.length).toBeGreaterThanOrEqual(2);
  });

  it("displays grade labels", () => {
    render(<SLAWidget />);
    expect(screen.getByText("excellent")).toBeInTheDocument();
    expect(screen.getByText("good")).toBeInTheDocument();
    expect(screen.getByText("average")).toBeInTheDocument();
    expect(screen.getByText("poor")).toBeInTheDocument();
  });

  it("shows average acceptance time in minutes", () => {
    render(<SLAWidget />);
    // 95s = Math.round(95/60)=2m + 35s = "2m 35s"
    expect(screen.getByText(/2m/)).toBeInTheDocument();
  });

  it("shows average completion time", () => {
    render(<SLAWidget />);
    const twentys = screen.getAllByText("28");
    expect(twentys.length).toBeGreaterThanOrEqual(2);
  });

  it("shows total graded count", () => {
    render(<SLAWidget />);
    expect(screen.getByText(/200 tasks graded/)).toBeInTheDocument();
  });

  it("returns null when no data", () => {
    vi.mocked(useGetSlaMonitoring).mockReturnValueOnce({ data: null } as SlaMock);
    const { container } = render(<SLAWidget />);
    expect(container.innerHTML).toBe("");
  });

  it("renders grade bar with proportional widths", () => {
    const { container } = render(<SLAWidget />);
    // The 4 grade bar segments are motion.div children of the bar container
    const barContainer = container.querySelector('[class*="rounded-full overflow-hidden"]');
    expect(barContainer?.children.length).toBe(4);
  });

  it("renders avg acceptance time under 60s in seconds", () => {
    vi.mocked(useGetSlaMonitoring).mockReturnValueOnce({ data: {
      gradeDist: { excellent: 1, good: 1, average: 0, poor: 0 },
      avgAcceptanceTime: 45,
      avgCompletionTime: 10,
    } as SlaData } as SlaMock);
    render(<SLAWidget />);
    expect(screen.getByText("45s")).toBeInTheDocument();
  });

  it("renders avg acceptance time of 60s in seconds (not minutes)", () => {
    vi.mocked(useGetSlaMonitoring).mockReturnValueOnce({ data: {
      gradeDist: { excellent: 1, good: 1, average: 0, poor: 0 },
      avgAcceptanceTime: 60,
      avgCompletionTime: 10,
    } as SlaData } as SlaMock);
    render(<SLAWidget />);
    // 60 > 60 is false, so stays in seconds
    expect(screen.getByText("60s")).toBeInTheDocument();
  });

  it("renders avg acceptance time of 61s in minutes", () => {
    vi.mocked(useGetSlaMonitoring).mockReturnValueOnce({ data: {
      gradeDist: { excellent: 1, good: 1, average: 0, poor: 0 },
      avgAcceptanceTime: 61,
      avgCompletionTime: 10,
    } as SlaData } as SlaMock);
    render(<SLAWidget />);
    // Math.round(61/60) = 1, 61 % 60 = 1 → "1m 1s"
    expect(screen.getByText(/1m/)).toBeInTheDocument();
  });

  it("handles zero values for all grade distributions", () => {
    vi.mocked(useGetSlaMonitoring).mockReturnValueOnce({ data: {
      gradeDist: { excellent: 0, good: 0, average: 0, poor: 0 },
      avgAcceptanceTime: 30,
      avgCompletionTime: 15,
    } as SlaData } as SlaMock);
    const { container } = render(<SLAWidget />);
    // Should still render without dividing by zero
    expect(screen.getByText("SLA Monitoring")).toBeInTheDocument();
    expect(screen.getByText(/0 tasks graded/)).toBeInTheDocument();
  });
});
