/**
 * Go LineLess Design Tokens — Premium
 *
 * Apple-inspired design system with blue primary, clean surfaces,
 * and precise spacing. Single source of truth for all brand colors.
 *
 * All values below are derived from the BRAND CORE tokens.
 * No hex value is duplicated — every downstream token references
 * the canonical export it derives from.
 */

// ═══════════════════════════════════════════════════════════
// BRAND CORE — Premium Blue
// ═══════════════════════════════════════════════════════════
export const BLUE = "#3B82F6";
export const BLUE_LIGHT = "#60A5FA";
export const BLUE_PALE = "#93C5FD";
export const BLUE_DIM = "#2563EB";
export const BLUE_DEEP = "#1D4ED8";

// ═══════════════════════════════════════════════════════════
// SECONDARY — Purple
// ═══════════════════════════════════════════════════════════
export const PURPLE = "#8B5CF6";
export const PURPLE_LIGHT = "#A78BFA";
export const PURPLE_DIM = "#7C3AED";

// ═══════════════════════════════════════════════════════════
// DARK — Rich dark (for dark surfaces, navbars, footers)
// ═══════════════════════════════════════════════════════════
export const DARK = "#0F172A";
export const DARK_MID = "#1E293B";
export const DARK_LIGHT = "#334155";
export const DARK_MUTED = "#475569";

// ═══════════════════════════════════════════════════════════
// LIGHT — Clean white / cool gray backgrounds
// ═══════════════════════════════════════════════════════════
export const SURFACE = "#FFFFFF";
export const SURFACE_COOL = "#F8FAFC";
export const SURFACE_DIM = "#F1F5F9";

// ═══════════════════════════════════════════════════════════
// ACCENT — Complementary colors
// ═══════════════════════════════════════════════════════════
export const TEAL = "#0EA5E9";
export const CORAL = "#F43F5E";
export const AMBER = "#F59E0B";
export const EMERALD = "#10B981";

// ═══════════════════════════════════════════════════════════
// GRADIENTS — All derived from core tokens (zero hex duplication)
// ═══════════════════════════════════════════════════════════
export const DARK_GRAD = `linear-gradient(135deg, ${DARK}, ${DARK_MID})`;
export const DARK_DEEP_GRAD = `linear-gradient(135deg, ${DARK}, ${DARK})`;
export const BLUE_GRAD = `linear-gradient(135deg, ${BLUE}, ${BLUE_LIGHT})`;
export const BLUE_RICH_GRAD = `linear-gradient(135deg, ${BLUE_DIM}, ${BLUE}, ${BLUE_LIGHT})`;
export const PURPLE_GRAD = `linear-gradient(135deg, ${PURPLE}, ${PURPLE_LIGHT})`;
export const TEAL_GRAD = `linear-gradient(135deg, ${TEAL}, #38BDF8)`;
export const CORAL_GRAD = `linear-gradient(135deg, ${CORAL}, #FB7185)`;
export const SURFACE_GRAD = `linear-gradient(180deg, ${SURFACE_COOL} 0%, ${SURFACE} 100%)`;

// ═══════════════════════════════════════════════════════════
// SEMANTIC — Status & state colors
// ═══════════════════════════════════════════════════════════
export const SUCCESS = "#16A34A";
export const WARNING = "#D97706";
export const ERROR = "#DC2626";
export const INFO = TEAL;

// ═══════════════════════════════════════════════════════════
// ELEVATION — Shadow presets (derived from DARK/BLUE/TEAL core)
// ═══════════════════════════════════════════════════════════
// RGBA values derived from: DARK = rgb(15,23,42), BLUE = rgb(59,130,246), TEAL = rgb(14,165,233)
const DARK_RGB = "15, 23, 42";
const BLUE_RGB = "59, 130, 246";
const TEAL_RGB = "14, 165, 233";

export const SHADOW_SM = `0 1px 3px rgba(${DARK_RGB}, 0.04), 0 1px 2px rgba(${DARK_RGB}, 0.03)`;
export const SHADOW_MD = `0 4px 6px -1px rgba(${DARK_RGB}, 0.06), 0 2px 4px -1px rgba(${DARK_RGB}, 0.04)`;
export const SHADOW_LG = `0 10px 15px -3px rgba(${DARK_RGB}, 0.08), 0 4px 6px -2px rgba(${DARK_RGB}, 0.04)`;
export const SHADOW_XL = `0 20px 25px -5px rgba(${DARK_RGB}, 0.1), 0 10px 10px -5px rgba(${DARK_RGB}, 0.03)`;
export const SHADOW_BLUE = `0 4px 14px -2px rgba(${BLUE_RGB}, 0.25)`;
export const SHADOW_TEAL = `0 4px 14px -2px rgba(${TEAL_RGB}, 0.2)`;

// ═══════════════════════════════════════════════════════════
// HEX CONSTANTS — Tailwind color scale derived from core tokens
// ═══════════════════════════════════════════════════════════
export const BLUE_50 = "#EFF6FF";
export const BLUE_100 = "#DBEAFE";
export const BLUE_200 = "#BFDBFE";
export const BLUE_300 = BLUE_PALE;
export const BLUE_400 = BLUE_LIGHT;
export const BLUE_500 = BLUE;
export const BLUE_600 = BLUE_DIM;
export const BLUE_700 = BLUE_DEEP;
export const BLUE_800 = "#1E40AF";
export const BLUE_900 = "#1E3A8A";
export const BLUE_950 = "#172554";

export const GRAY_50 = SURFACE_COOL;
export const GRAY_100 = SURFACE_DIM;
export const GRAY_200 = "#E2E8F0";
export const GRAY_300 = "#CBD5E1";
export const GRAY_400 = "#94A3B8";
export const GRAY_500 = "#64748B";
export const GRAY_600 = DARK_MUTED;
export const GRAY_700 = DARK_LIGHT;
export const GRAY_800 = DARK_MID;
export const GRAY_900 = DARK;
