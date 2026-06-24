import { useLocation } from "wouter";
import { NAVY_GRAD, GOLD_GRAD } from "@/lib/theme";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";

interface PayButtonProps {
  taskId: number | string;
  /** Show price in the label (navy variant only) */
  price?: number | string | null;
  /** Visual variant: gold (compact/inline) or navy (full-width with price) */
  variant?: "gold" | "navy";
  /** Custom label text (overrides defaults) */
  label?: string;
  /** Payment method — if 'cash', shows cash-appropriate label instead of Pay Now */
  paymentMethod?: string | null;
}

/**
 * Shared "Pay Now" / "Pay" navigation button.
 *
 * Gold variant (default): compact inline button → for task cards and headers.
 * Navy variant: full-width button with price → for detail pages.
 *
 * Uses wouter's `useLocation` internally so it works anywhere in the Router tree.
 * Calls `e.stopPropagation()` by default to prevent parent onClick.
 */
export function PayButton({ taskId, price, variant = "gold", label, paymentMethod }: PayButtonProps) {
  const [, navigate] = useLocation();
  // Fix #94: Loading state during navigation/checkout
  const [loading, setLoading] = useState(false);

  // [OFFLINE MODE] For cash tasks, don't show a "Pay Now" button — user pays Comrade directly
  // Show a subtle "Cash on completion" badge instead of a clickable button
  if (paymentMethod === "cash" && !label) {
    if (variant === "navy") {
      return (
        <div className="w-full py-3 rounded-xl text-center text-sm font-semibold border-2 border-dashed" style={{ borderColor: "#22C55E60", color: "#16A34A", background: "#F0FDF4" }}>
          Pay cash on completion
        </div>
      );
    }
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg" style={{ background: "#ECFDF5", color: "#16A34A" }}>
        Cash
      </span>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    navigate(`/app/tasks/${taskId}/pay`);
    // Reset loading after navigation completes (or after timeout as fallback)
    setTimeout(() => setLoading(false), 2000);
  };

  if (variant === "navy") {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full py-3 rounded-xl text-white font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ background: NAVY_GRAD }}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing…
          </>
        ) : (
          label || `Pay Now · ${price ? formatCurrency(price) : ""}`
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1"
      style={{ background: GOLD_GRAD, color: "#0A1628" }}
    >
      {loading ? (
        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : null}
      {loading ? "Loading…" : (label || "Pay Now")}
    </button>
  );
}
