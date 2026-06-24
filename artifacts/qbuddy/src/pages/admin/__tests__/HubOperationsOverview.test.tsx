import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HubOperationsOverview from "../HubOperationsOverview";

describe("HubOperationsOverview", () => {
  const mockHubStats = {
    healthcare: { active: 5, pending: 3, completed: 45, total: 53 },
    banking: { active: 2, pending: 1, completed: 28, total: 31 },
    senior: { active: 4, pending: 0, completed: 62, total: 66 },
  };

  it("renders section title", () => {
    render(<HubOperationsOverview hubStats={mockHubStats} />);
    expect(screen.getByText("Service Hub Overview")).toBeInTheDocument();
  });

  it("renders hub labels", () => {
    render(<HubOperationsOverview hubStats={mockHubStats} />);
    expect(screen.getByText("Healthcare")).toBeInTheDocument();
    expect(screen.getByText("Banking")).toBeInTheDocument();
    expect(screen.getByText("Senior Care")).toBeInTheDocument();
  });

  it("displays hub stats", () => {
    render(<HubOperationsOverview hubStats={mockHubStats} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("53")).toBeInTheDocument();
    expect(screen.getByText("66")).toBeInTheDocument();
  });

  it("renders unknown hub keys with fallback label", () => {
    render(<HubOperationsOverview hubStats={{ custom_hub: { active: 1, total: 5 } }} />);
    expect(screen.getByText("custom_hub")).toBeInTheDocument();
  });

  it("handles empty hubStats", () => {
    render(<HubOperationsOverview hubStats={{}} />);
    expect(screen.getByText("Service Hub Overview")).toBeInTheDocument();
  });
});
