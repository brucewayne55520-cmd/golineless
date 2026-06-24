import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CountUp from "../CountUp";

describe("CountUp", () => {
  it("renders the value with locale formatting", () => {
    render(<CountUp value={50000} />);
    expect(screen.getByText("50,000")).toBeInTheDocument();
  });

  it("renders with prefix", () => {
    render(<CountUp value={42} prefix="₹" />);
    expect(screen.getByText("₹42")).toBeInTheDocument();
  });

  it("falls back to 0 when value is 0", () => {
    render(<CountUp value={0} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
