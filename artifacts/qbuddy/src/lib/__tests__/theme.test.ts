import { describe, it, expect } from "vitest";
import * as theme from "@/lib/theme";

describe("Theme Tokens — Brand Core", () => {
  it("exports all BLUE tokens as valid hex colors", () => {
    expect(theme.BLUE).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.BLUE_LIGHT).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.BLUE_PALE).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.BLUE_DIM).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.BLUE_DEEP).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("exports all PURPLE tokens as valid hex colors", () => {
    expect(theme.PURPLE).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.PURPLE_LIGHT).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.PURPLE_DIM).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("exports all DARK tokens as valid hex colors", () => {
    expect(theme.DARK).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.DARK_MID).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.DARK_LIGHT).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.DARK_MUTED).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("exports all SURFACE tokens as valid hex colors", () => {
    expect(theme.SURFACE).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.SURFACE_COOL).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.SURFACE_DIM).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("exports all ACCENT tokens as valid hex colors", () => {
    expect(theme.TEAL).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.CORAL).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.AMBER).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.EMERALD).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("exports all SEMANTIC tokens as valid hex colors", () => {
    expect(theme.SUCCESS).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.WARNING).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.ERROR).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.INFO).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("no backward-compat aliases remain (NAVY, GOLD, ORANGE, CREAM, VIOLET)", () => {
    expect((theme as Record<string, unknown>).NAVY).toBeUndefined();
    expect((theme as Record<string, unknown>).GOLD).toBeUndefined();
    expect((theme as Record<string, unknown>).ORANGE).toBeUndefined();
    expect((theme as Record<string, unknown>).CREAM).toBeUndefined();
    expect((theme as Record<string, unknown>).VIOLET).toBeUndefined();
    expect((theme as Record<string, unknown>).NAVY_GRAD).toBeUndefined();
    expect((theme as Record<string, unknown>).GOLD_GRAD).toBeUndefined();
    expect((theme as Record<string, unknown>).SHADOW_ORANGE).toBeUndefined();
    expect((theme as Record<string, unknown>).SHADOW_GOLD).toBeUndefined();
  });
});

describe("Theme Tokens — Gradients (derived from core, no hardcoded hex duplication)", () => {
  it("DARK_GRAD uses DARK and DARK_MID", () => {
    expect(theme.DARK_GRAD).toContain(theme.DARK);
    expect(theme.DARK_GRAD).toContain(theme.DARK_MID);
    expect(theme.DARK_GRAD).toMatch(/^linear-gradient/);
  });

  it("DARK_DEEP_GRAD uses DARK", () => {
    expect(theme.DARK_DEEP_GRAD).toContain(theme.DARK);
  });

  it("BLUE_GRAD uses BLUE and BLUE_LIGHT", () => {
    expect(theme.BLUE_GRAD).toContain(theme.BLUE);
    expect(theme.BLUE_GRAD).toContain(theme.BLUE_LIGHT);
  });

  it("BLUE_RICH_GRAD uses BLUE_DIM, BLUE, and BLUE_LIGHT", () => {
    expect(theme.BLUE_RICH_GRAD).toContain(theme.BLUE_DIM);
    expect(theme.BLUE_RICH_GRAD).toContain(theme.BLUE);
    expect(theme.BLUE_RICH_GRAD).toContain(theme.BLUE_LIGHT);
  });

  it("PURPLE_GRAD uses PURPLE and PURPLE_LIGHT", () => {
    expect(theme.PURPLE_GRAD).toContain(theme.PURPLE);
    expect(theme.PURPLE_GRAD).toContain(theme.PURPLE_LIGHT);
  });

  it("TEAL_GRAD uses TEAL", () => {
    expect(theme.TEAL_GRAD).toContain(theme.TEAL);
  });

  it("CORAL_GRAD uses CORAL", () => {
    expect(theme.CORAL_GRAD).toContain(theme.CORAL);
  });

  it("SURFACE_GRAD uses SURFACE_COOL and SURFACE", () => {
    expect(theme.SURFACE_GRAD).toContain(theme.SURFACE_COOL);
    expect(theme.SURFACE_GRAD).toContain(theme.SURFACE);
  });
});

