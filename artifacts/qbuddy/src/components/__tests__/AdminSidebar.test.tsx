import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AdminSidebar from "../AdminSidebar";

const mockNavigate = vi.fn();
let mockLocation = "/admin";

vi.mock("wouter", () => ({
  useLocation: () => [mockLocation, mockNavigate],
}));

describe("AdminSidebar", () => {
  beforeEach(() => {
    mockLocation = "/admin";
    mockNavigate.mockClear();
    localStorage.clear();
  });

  it("renders Admin Panel branding", () => {
    render(<AdminSidebar />);
    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
  });

  it("renders the logo image", () => {
    render(<AdminSidebar />);
    const logo = screen.getByAltText("Go LineLess");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", "/logo.jpg");
  });

  it("renders all navigation links", () => {
    render(<AdminSidebar />);
    const links = [
      "Dashboard", "Pilot Center", "Ops Center", "Leaderboard", "Areas",
      "Founder", "Incidents Ops", "Live Map", "Tasks", "Runners",
      "Recruitment", "Training", "Quality", "Support", "Incidents",
      "Heatmap", "Users", "Subscriptions", "Analytics", "Settings",
    ];
    links.forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it("renders logout button", () => {
    render(<AdminSidebar />);
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });

  it("highlights Dashboard as active when at /admin", () => {
    mockLocation = "/admin";
    render(<AdminSidebar />);
    // Dashboard button should have active styling (white text)
    const dashboardBtn = screen.getByText("Dashboard").closest("button");
    expect(dashboardBtn?.className).toContain("text-white");
  });

  it("highlights Subscriptions as active when at /admin/subscriptions", () => {
    mockLocation = "/admin/subscriptions";
    render(<AdminSidebar />);
    const subsBtn = screen.getByText("Subscriptions").closest("button");
    expect(subsBtn?.className).toContain("text-white");
    // Dashboard should NOT be active at this path
    const dashBtn = screen.getByText("Dashboard").closest("button");
    expect(dashBtn?.className).toContain("text-white/60");
  });

  it("navigates when a nav item is clicked", () => {
    render(<AdminSidebar />);
    fireEvent.click(screen.getByText("Runners"));
    expect(mockNavigate).toHaveBeenCalledWith("/admin/runners");
  });

  it("navigates with exact match for Dashboard", () => {
    render(<AdminSidebar />);
    fireEvent.click(screen.getByText("Dashboard"));
    expect(mockNavigate).toHaveBeenCalledWith("/admin");
  });

  it("clears token and navigates to login on logout", () => {
    localStorage.setItem("golineless_admin_token", "some-token");
    render(<AdminSidebar />);
    fireEvent.click(screen.getByText("Logout"));
    expect(localStorage.getItem("golineless_admin_token")).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith("/admin/login");
  });

  it("shows gold indicator on active nav item", () => {
    mockLocation = "/admin/tasks";
    render(<AdminSidebar />);
    const tasksBtn = screen.getByText("Tasks").closest("button");
    // Active item should have a gold indicator div
    const indicator = tasksBtn?.querySelector('[style*="background: rgb(201, 168, 76)"]');
    expect(indicator).toBeInTheDocument();
  });

  it("marks Dashboard inactive for sub-paths (exact match only)", () => {
    mockLocation = "/admin/tasks";
    render(<AdminSidebar />);
    const dashBtn = screen.getByText("Dashboard").closest("button");
    expect(dashBtn?.className).toContain("text-white/60");
  });

  it("uses startsWith for non-exact nav items", () => {
    mockLocation = "/admin/tasks/123";
    render(<AdminSidebar />);
    const tasksBtn = screen.getByText("Tasks").closest("button");
    expect(tasksBtn?.className).toContain("text-white");
  });
});
