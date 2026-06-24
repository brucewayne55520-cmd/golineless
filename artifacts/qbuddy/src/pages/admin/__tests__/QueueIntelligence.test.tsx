import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import QueueIntelligence from "../QueueIntelligence";

describe("QueueIntelligence", () => {
  const defaultProps = {
    activeQueues: 8,
    avgWaitTime: 15,
    longestQueue: 42,
    hospitalQueueTasks: 5,
    bankQueueTasks: 3,
    govtQueueTasks: 2,
  };

  it("renders all queue metrics", () => {
    render(<QueueIntelligence queueMetrics={defaultProps} />);
    expect(screen.getByText("Queue Intelligence")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders category labels", () => {
    render(<QueueIntelligence queueMetrics={defaultProps} />);
    expect(screen.getByText("Active Queues")).toBeInTheDocument();
    expect(screen.getByText("Avg Wait")).toBeInTheDocument();
    expect(screen.getByText("Longest Queue")).toBeInTheDocument();
  });

  it("renders hospital, bank, and government counts", () => {
    render(<QueueIntelligence queueMetrics={defaultProps} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("handles null values with defaults", () => {
    render(<QueueIntelligence queueMetrics={{}} />);
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(3);
  });

  it("renders zero values correctly", () => {
    render(<QueueIntelligence queueMetrics={{
      activeQueues: 0,
      avgWaitTime: 0,
      longestQueue: 0,
      hospitalQueueTasks: 0,
      bankQueueTasks: 0,
      govtQueueTasks: 0,
    }} />);
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(6);
  });

  it("renders single-digit values", () => {
    render(<QueueIntelligence queueMetrics={{
      activeQueues: 1,
      avgWaitTime: 2,
      longestQueue: 3,
      hospitalQueueTasks: 4,
      bankQueueTasks: 5,
      govtQueueTasks: 6,
    }} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("renders large numbers without overflow", () => {
    render(<QueueIntelligence queueMetrics={{
      activeQueues: 9999,
      avgWaitTime: 9999,
      longestQueue: 9999,
      hospitalQueueTasks: 9999,
      bankQueueTasks: 9999,
      govtQueueTasks: 9999,
    }} />);
    const fourNines = screen.getAllByText("9999");
    expect(fourNines.length).toBe(6);
  });
});
