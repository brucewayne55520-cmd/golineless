import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TaskSlideOver from "../TaskSlideOver";
import type { Task } from "@workspace/api-client-react";

vi.mock("@/lib/utils", () => ({
  CATEGORY_NAMES: { delivery: "Delivery", shopping: "Shopping" },
  STATUS_LABELS: { pending: "Pending", completed: "Completed", cancelled: "Cancelled" },
  formatCurrency: (v: number) => `₹${v ?? 0}`,
}));

const mockTask: Record<string, unknown> = {
  id: 101,
  category: "delivery",
  status: "pending",
  price: 500,
  runnerEarning: 400,
  platformFee: 50,
  paymentMethod: "cash",
  locationArea: "SG Highway",
  locationName: "Clinic",
  user: { name: "Alice", phone: "9876543210" },
  runner: { name: "Bob" },
  internalNotes: "Check ID",
};

const OPTIONS = ["", "pending", "completed", "cancelled"];

const defaultProps = {
  task: mockTask,
  newStatus: "pending",
  notes: "Check ID",
  options: OPTIONS,
  isSaving: false,
  onStatusChange: vi.fn(),
  onNotesChange: vi.fn(),
  onSave: vi.fn(),
  onClose: vi.fn(),
};

describe("TaskSlideOver", () => {
  it("renders nothing when task is null", () => {
    const { container } = render(<TaskSlideOver {...defaultProps} task={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders task title", () => {
    render(<TaskSlideOver {...defaultProps} />);
    expect(screen.getByText("Task #101")).toBeInTheDocument();
  });

  it("renders status select with options", () => {
    render(<TaskSlideOver {...defaultProps} />);
    const select = screen.getByDisplayValue("Pending");
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe("SELECT");
  });

  it("renders internal notes textarea", () => {
    render(<TaskSlideOver {...defaultProps} />);
    const textarea = screen.getByDisplayValue("Check ID");
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("renders task detail fields", () => {
    render(<TaskSlideOver {...defaultProps} />);
    expect(screen.getByText("Delivery")).toBeInTheDocument();
    expect(screen.getByText("₹500")).toBeInTheDocument();
    expect(screen.getByText("₹400")).toBeInTheDocument();
    expect(screen.getByText("₹50")).toBeInTheDocument();
    expect(screen.getByText("cash")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows 'Not assigned' when no runner", () => {
    const noRunner = { ...mockTask, runner: null };
    render(<TaskSlideOver {...defaultProps} task={noRunner} />);
    expect(screen.getByText("Not assigned")).toBeInTheDocument();
  });

  it("calls onClose when backdrop clicked", () => {
    const onClose = vi.fn();
    render(<TaskSlideOver {...defaultProps} onClose={onClose} />);
    const backdrop = document.querySelector(".fixed.inset-0");
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();
    render(<TaskSlideOver {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onSave when save button clicked", () => {
    const onSave = vi.fn();
    render(<TaskSlideOver {...defaultProps} onSave={onSave} />);
    fireEvent.click(screen.getByText("Save Changes"));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("shows saving state when isSaving is true", () => {
    render(<TaskSlideOver {...defaultProps} isSaving={true} />);
    expect(screen.getByText("Saving...")).toBeInTheDocument();
    expect(screen.queryByText("Save Changes")).not.toBeInTheDocument();
  });

  it("calls onStatusChange when status select changes", () => {
    const onStatusChange = vi.fn();
    render(<TaskSlideOver {...defaultProps} onStatusChange={onStatusChange} />);
    const select = screen.getByDisplayValue("Pending");
    fireEvent.change(select, { target: { value: "completed" } });
    expect(onStatusChange).toHaveBeenCalledWith("completed");
  });

  it("calls onNotesChange when notes textarea changes", () => {
    const onNotesChange = vi.fn();
    render(<TaskSlideOver {...defaultProps} onNotesChange={onNotesChange} />);
    const textarea = screen.getByDisplayValue("Check ID");
    fireEvent.change(textarea, { target: { value: "New note" } });
    expect(onNotesChange).toHaveBeenCalledWith("New note");
  });
});
