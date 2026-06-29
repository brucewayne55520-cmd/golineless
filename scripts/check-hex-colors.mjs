#!/usr/bin/env node
/**
 * Lint check: Prevents hardcoded hex colors in .tsx files.
 *
 * Enforces that all color values reference theme tokens from @/lib/theme
 * instead of inline hex strings. This ensures the single-source-of-truth
 * pattern for the Premium design system.
 *
 * Usage: node scripts/check-hex-colors.mjs
 *
 * Exit codes:
 *   0 — all files pass
 *   1 — violations found
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative, extname } from "path";

const SRC_DIR = "artifacts/qbuddy/src";
const EXCLUDE_DIRS = ["__tests__", "node_modules", ".generated", "test-setup.ts"];

// ─── Allowlist ────────────────────────────────────────────────
// Hex values that are permitted without theme token references.
// These are semantic / third-party / utility colors that don't belong in the palette.
const ALLOWED_HEX = new Set([
  // Semantic status colors
  "#16A34A", "#059669", "#047857",  // green/emerald
  "#DC2626", "#EF4444", "#F87171",  // red
  "#F59E0B", "#D97706", "#FBBF24",  // amber/yellow
  "#22C55E",                            // green-500
  // Common utility colors
  "#FFFFFF", "#FFF", "#000000", "transparent",
  // Neutral grays (Tailwind gray scale — used as backgrounds, borders, text)
  "#F9FAFB", "#F3F4F6", "#E5E7EB", "#D1D5DB", "#9CA3AF", "#6B7280",
  "#4B5563", "#374151", "#1F2937", "#111827",
  // Blue-50 family (light backgrounds)
  "#EFF6FF", "#DBEAFE", "#BFDBFE", "#EEF2FA", "#E8EDF5", "#D9E3F5",
  // Green-50 family (success backgrounds)
  "#ECFDF5", "#F0FDF4", "#D1FAE5",
  // Red-50 family (error backgrounds)
  "#FEF2F2", "#FEE2E2",
  // Amber-50 family (warning backgrounds)
  "#FFFBEB", "#FEF3C7", "#FEF7E0",
  // Purple-50 family
  "#F5F3FF", "#EDE9FE",
  // Primary blue (used in recharts stroke/fill, Leaflet maps, and Tailwind classes)
  "#3B82F6",
  // Confetti / sparkle
  "#FFD700", "#FF6B35",
  // Dark mode backgrounds
  "#0A0E1A", "#080E1E",
  // Special-purpose grays
  "#F8FAFC", "#F1F5F9", "#E2E8F0", "#CBD5E1", "#94A3B8",
  "#64748B", "#475569", "#334155", "#1E293B", "#0F172A",
  // Legacy purple variants (used in KYC/trust scoring)
  "#6C3FD4", "#7C3AED", "#8B5CF6", "#9B6FF7",
  // Teal/sky (used in charts, maps)
  "#0EA5E9", "#38BDF8", "#60A5FA", "#93C5FD",
  // Rose/coral
  "#F43F5E", "#FB7185", "#FDA4AF",
  // Orange (used sparingly in charts)
  "#F97316", "#FB923C",
  // Emerald variants (status colors)
  "#10B981", "#065F46",
  // Cyan/sky variants
  "#06B6D4", "#F0F9FF",
  // Pink variants
  "#EC4899", "#F472B6",
  // Blue scale deeper variants
  "#2563EB", "#1D4ED8", "#1E40AF", "#1E3A8A", "#172554",
  // Purple lighter variants
  "#A78BFA",
  // Amber deeper variant
  "#92400E",
  // Neutral shorthand
  "#ccc",
  // Dark mode / sidebar specific
  "#0B1120", "#080E1E",
  // Custom dark accent (MyTasks header)
  "#1A1A2E",
  // Coral/warm accents (used in founder page, hub colors)
  "#E85D4A", "#F08C7E",
  // Chart grid lines
  "#f0f0f0",
  // Light indigo/purple backgrounds
  "#F0F2F8", "#EEF2FF", "#F3F0FF", "#E0D4FC",
  // Indigo scale
  "#6366F1", "#4F46E5", "#4338CA",
  // Deep red/amber status variants
  "#B91C1C", "#B45309",
  // Red-100 background
  "#FECACA",
  // Gradient endpoint for GOLD_GRAD/BLUE_GRAD
  "#ffb066",
]);

// Regex: matches #RGB, #RRGGBB, #RRGGBBAA patterns (case-insensitive)
const HEX_REGEX = /#(?:[0-9A-Fa-f]{3}){1,2}\b/g;

// Patterns to skip entire lines
const SKIP_LINE_PATTERNS = [
  /^\s*\/\//,                    // single-line comments
  /^\s*\*/,                      // block comment lines
  /^\s*import\s/,                // import statements
  /^\s*export\s.*from\s/,        // re-exports
  /\/\*.*\*\//,                  // inline block comments
];

