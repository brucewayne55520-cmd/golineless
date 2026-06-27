import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Wallet, Crown, XCircle, Pause, RefreshCw } from "lucide-react";
import { useListAdminSubscriptions } from "@workspace/api-client-react";
import AdminSidebar from "@/components/AdminSidebar";
import { formatCurrency } from "@/lib/utils";
import { customFetch } from "@workspace/api-client-react";
import type { LucideIcon } from "lucide-react";

type Sub = import("@workspace/api-client-react").Subscription;

export default function AdminSubscriptions() {
  const { data, isLoading, refetch } = useListAdminSubscriptions();
  const subs = (data ?? []) as Sub[];
  const [filter, setFilter] = useState<"all" | "active" | "expired">("all");
  const filtered = subs.filter(s => filter === "all" || s.status === filter);
  const active = subs.filter(s => s.status === "active").length;
  const mrr = subs.filter(s => s.status === "active" && s.billingCycle === "monthly").reduce((sum: number, s: Sub) => sum + Number(s.amount), 0);

  const cancelSubscription = async (subId: number) => {
    if (!window.confirm("Cancel this subscription? The user will lose access at the end of the current billing period.")) return;
    try {
      await customFetch(`/api/admin/subscriptions/${subId}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("golineless_admin_token") || ""}` },
      });
      toast.success("Subscription cancelled");
      refetch();
    } catch { toast.error("Failed to cancel subscription"); }
  };

  const reactivateSubscription = async (subId: number) => {
    try {
      await customFetch(`/api/admin/subscriptions/${subId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("golineless_admin_token") || ""}` },
        body: JSON.stringify({ status: "active" }),
      });
      toast.success("Subscription reactivated");
      refetch();
    } catch { toast.error("Failed to reactivate subscription"); }
  };

  const cards: { label: string; val: number | string; Icon: LucideIcon; color: string }[] = [
    { label: "Active Subscriptions", val: active, Icon: CheckCircle2, color: "#22C55E" },
    { label: "Monthly MRR", val: formatCurrency(mrr), Icon: Wallet, color: "#6C3FD4" },
    { label: "Total Subscriptions", val: subs.length, Icon: Crown, color: "#FF6B35" },
  ];

  return (
    <div className="flex min-h-screen gl-surface dark:bg-[#0A0E1A]">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-[#241100] dark:text-[#fff2e5]">Subscriptions</h1>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-5">
          {cards.map(c => (
            <div key={c.label} className="bg-white dark:bg-[#111827] rounded-2xl p-5 gl-shadow-md border border-[#E5E0D8] dark:border-[#1F2937] gl-transition">
              <div className="flex items-center gap-2 mb-1">
                <c.Icon size={16} style={{ color: c.color }} />
                <p className="text-gray-400 text-xs">{c.label}</p>
              </div>
              <p className="text-2xl font-bold text-[#241100] dark:text-[#ff7b00]">{c.val}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mb-4">
          {(["all", "active", "expired"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold gl-transition ${filter === f ? "bg-[#241100] dark:bg-[#ff7b00] text-white dark:text-[#241100]" : "bg-white dark:bg-[#1F2937] text-[#6B7280] border border-[#E5E0D8] dark:border-[#374151] hover:bg-[#FFF9F2] dark:hover:bg-[#111827]"}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="bg-white dark:bg-[#111827] rounded-2xl gl-shadow-md border border-[#E5E0D8] dark:border-[#1F2937] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E0D8] dark:border-[#1F2937]">
                {["User", "Plan", "Billing", "Status", "Tasks Used", "Amount", "Expires", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-[#E5E0D8] rounded animate-pulse" /></td>)}</tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-[#9CA3AF]">No subscriptions {filter !== "all" ? `with status "${filter}"` : ""}</td></tr>
              ) : (
                filtered.map((sub: Sub) => (
                  <tr key={sub.id} className="border-b border-[#F3F4F6] dark:border-[#1F2937] hover:bg-[#FFF9F2] dark:hover:bg-[#1F2937] gl-transition">
                    <td className="px-4 py-3">User #{sub.userId}</td>
                    <td className="px-4 py-3 font-medium text-[#7C3AED]">{sub.planName}</td>
                    <td className="px-4 py-3 capitalize">{sub.billingCycle}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sub.status === "active" ? "bg-green-100 text-green-700" : sub.status === "expired" ? "bg-gray-100 text-gray-600" : "bg-amber-100 text-amber-700"}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{sub.tasksUsed} / {sub.tasksPerMonth ?? "∞"}</td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(sub.amount)}</td>
                    <td className="px-4 py-3 text-[#9CA3AF] text-xs">{sub.endDate ? new Date(sub.endDate).toLocaleDateString("en-IN") : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {sub.status === "active" && (
                          <button onClick={() => cancelSubscription(sub.id)} className="p-1.5 rounded-lg hover:bg-[#FEF2F2] gl-transition" title="Cancel Subscription">
                            <XCircle size={14} className="text-red-400" />
                          </button>
                        )}
                        {sub.status !== "active" && (
                          <button onClick={() => reactivateSubscription(sub.id)} className="p-1.5 rounded-lg hover:bg-[#ECFDF5] gl-transition" title="Reactivate">
                            <RefreshCw size={14} className="text-green-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
