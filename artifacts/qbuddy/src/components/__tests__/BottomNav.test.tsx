import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserBottomNav, RunnerBottomNav } from "../BottomNav";

const mockNavigate = vi.fn();
let mockLocation = "/app/home";

vi.mock("wouter", () => ({
  useLocation: () => [mockLocation, mockNavigate],
}));

describe("UserBottomNav", () => {
  beforeEach(() => {
    mockLocation = "/app/home";
    mockNavigate.mockClear();
  });

  it("renders all user navigation items", () => {
    render(<UserBottomNav />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Senior")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("highlights Home as active when at /app/home", () => {
    mockLocation = "/app/home";
    render(<UserBottomNav />);
    const homeBtn = screen.getByText("Home").closest("button");
    // Active item should have NAVY color style
    expect(homeBtn?.getAttribute("style")).toContain("rgb(15, 37, 87)");
  });

  it("marks non-active items as gray", () => {
    mockLocation = "/app/home";
    render(<UserBottomNav />);
    const tasksBtn = screen.getByText("Tasks").closest("button");
    expect(tasksBtn?.className).toContain("text-gray-400");
  });

  it("navigates when a nav item is clicked", () => {
    render(<UserBottomNav />);
    fireEvent.click(screen.getByText("Senior"));
    expect(mockNavigate).toHaveBeenCalledWith("/app/senior");
  });

  it("switches active state when location changes", () => {
    mockLocation = "/app/tasks";
    render(<UserBottomNav />);
    const tasksBtn = screen.getByText("Tasks").closest("button");
    expect(tasksBtn?.getAttribute("style")).toContain("rgb(15, 37, 87)");
    const homeBtn = screen.getByText("Home").closest("button");
    expect(homeBtn?.className).toContain("text-gray-400");
  });

  it("renders gold top indicator on active item", () => {
    mockLocation = "/app/home";
    render(<UserBottomNav />);
    const homeBtn = screen.getByText("Home").closest("button");
    const indicator = homeBtn?.querySelector('[style*="background: rgb(201, 168, 76)"]');
    expect(indicator).toBeInTheDocument();
  });
});

describe("RunnerBottomNav", () => {
  beforeEach(() => {
    mockLocation = "/runner/feed";
    mockNavigate.mockClear();
  });

  it("renders all runner navigation items", () => {
    render(<RunnerBottomNav />);
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Earnings")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("highlights Tasks as active when at /runner/feed", () => {
    mockLocation = "/runner/feed";
    render(<RunnerBottomNav />);
    const tasksBtn = screen.getByText("Tasks").closest("button");
    // Active item should have GOLD color style
    expect(tasksBtn?.getAttribute("style")).toContain("rgb(201, 168, 76)");
  });

  it("marks non-active items as semi-transparent", () => {
    mockLocation = "/runner/feed";
    render(<RunnerBottomNav />);
    const activeBtn = screen.getByText("Earnings").closest("button");
    expect(activeBtn?.className).toContain("text-white/40");
  });

  it("navigates when a nav item is clicked", () => {
    render(<RunnerBottomNav />);
    fireEvent.click(screen.getByText("Active"));
    expect(mockNavigate).toHaveBeenCalledWith("/runner/active");
  });

  it("switches active state when location changes", () => {
    mockLocation = "/runner/profile";
    render(<RunnerBottomNav />);
    const profileBtn = screen.getByText("Profile").closest("button");
    expect(profileBtn?.getAttribute("style")).toContain("rgb(201, 168, 76)");
    const tasksBtn = screen.getByText("Tasks").closest("button");
    expect(tasksBtn?.className).toContain("text-white/40");
  });

  it("uses dark background style", () => {
    render(<RunnerBottomNav />);
    const nav = screen.getByText("Tasks").closest("nav");
    expect(nav?.className).toContain("backdrop-blur-xl");
  });
});
