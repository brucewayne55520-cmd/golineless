import { BadgeCheck, XCircle, Clock, AlertTriangle } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; icon: typeof BadgeCheck; bg: string; text: string }> = {
  verified: { label: "Verified", icon: BadgeCheck, bg: "bg-green-100", text: "text-green-700" },
  rejected: { label: "Rejected", icon: XCircle, bg: "bg-red-100", text: "text-red-700" },
  pending: { label: "Pending", icon: Clock, bg: "bg-amber-100", text: "text-amber-700" },
};

export function KycBadge({ status }: { status?: string | null }) {
  if (!status || status === "none") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">
        <AlertTriangle size={10} /> Not Started
      </span>
    );
  }
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${config.bg} ${config.text}`}>
      <Icon size={10} /> {config.label}
    </span>
  );
}


