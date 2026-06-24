import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TaskFilters from "../TaskFilters";

const OPTIONS = ["", "pending", "completed", "cancelled"];

describe("TaskFilters", () => {
  it("renders all filter buttons with labels", () => {
    const onSelect = vi.fn();
    render(<TaskFilters options={OPTIONS} selected="" onSelect={onSelect} />);
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });

  it("highlights the selected filter", () => {
    const onSelect = vi.fn();
    render(<TaskFilters options={OPTIONS} selected="completed" onSelect={onSelect} />);
    const completedBtn = screen.getByText("Completed").closest("button");
    expect(completedBtn?.className).toContain("bg-[#6C3FD4] text-white");
    const pendingBtn = screen.getByText("Pending").closest("button");
    expect(pendingBtn?.className).toContain("bg-white");
  });

  it("calls onSelect with the option value on click", () => {
    const onSelect = vi.fn();
    render(<TaskFilters options={OPTIONS} selected="" onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Completed"));
    expect(onSelect).toHaveBeenCalledWith("completed");
  });

  it("shows raw value when STATUS_LABELS has no mapping", () => {
    const onSelect = vi.fn();
    render(<TaskFilters options={["", "unknown_status"]} selected="" onSelect={onSelect} />);
    expect(screen.getByText("unknown_status")).toBeInTheDocument();
  });

  it("calls onSelect for empty string option (All)", () => {
    const onSelect = vi.fn();
    render(<TaskFilters options={OPTIONS} selected="pending" onSelect={onSelect} />);
    fireEvent.click(screen.getByText("All"));
    expect(onSelect).toHaveBeenCalledWith("");
  });
});