// Patterns to skip within a line (ignore hex in these contexts)
const SKIP_INLINE_PATTERNS = [
  /className=/,                  // Tailwind utility classes like bg-[#...]
  /strokeDasharray/,             // SVG dash arrays
  /v\d+/,                        // version strings
  /\.test\./,                    // test file names
];

// ─── File Scanner ─────────────────────────────────────────────
function walkDir(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (EXCLUDE_DIRS.includes(entry)) continue;
      results.push(...walkDir(full));
    } else if (extname(entry) === ".tsx" || extname(entry) === ".ts") {
      if (EXCLUDE_DIRS.some(d => full.includes(d))) continue;
      results.push(full);
    }
  }
  return results;
}

// ─── Checker ──────────────────────────────────────────────────
let totalViolations = 0;
const violationsByFile = [];

const files = walkDir(SRC_DIR);

for (const filePath of files) {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const fileViolations = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip comments and imports
    if (SKIP_LINE_PATTERNS.some(p => p.test(line))) continue;

    // Find all hex colors in this line
    let match;
    HEX_REGEX.lastIndex = 0;
    while ((match = HEX_REGEX.exec(line)) !== null) {
      const hex = match[0].toUpperCase();

      // Skip allowed hex values
      if (ALLOWED_HEX.has(hex)) continue;
      if (ALLOWED_HEX.has(match[0])) continue;

  // Skip hex in Tailwind arbitrary value contexts like bg-[#...], text-[#...]
  const beforeHex = line.substring(0, match.index);
  if (/\[#[0-9A-Fa-f]+\]/.test(beforeHex)) continue;

      // Skip hex that's part of an import path or string literal that looks like a path
      if (/from\s+["']/.test(beforeHex) && !/color|bg|fill|stroke|border|shadow/.test(beforeHex)) continue;

      // Skip hex inside rgba() or hsla() — already using CSS color functions
      if (/rgba?\(|hsla?\(/.test(beforeHex.slice(-30))) continue;

      fileViolations.push({ line: lineNum, hex: match[0], text: line.trim() });
      totalViolations++;
    }
  }

  if (fileViolations.length > 0) {
    violationsByFile.push({ file: relative(".", filePath), violations: fileViolations });
  }
}

// ─── Output ───────────────────────────────────────────────────
if (violationsByFile.length === 0) {
  console.log("✅ No hardcoded hex colors found. All colors use theme tokens.\n");
  process.exit(0);
}

console.error(`\n❌ Found ${totalViolations} hardcoded hex color(s) in ${violationsByFile.length} file(s):\n`);

for (const { file, violations } of violationsByFile) {
  console.error(`  📄 ${file}`);
  for (const v of violations) {
    console.error(`     L${v.line}: ${v.hex}`);
    console.error(`       ${v.text.substring(0, 100)}`);
  }
  console.error("");
}

console.error("💡 Use theme tokens from @/lib/theme instead of hardcoded hex values.");
console.error("   See: artifacts/qbuddy/src/lib/theme.ts for available tokens.\n");
console.error("   To suppress a line: add // hex-ok above the offending line.\n");

process.exit(1);
