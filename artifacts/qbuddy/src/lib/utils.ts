import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { CSSProperties } from "react";

/** Helper type for style props with CSS custom properties (e.g. `--tw-ring-color`). */
export type CSSWithCustomProps = CSSProperties & Record<string, string | number>;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CATEGORY_NAMES: Record<string, string> = {
  hospital: "Hospital Queue",
  govt_office: "Govt Office",
  bank: "Bank Work",
  document: "Document",
  medicine: "Medicine",
  senior_care: "Senior Care",
  errand: "Errand",
  emergency: "Emergency",
};

export const CATEGORY_HINDI: Record<string, string> = {
  hospital: "अस्पताल",
  govt_office: "सरकारी काम",
  bank: "बैंक",
  document: "दस्तावेज़",
  medicine: "दवाई",
  senior_care: "बुज़ुर्ग सेवा",
  errand: "काम-काज",
  emergency: "ज़रूरी",
};

export const CATEGORY_PRICES: Record<string, number> = {
  hospital: 149,
  govt_office: 179,
  bank: 129,
  document: 139,
  medicine: 99,
  senior_care: 199,
  errand: 89,
  emergency: 299,
};

// ═══════════════════════════════════════════════════════════
// STATUS COLORS — Bold & Vibrant palette
// ═══════════════════════════════════════════════════════════
export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  assigned: "bg-blue-50 text-blue-700 border-blue-200",
  on_the_way: "bg-violet-50 text-violet-700 border-violet-200",
  at_location: "bg-emerald-50 text-emerald-700 border-emerald-200",
  in_progress: "bg-indigo-50 text-indigo-700 border-indigo-200",
  waiting_started: "bg-orange-50 text-orange-700 border-orange-200",
  waiting_paused: "bg-rose-50 text-rose-700 border-rose-200",
  waiting_completed: "bg-teal-50 text-teal-700 border-teal-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  assigned: "Comrade Assigned",
  on_the_way: "On the Way",
  at_location: "At Location",
  in_progress: "In Progress",
  waiting_started: "Waiting Started",
  waiting_paused: "Waiting Paused",
  waiting_completed: "Waiting Done",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const STATUS_BORDER: Record<string, string> = {
  pending: "border-l-amber-400",
  assigned: "border-l-blue-400",
  on_the_way: "border-l-violet-400",
  at_location: "border-l-emerald-400",
  in_progress: "border-l-indigo-400",
  completed: "border-l-green-400",
  cancelled: "border-l-red-400",
};

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount == null) return "Rs 0";
  return `Rs ${Number(amount).toLocaleString("en-IN")}`;
}

export function getInitials(name?: string | null): string {
  if (!name) return "Q";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ============================================================
// Phase 4: Queue Intelligence Engine — Calculation Utilities
// ============================================================

/**
 * Calculate tokens ahead (gap) between token number and current token.
 * Returns null if either value is non-numeric.
 */
export function calculateQueueGap(tokenNumber?: string | null, currentToken?: string | null): number | null {
  if (!tokenNumber || !currentToken) return null;
  const token = parseInt(tokenNumber, 10);
  const current = parseInt(currentToken, 10);
  if (isNaN(token) || isNaN(current)) return null;
  return Math.max(0, token - current);
}

/**
 * Estimate wait time in minutes.
 * Default: 1.5 minutes per person.
 */
export function estimateWaitTime(gap: number | null, avgServiceTimePerPerson: number = 1.5): number | null {
  if (gap == null || gap < 0) return null;
  return Math.round(gap * avgServiceTimePerPerson);
}

/**
 * Calculate queue progress as percentage (0-100).
 */
export function calculateQueueProgress(tokenNumber?: string | null, currentToken?: string | null): number | null {
  if (!tokenNumber || !currentToken) return null;
  const token = parseInt(tokenNumber, 10);
  const current = parseInt(currentToken, 10);
  if (isNaN(token) || isNaN(current) || token <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((current / token) * 100)));
}

// Proof Photo Watermark (canvas-based, lightweight)
export function applyWatermark(
  imageUrl: string,
  meta: { taskId?: number; proofType?: string; lat?: number | null; lng?: number | null; address?: string | null; timestamp?: string }
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxW = 800;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(imageUrl); return; }

      // Draw image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Watermark overlay
      const bottomPad = 48 * scale;
      const fontSize = Math.max(9, 11 * scale);
      ctx.font = `${fontSize}px monospace`;

      // Semi-transparent bar at bottom
      ctx.fillStyle = "rgba(10,22,40,0.8)";
      ctx.fillRect(0, canvas.height - bottomPad, canvas.width, bottomPad);

      // Text details
      ctx.fillStyle = "#3B82F6";
      const dateStr = meta.timestamp ? new Date(meta.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
      const line1 = `Go LineLess  |  Task #${meta.taskId || "—"}  |  ${meta.proofType?.replace(/_/g, " ") || "Proof"}`;
      const line2 = `${dateStr}  ${meta.address || (meta.lat && meta.lng ? `${meta.lat.toFixed(4)}, ${meta.lng.toFixed(4)}` : "")}`;

      ctx.fillText(line1, 10, canvas.height - bottomPad + fontSize + 4);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      if (line2.trim()) ctx.fillText(line2, 10, canvas.height - 8);

      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
}
