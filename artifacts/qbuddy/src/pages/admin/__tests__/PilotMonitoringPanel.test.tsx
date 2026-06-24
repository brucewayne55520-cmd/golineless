import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PilotMonitoringPanel from "../PilotMonitoringPanel";

describe("PilotMonitoringPanel", () => {
  const defaultProps = {
    successRate: 94,
    acceptanceRate: 87,
    completionRate: 82,
    cancellationRate: 6,
    avgWaitTimeAll: 12,
    totalTasks: 1450,
    activeTasks: 23,
    pendingTasks: 8,
    completedTasks: 1189,
    cancelledTasks: 87,
    uniqueUsers: 320,
    uniqueComrades: 45,
  };

  it("renders monitoring title", () => {
    render(<PilotMonitoringPanel monitoring={defaultProps} />);
    expect(screen.getByText("Pilot Monitoring")).toBeInTheDocument();
  });

  it("displays rate percentages", () => {
    render(<PilotMonitoringPanel monitoring={defaultProps} />);
    expect(screen.getByText("94%")).toBeInTheDocument();
    expect(screen.getByText("87%")).toBeInTheDocument();
    expect(screen.getByText("82%")).toBeInTheDocument();
    expect(screen.getByText("6%")).toBeInTheDocument();
  });

  it("displays average wait time", () => {
    render(<PilotMonitoringPanel monitoring={defaultProps} />);
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("renders summary stats footer", () => {
    render(<PilotMonitoringPanel monitoring={defaultProps} />);
    expect(screen.getByText(/1450 total tasks/)).toBeInTheDocument();
    expect(screen.getByText(/1189 completed/)).toBeInTheDocument();
    expect(screen.getByText(/320 unique users/)).toBeInTheDocument();
    expect(screen.getByText(/45 unique comrades/)).toBeInTheDocument();
  });

  it("handles null values without crashing", () => {
    const { container } = render(<PilotMonitoringPanel monitoring={{}} />);
    expect(container.querySelector(".grid")).toBeInTheDocument();
  });
});
