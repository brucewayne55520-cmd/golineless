import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryIcon, CATEGORY_KEYS } from "../CategoryIcon";

describe("CategoryIcon", () => {
  it("renders hospital icon for 'hospital' category", () => {
    const { container } = render(<CategoryIcon category="hospital" />);
    // HeartPulse icon renders an svg
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders government office icon for 'govt_office' category", () => {
    const { container } = render(<CategoryIcon category="govt_office" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders bank icon for 'bank' category", () => {
    const { container } = render(<CategoryIcon category="bank" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders document icon for 'document' category", () => {
    const { container } = render(<CategoryIcon category="document" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders medicine icon for 'medicine' category", () => {
    const { container } = render(<CategoryIcon category="medicine" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders senior care icon for 'senior_care' category", () => {
    const { container } = render(<CategoryIcon category="senior_care" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders errand icon for 'errand' category", () => {
    const { container } = render(<CategoryIcon category="errand" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders emergency icon for 'emergency' category", () => {
    const { container } = render(<CategoryIcon category="emergency" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("falls back to Package icon for unknown categories", () => {
    const { container } = render(<CategoryIcon category="unknown_category" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("applies the default size of 20", () => {
    const { container } = render(<CategoryIcon category="hospital" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "20");
    expect(svg).toHaveAttribute("height", "20");
  });

  it("renders with custom size", () => {
    const { container } = render(<CategoryIcon category="bank" size={32} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "32");
    expect(svg).toHaveAttribute("height", "32");
  });

  it("applies custom className", () => {
    const { container } = render(<CategoryIcon category="document" className="text-blue-500" />);
    const svg = container.querySelector("svg");
    const cls = svg?.getAttribute("class");
    expect(cls).toContain("text-blue-500");
  });

  it("renders with both custom size and className", () => {
    const { container } = render(<CategoryIcon category="emergency" size={28} className="text-red-500 mr-2" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "28");
    const cls = svg?.getAttribute("class");
    expect(cls).toContain("text-red-500");
    expect(cls).toContain("mr-2");
  });

  it("renders distinct icons for different categories", () => {
    // Render two icons and verify they produce distinct SVG paths
    const { container: c1 } = render(<CategoryIcon category="bank" />);
    const { container: c2 } = render(<CategoryIcon category="emergency" />);
    const svg1 = c1.querySelector("svg");
    const svg2 = c2.querySelector("svg");
    // Different icons have different inner SVG content
    expect(svg1?.innerHTML).not.toBe(svg2?.innerHTML);
  });

  it("falls back to same Package icon for multiple unknown categories", () => {
    const { container: c1 } = render(<CategoryIcon category="xyz" />);
    const { container: c2 } = render(<CategoryIcon category="abc" />);
    const svg1 = c1.querySelector("svg");
    const svg2 = c2.querySelector("svg");
    expect(svg1?.innerHTML).toBe(svg2?.innerHTML);
  });
});

describe("CATEGORY_KEYS", () => {
  it("exports all known category keys", () => {
    expect(CATEGORY_KEYS).toContain("hospital");
    expect(CATEGORY_KEYS).toContain("govt_office");
    expect(CATEGORY_KEYS).toContain("bank");
    expect(CATEGORY_KEYS).toContain("document");
    expect(CATEGORY_KEYS).toContain("medicine");
    expect(CATEGORY_KEYS).toContain("senior_care");
    expect(CATEGORY_KEYS).toContain("errand");
    expect(CATEGORY_KEYS).toContain("emergency");
  });

  it("exports exactly 8 category keys", () => {
    expect(CATEGORY_KEYS).toHaveLength(8);
  });

  it("exports keys matching the icon map order", () => {
    expect(CATEGORY_KEYS[0]).toBe("hospital");
    expect(CATEGORY_KEYS[1]).toBe("govt_office");
    expect(CATEGORY_KEYS[2]).toBe("bank");
    expect(CATEGORY_KEYS[6]).toBe("errand");
    expect(CATEGORY_KEYS[7]).toBe("emergency");
  });
});
