import type { TaskPaymentStatus } from "@workspace/api-client-react";

interface PaymentBadgeProps {
  /** The task's paymentStatus field */
  paymentStatus?: TaskPaymentStatus | string | null;
  /** The task's status field — completed/cancelled tasks hide the badge */
  taskStatus?: string;
  /** The task's paymentMethod field — used for cash-specific messaging */
  paymentMethod?: string | null;
}

/**
 * Amber "Payment pending" badge.
 * Shows only when paymentStatus !== "paid" and task is not completed/cancelled.
 */
export function PaymentBadge({ paymentStatus, taskStatus, paymentMethod }: PaymentBadgeProps) {
  if (!paymentStatus || paymentStatus === "paid") return null;
  if (taskStatus && ["completed", "cancelled"].includes(taskStatus)) return null;

  if (paymentStatus === "cash_pending") {
    return (
      <span
        className="text-[10px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap"
        style={{ background: "#FEF3C7", borderColor: "#F59E0B", color: "#92400E" }}
      >
        Confirm payment
      </span>
    );
  }

  if (paymentMethod === "cash") {
    return (
      <span
        className="text-[10px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap"
        style={{ background: "#ECFDF5", borderColor: "#10B981", color: "#065F46" }}
      >
        Pay cash on completion
      </span>
    );
  }

  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap"
      style={{ background: "#FEF3C7", borderColor: "#F59E0B", color: "#92400E" }}
    >
      Payment pending
    </span>
  );
}
