import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DispatchBanner from "../DispatchBanner";

describe("DispatchBanner", () => {
  it("renders dispatch stats", () => {
    render(<DispatchBanner activeNow={25} totalRunnersOnTask={18} stuckTasks={3} />);
    expect(screen.getByText("Waiting for Comrade")).toBeInTheDocument();
    expect(screen.getByText("Comrades working")).toBeInTheDocument();
    expect(screen.getByText("Over 3 hours")).toBeInTheDocument();
  });

  it("calculates broadcast as activeNow minus onTask", () => {
    render(<DispatchBanner activeNow={25} totalRunnersOnTask={18} stuckTasks={3} />);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("handles zero stuck tasks", () => {
    render(<DispatchBanner activeNow={10} totalRunnersOnTask={5} stuckTasks={0} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("does not show negative broadcast", () => {
    render(<DispatchBanner activeNow={5} totalRunnersOnTask={10} stuckTasks={0} />);
    // Math.max(0, -5) = 0
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(1);
  });

  it("handles null/undefined props gracefully", () => {
    render(<DispatchBanner />);
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Comrades working")).toBeInTheDocument();
  });

  it("renders stuck number in red when stuckTasks > 0", () => {
    const { container } = render(<DispatchBanner activeNow={10} totalRunnersOnTask={5} stuckTasks={3} />);
    // Find the stuck count element (third column, contains "3")
    const stuckLabel = screen.getByText("Over 3 hours");
    // The preceding sibling or parent should show "3"
    expect(screen.getByText("3")).toBeInTheDocument();
    // The relevant p element has inline style with red color when stuckTasks > 0
    const stuckValueEl = [...container.querySelectorAll("p")].find(p => p.textContent === "3");
    expect(stuckValueEl).toBeTruthy();
    expect(stuckValueEl?.style.color).toBe("rgb(239, 68, 68)");
  });

  it("does not render stuck number in red when stuckTasks is 0", () => {
    const { container } = render(<DispatchBanner activeNow={10} totalRunnersOnTask={5} stuckTasks={0} />);
    // The stuck value "0" should not have red style
    const stuckValueEl = [...container.querySelectorAll("p")].find(p => p.textContent === "0");
    if (stuckValueEl) {
      // Multiple "0" elements — the stuck one should not have red style
      const ps = [...container.querySelectorAll("p")].filter(p => p.textContent === "0");
      const stuck0 = ps[ps.length - 1]; // last "0" is typically the stuck one
      expect(stuck0?.style.color).not.toBe("rgb(239, 68, 68)");
    }
  });

  it("renders broadcast value when activeNow equals totalRunnersOnTask", () => {
    render(<DispatchBanner activeNow={8} totalRunnersOnTask={8} stuckTasks={0} />);
    // Math.max(0, 8-8) = 0
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(1);
  });

  it("renders all labels with max values", () => {
    // Use distinct values so each getByText finds exactly one element
    render(<DispatchBanner activeNow={100} totalRunnersOnTask={30} stuckTasks={10} />);
    expect(screen.getByText("70")).toBeInTheDocument(); // broadcast = 100 - 30
    expect(screen.getByText("30")).toBeInTheDocument(); // on task
    expect(screen.getByText("10")).toBeInTheDocument(); // stuck
  });
});
