/**
 * Go LineLess Design Tokens — Harvest Orange
 *
 * Single source of truth for all brand colors and gradients.
 * Import these instead of redefining colors in every page.
 *
 * Color Palette: Harvest Orange
 * 50:  #fff2e5 | 100: #ffe5cc | 200: #ffca99 | 300: #ffb066
 * 400: #ff9633 | 500: #ff7b00 | 600: #cc6300 | 700: #994a00
 * 800: #663100 | 900: #331900 | 950: #241100
 */

// ═══════════════════════════════════════════════════════════
// BRAND CORE — Harvest Orange
// ═══════════════════════════════════════════════════════════
export const ORANGE = "#ff7b00";
export const ORANGE_LIGHT = "#ff9633";
export const ORANGE_PALE = "#ffb066";
export const ORANGE_DIM = "#cc6300";
export const ORANGE_DEEP = "#994a00";

// ═══════════════════════════════════════════════════════════
// DARK — Rich dark brown (replaces Navy)
// ═══════════════════════════════════════════════════════════
export const DARK = "#241100";
export const DARK_MID = "#331900";
export const DARK_LIGHT = "#663100";
export const DARK_MUTED = "#994a00";

// ═══════════════════════════════════════════════════════════
// LIGHT — Warm cream backgrounds
// ═══════════════════════════════════════════════════════════
export const CREAM = "#fff2e5";
export const CREAM_DEEP = "#ffe5cc";

// ═══════════════════════════════════════════════════════════
// ACCENT — Complementary colors
// ═══════════════════════════════════════════════════════════
export const TEAL = "#0EA5A0";
export const CORAL = "#E85D4A";
export const VIOLET = "#7C3AED";
export const AMBER = "#ff9633";

// ═══════════════════════════════════════════════════════════
// BACKWARD COMPATIBILITY — Map old names to new tokens
// ═══════════════════════════════════════════════════════════
/** @deprecated Use DARK instead */
export const NAVY = DARK;
/** @deprecated Use DARK instead */
export const NAVY_DEEP = DARK;
/** @deprecated Use DARK_LIGHT instead */
export const NAVY_LIGHT = DARK_LIGHT;
/** @deprecated Use DARK_MUTED instead */
export const NAVY_MUTED = DARK_MUTED;
/** @deprecated Use ORANGE instead */
export const GOLD = ORANGE;
/** @deprecated Use ORANGE_LIGHT instead */
export const GOLD_LIGHT = ORANGE_LIGHT;
/** @deprecated Use ORANGE_DIM instead */
export const GOLD_DIM = ORANGE_DIM;

// ═══════════════════════════════════════════════════════════
// GRADIENTS — For surfaces, buttons, hero sections
// ═══════════════════════════════════════════════════════════
export const DARK_GRAD = "linear-gradient(135deg, #241100, #663100)";
export const DARK_DEEP_GRAD = "linear-gradient(135deg, #241100, #331900)";
export const ORANGE_GRAD = "linear-gradient(135deg, #ff7b00, #ff9633)";
export const ORANGE_RICH_GRAD = "linear-gradient(135deg, #cc6300, #ff7b00, #ff9633)";
export const TEAL_GRAD = "linear-gradient(135deg, #0EA5A0, #14D4CE)";
export const CORAL_GRAD = "linear-gradient(135deg, #E85D4A, #F08C7E)";
export const VIOLET_GRAD = "linear-gradient(135deg, #7C3AED, #A78BFA)";
export const SURFACE_GRAD = "linear-gradient(180deg, #fff2e5 0%, #FFF9F2 100%)";

// ═══════════════════════════════════════════════════════════
// BACKWARD COMPATIBILITY — Gradient aliases
// ═══════════════════════════════════════════════════════════
/** @deprecated Use DARK_GRAD instead */
export const NAVY_GRAD = DARK_GRAD;
/** @deprecated Use DARK_DEEP_GRAD instead */
export const NAVY_DEEP_GRAD = DARK_DEEP_GRAD;
/** @deprecated Use ORANGE_GRAD instead */
export const GOLD_GRAD = ORANGE_GRAD;
/** @deprecated Use ORANGE_RICH_GRAD instead */
export const GOLD_RICH_GRAD = ORANGE_RICH_GRAD;

// ═══════════════════════════════════════════════════════════
// SEMANTIC — Status & state colors
// ═══════════════════════════════════════════════════════════
export const SUCCESS = "#16A34A";
export const WARNING = "#ff9633";
export const ERROR = "#DC2626";
export const INFO = "#0EA5A0";

// ═══════════════════════════════════════════════════════════
// ELEVATION — Shadow presets
// ═══════════════════════════════════════════════════════════
export const SHADOW_SM = "0 1px 3px rgba(36, 17, 0, 0.04), 0 1px 2px rgba(36, 17, 0, 0.03)";
export const SHADOW_MD = "0 4px 6px -1px rgba(36, 17, 0, 0.06), 0 2px 4px -1px rgba(36, 17, 0, 0.04)";
export const SHADOW_LG = "0 10px 15px -3px rgba(36, 17, 0, 0.08), 0 4px 6px -2px rgba(36, 17, 0, 0.04)";
export const SHADOW_XL = "0 20px 25px -5px rgba(36, 17, 0, 0.1), 0 10px 10px -5px rgba(36, 17, 0, 0.03)";
export const SHADOW_ORANGE = "0 4px 14px -2px rgba(255, 123, 0, 0.25)";
export const SHADOW_GOLD = SHADOW_ORANGE;
export const SHADOW_TEAL = "0 4px 14px -2px rgba(14, 165, 160, 0.2)";

// ═══════════════════════════════════════════════════════════
// HEX CONSTANTS for inline styles referencing the new palette
// ═══════════════════════════════════════════════════════════
export const HARVEST_50 = "#fff2e5";
export const HARVEST_100 = "#ffe5cc";
export const HARVEST_200 = "#ffca99";
export const HARVEST_300 = "#ffb066";
export const HARVEST_400 = "#ff9633";
export const HARVEST_500 = "#ff7b00";
export const HARVEST_600 = "#cc6300";
export const HARVEST_700 = "#994a00";
export const HARVEST_800 = "#663100";
export const HARVEST_900 = "#331900";
export const HARVEST_950 = "#241100";
