import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TrustScoreDashboard from "../TrustScoreDashboard";
import type { TrustScoreData } from "../TrustScoreDashboard";

describe("TrustScoreDashboard", () => {
  const mockData: TrustScoreData = {
    avgTrustScore: 78,
    riskComrades: 3,
    topComrades: [
      { id: 1, name: "Alice", trustScore: 95, trustBadge: "elite", tasksCompleted: 120 },
      { id: 2, name: "Bob", trustScore: 92, trustBadge: "trusted", tasksCompleted: 85 },
    ],
    lowestTrust: [
      { id: 3, name: "Charlie", trustScore: 45, trustBadge: "improving", tasksCompleted: 10 },
    ],
  };

  it("renders section title and average score", () => {
    render(<TrustScoreDashboard trustMetrics={mockData} />);
    expect(screen.getByText("Comrade Trust Scores")).toBeInTheDocument();
    expect(screen.getByText("78")).toBeInTheDocument();
  });

  it("shows risk comrades count", () => {
    render(<TrustScoreDashboard trustMetrics={mockData} />);
    expect(screen.getByText(/3 Risk Comrades/)).toBeInTheDocument();
  });

  it("renders top comrades list", () => {
    render(<TrustScoreDashboard trustMetrics={mockData} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("renders lowest trust list", () => {
    render(<TrustScoreDashboard trustMetrics={mockData} />);
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });

  it("does not render risk banner when no risk comrades", () => {
    const noRisk = { ...mockData, riskComrades: 0 };
    render(<TrustScoreDashboard trustMetrics={noRisk} />);
    expect(screen.queryByText(/Risk Comrades/)).not.toBeInTheDocument();
  });

  it("handles null data gracefully", () => {
    render(<TrustScoreDashboard trustMetrics={{}} />);
    expect(screen.getByText("Comrade Trust Scores")).toBeInTheDocument();
  });

  it("renders empty top and lowest lists without error", () => {
    render(<TrustScoreDashboard trustMetrics={{
      avgTrustScore: 75,
      riskComrades: 0,
      topComrades: [],
      lowestTrust: [],
    }} />);
    expect(screen.getByText("75")).toBeInTheDocument();
    expect(screen.getByText("Top Comrades")).toBeInTheDocument();
    expect(screen.getByText("Lowest Trust")).toBeInTheDocument();
    expect(screen.queryByText(/Risk Comrades/)).not.toBeInTheDocument();
  });

  it("renders multiple trust badge variants", () => {
    const badges: TrustScoreData = {
      avgTrustScore: 85,
      riskComrades: 1,
      topComrades: [
        { id: 1, name: "Elite One", trustScore: 98, trustBadge: "elite", tasksCompleted: 200 },
        { id: 2, name: "Trusted One", trustScore: 90, trustBadge: "trusted", tasksCompleted: 150 },
      ],
      lowestTrust: [
        { id: 3, name: "Risky", trustScore: 55, tasksCompleted: 5 },
      ],
    };
    render(<TrustScoreDashboard trustMetrics={badges} />);
    expect(screen.getByText("Elite One")).toBeInTheDocument();
    expect(screen.getByText("Trusted One")).toBeInTheDocument();
    expect(screen.getByText("Risky")).toBeInTheDocument();
    expect(screen.getByText("98")).toBeInTheDocument();
    expect(screen.getByText("90")).toBeInTheDocument();
    expect(screen.getByText("55")).toBeInTheDocument();
  });
});