describe("Theme Tokens — Shadows (derived from core tokens via RGB)", () => {
  it("SHADOW_SM contains DARK RGB (15, 23, 42)", () => {
    expect(theme.SHADOW_SM).toContain("15, 23, 42");
  });

  it("SHADOW_MD contains DARK RGB", () => {
    expect(theme.SHADOW_MD).toContain("15, 23, 42");
  });

  it("SHADOW_LG contains DARK RGB", () => {
    expect(theme.SHADOW_LG).toContain("15, 23, 42");
  });

  it("SHADOW_XL contains DARK RGB", () => {
    expect(theme.SHADOW_XL).toContain("15, 23, 42");
  });

  it("SHADOW_BLUE contains BLUE RGB (59, 130, 246)", () => {
    expect(theme.SHADOW_BLUE).toContain("59, 130, 246");
  });

  it("SHADOW_TEAL contains TEAL RGB (14, 165, 233)", () => {
    expect(theme.SHADOW_TEAL).toContain("14, 165, 233");
  });

  it("INFO references TEAL token", () => {
    expect(theme.INFO).toBe(theme.TEAL);
  });
});

describe("Theme Tokens — Hex Constants (derived from core tokens)", () => {
  it("BLUE scale references core tokens where applicable", () => {
    expect(theme.BLUE_300).toBe(theme.BLUE_PALE);
    expect(theme.BLUE_400).toBe(theme.BLUE_LIGHT);
    expect(theme.BLUE_500).toBe(theme.BLUE);
    expect(theme.BLUE_600).toBe(theme.BLUE_DIM);
    expect(theme.BLUE_700).toBe(theme.BLUE_DEEP);
  });

  it("GRAY scale references core DARK tokens where applicable", () => {
    expect(theme.GRAY_50).toBe(theme.SURFACE_COOL);
    expect(theme.GRAY_100).toBe(theme.SURFACE_DIM);
    expect(theme.GRAY_600).toBe(theme.DARK_MUTED);
    expect(theme.GRAY_700).toBe(theme.DARK_LIGHT);
    expect(theme.GRAY_800).toBe(theme.DARK_MID);
    expect(theme.GRAY_900).toBe(theme.DARK);
  });

  it("all BLUE scale entries are valid hex", () => {
    for (const val of [theme.BLUE_50, theme.BLUE_100, theme.BLUE_200, theme.BLUE_800, theme.BLUE_900, theme.BLUE_950]) {
      expect(val).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("all GRAY scale entries are valid hex", () => {
    for (const val of [theme.GRAY_200, theme.GRAY_300, theme.GRAY_400, theme.GRAY_500]) {
      expect(val).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe("Theme Tokens — Consistency checks", () => {
  it("no hex value is duplicated across non-derived exports", () => {
    const coreHex = new Set([
      theme.BLUE, theme.BLUE_LIGHT, theme.BLUE_PALE, theme.BLUE_DIM, theme.BLUE_DEEP,
      theme.PURPLE, theme.PURPLE_LIGHT, theme.PURPLE_DIM,
      theme.DARK, theme.DARK_MID, theme.DARK_LIGHT, theme.DARK_MUTED,
      theme.SURFACE, theme.SURFACE_COOL, theme.SURFACE_DIM,
      theme.TEAL, theme.CORAL, theme.AMBER, theme.EMERALD,
      theme.SUCCESS, theme.WARNING, theme.ERROR,
    ]);
    // All values in the core set should be unique (22 core tokens)
    expect(coreHex.size).toBe(22);
  });

  it("all gradient exports are linear-gradient strings", () => {
    const gradients = [theme.DARK_GRAD, theme.DARK_DEEP_GRAD, theme.BLUE_GRAD, theme.BLUE_RICH_GRAD, theme.PURPLE_GRAD, theme.TEAL_GRAD, theme.CORAL_GRAD, theme.SURFACE_GRAD];
    for (const g of gradients) {
      expect(g).toMatch(/^linear-gradient/);
    }
  });

  it("all shadow exports contain rgba()", () => {
    const shadows = [theme.SHADOW_SM, theme.SHADOW_MD, theme.SHADOW_LG, theme.SHADOW_XL, theme.SHADOW_BLUE, theme.SHADOW_TEAL];
    for (const s of shadows) {
      expect(s).toContain("rgba(");
    }
  });
});
