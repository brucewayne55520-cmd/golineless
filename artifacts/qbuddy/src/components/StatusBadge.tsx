import { STATUS_COLORS, STATUS_LABELS } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  /** Show a pulsing live indicator dot (for active statuses) */
  showLive?: boolean;
  /** Optional click handler */
  onClick?: () => void;
  /** Optional additional class names */
  className?: string;
}

/**
 * Reusable task status badge.
 * Renders a colored pill with the human-readable status label.
 *
 * @example
 * <StatusBadge status="assigned" showLive />
 * <StatusBadge status="completed" />
 */
export function StatusBadge({ status, showLive = false, onClick, className = "" }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600 border-gray-200";
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span
      onClick={onClick}
      className={`text-[10px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${colorClass} ${onClick ? "cursor-pointer hover:opacity-80" : ""} ${className}`}
    >
      {showLive && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {label}
    </span>
  );
}
