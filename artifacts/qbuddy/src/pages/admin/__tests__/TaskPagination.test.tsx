import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TaskPagination from "../TaskPagination";

describe("TaskPagination", () => {
  it("renders nothing when total is 0", () => {
    const { container } = render(
      <TaskPagination page={0} limit={20} total={0} onPrev={vi.fn()} onNext={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows correct range for first page", () => {
    render(<TaskPagination page={0} limit={20} total={50} onPrev={vi.fn()} onNext={vi.fn()} />);
    expect(screen.getByText("Showing 1–20 of 50")).toBeInTheDocument();
  });

  it("shows correct range for second page", () => {
    render(<TaskPagination page={1} limit={20} total={50} onPrev={vi.fn()} onNext={vi.fn()} />);
    expect(screen.getByText("Showing 21–40 of 50")).toBeInTheDocument();
  });

  it("shows correct range for last partial page", () => {
    render(<TaskPagination page={2} limit={20} total={50} onPrev={vi.fn()} onNext={vi.fn()} />);
    expect(screen.getByText("Showing 41–50 of 50")).toBeInTheDocument();
  });

  it("disables prev button on first page", () => {
    render(<TaskPagination page={0} limit={20} total={50} onPrev={vi.fn()} onNext={vi.fn()} />);
    expect(screen.getByText("← Prev")).toBeDisabled();
  });

  it("disables next button on last page", () => {
    render(<TaskPagination page={2} limit={20} total={50} onPrev={vi.fn()} onNext={vi.fn()} />);
    expect(screen.getByText("Next →")).toBeDisabled();
  });

  it("enables both buttons on middle page", () => {
    render(<TaskPagination page={1} limit={20} total={50} onPrev={vi.fn()} onNext={vi.fn()} />);
    expect(screen.getByText("← Prev")).not.toBeDisabled();
    expect(screen.getByText("Next →")).not.toBeDisabled();
  });

  it("calls onPrev when prev button clicked", () => {
    const onPrev = vi.fn();
    render(<TaskPagination page={1} limit={20} total={50} onPrev={onPrev} onNext={vi.fn()} />);
    fireEvent.click(screen.getByText("← Prev"));
    expect(onPrev).toHaveBeenCalledOnce();
  });

  it("calls onNext when next button clicked", () => {
    const onNext = vi.fn();
    render(<TaskPagination page={0} limit={20} total={50} onNext={onNext} onPrev={vi.fn()} />);
    fireEvent.click(screen.getByText("Next →"));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("handles single page (total <= limit)", () => {
    render(<TaskPagination page={0} limit={20} total={15} onPrev={vi.fn()} onNext={vi.fn()} />);
    expect(screen.getByText("Showing 1–15 of 15")).toBeInTheDocument();
    expect(screen.getByText("← Prev")).toBeDisabled();
    expect(screen.getByText("Next →")).toBeDisabled();
  });
});
