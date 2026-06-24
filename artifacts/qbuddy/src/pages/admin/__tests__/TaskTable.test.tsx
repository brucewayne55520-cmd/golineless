import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TaskTable from "../TaskTable";
import type { Task } from "@workspace/api-client-react";

vi.mock("@/lib/utils", () => ({
  CATEGORY_NAMES: { delivery: "Delivery", shopping: "Shopping" },
  STATUS_COLORS: { pending: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  STATUS_LABELS: { pending: "Pending", completed: "Completed" },
  formatCurrency: (v: number) => `₹${v ?? 0}`,
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

const mockTask: Record<string, unknown> = {
  id: 101,
  category: "delivery",
  status: "pending",
  price: 500,
  runnerEarning: 400,
  platformFee: 50,
  paymentMethod: "cash",
  createdAt: "2025-06-15T10:00:00Z",
  locationArea: "SG Highway",
  locationName: "Clinic",
  user: { name: "Alice", phone: "9876543210" },
  runner: { name: "Bob" },
  internalNotes: "",
};

describe("TaskTable", () => {
  it("renders loading skeleton when isLoading is true", () => {
    const { container } = render(<TaskTable tasks={[]} isLoading={true} onSelect={vi.fn()} />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(5);
  });

  it("shows empty state when no tasks", () => {
    render(<TaskTable tasks={[]} isLoading={false} onSelect={vi.fn()} />);
    expect(screen.getByText("No tasks found")).toBeInTheDocument();
  });

  it("renders task rows with data", () => {
    render(<TaskTable tasks={[mockTask]} isLoading={false} onSelect={vi.fn()} />);
    expect(screen.getByText("#101")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Delivery")).toBeInTheDocument();
    expect(screen.getByText("SG Highway")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("₹500")).toBeInTheDocument();
  });

  it("renders status badge with correct text", () => {
    render(<TaskTable tasks={[mockTask]} isLoading={false} onSelect={vi.fn()} />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders date formatted in en-IN locale", () => {
    render(<TaskTable tasks={[mockTask]} isLoading={false} onSelect={vi.fn()} />);
    // June 15, 2025 in en-IN format
    expect(screen.getByText("15/6/2025")).toBeInTheDocument();
  });

  it("renders Edit button in action column", () => {
    render(<TaskTable tasks={[mockTask]} isLoading={false} onSelect={vi.fn()} />);
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("calls onSelect when a row is clicked", () => {
    const onSelect = vi.fn();
    render(<TaskTable tasks={[mockTask]} isLoading={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("#101"));
    expect(onSelect).toHaveBeenCalledWith(mockTask);
  });

  it("renders all table headers", () => {
    render(<TaskTable tasks={[]} isLoading={false} onSelect={vi.fn()} />);
    const headers = ["#", "User", "Category", "Location", "Runner", "Price", "Status", "Date", "Action"];
    headers.forEach(h => {
      expect(screen.getByText(h)).toBeInTheDocument();
    });
  });

  it("handles missing user/runner info gracefully", () => {
    const minimalTask = { ...mockTask, user: null, runner: null };
    render(<TaskTable tasks={[minimalTask]} isLoading={false} onSelect={vi.fn()} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("uses raw category when CATEGORY_NAMES has no mapping", () => {
    const unknownCatTask = { ...mockTask, category: "unknown_cat" };
    render(<TaskTable tasks={[unknownCatTask]} isLoading={false} onSelect={vi.fn()} />);
    expect(screen.getByText("unknown_cat")).toBeInTheDocument();
  });
});
