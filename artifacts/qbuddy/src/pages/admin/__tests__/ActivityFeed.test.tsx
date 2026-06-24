import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ActivityFeed from "../ActivityFeed";
import type { ActivityItem } from "@workspace/api-client-react";

describe("ActivityFeed", () => {
  const mockActivities: ActivityItem[] = [
    {
      id: "a1",
      message: "Task #123 completed by Alice",
      createdAt: "2025-06-15T10:30:00Z",
    },
    {
      id: "a2",
      message: "New runner Bob registered",
      createdAt: "2025-06-15T10:25:00Z",
    },
  ];

  it("renders section title", () => {
    render(<ActivityFeed activities={mockActivities} />);
    expect(screen.getByText("Live Activity Feed")).toBeInTheDocument();
  });

  it("shows auto-refresh badge", () => {
    render(<ActivityFeed activities={mockActivities} />);
    expect(screen.getByText("Auto-refresh · 5s")).toBeInTheDocument();
  });

  it("renders activity messages", () => {
    render(<ActivityFeed activities={mockActivities} />);
    expect(screen.getByText("Task #123 completed by Alice")).toBeInTheDocument();
    expect(screen.getByText("New runner Bob registered")).toBeInTheDocument();
  });

  it("formats timestamps", () => {
    render(<ActivityFeed activities={mockActivities} />);
    // Timestamp rendered via toLocaleTimeString — check general time format (HH:MM:SS)
    const timeElements = screen.getAllByText(/\d{1,2}:\d{2}:\d{2}/);
    expect(timeElements.length).toBe(2);
  });

  it("shows empty state when no activities", () => {
    render(<ActivityFeed activities={[]} />);
    expect(screen.getByText("No recent activity")).toBeInTheDocument();
    expect(screen.getByText("Activity appears here in real time")).toBeInTheDocument();
  });
});
