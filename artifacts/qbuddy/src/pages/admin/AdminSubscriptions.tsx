import { useListAdminSubscriptions } from "@workspace/api-client-react";
import AdminSidebar from "@/components/AdminSidebar";
import { formatCurrency } from "@/lib/utils";

export default function AdminSubscriptions() {
  const { data, isLoading } = useListAdminSubscriptions();
  const subs = (data as any[]) ?? [];
  const active = subs.filter(s => s.status === "active").length;
  const mrr = subs.filter(s => s.status === "active" && s.billingCycle === "monthly").reduce((sum: number, s: any) => sum + Number(s.amount), 0);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-5">
          <h1 className="text-2xl font-black text-[#1A1A2E]">Subscriptions</h1>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { label: "Active Subscriptions", val: active, icon: "✅" },
            { label: "Monthly MRR", val: formatCurrency(mrr), icon: "💰" },
            { label: "Total Subscriptions", val: subs.length, icon: "👑" },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-gray-400 text-xs mb-1">{c.icon} {c.label}</p>
              <p className="text-2xl font-black text-[#6C3FD4]">{c.val}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["User", "Plan", "Billing", "Status", "Tasks Used", "Amount", "Expires"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : subs.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No subscriptions yet</td></tr>
              ) : (
                subs.map((sub: any) => (
                  <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">User #{sub.userId}</td>
                    <td className="px-4 py-3 font-medium text-[#6C3FD4]">{sub.planName}</td>
                    <td className="px-4 py-3 capitalize">{sub.billingCycle}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sub.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{sub.tasksUsed} / {sub.tasksPerMonth ?? "∞"}</td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(sub.amount)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{sub.endDate ? new Date(sub.endDate).toLocaleDateString("en-IN") : "—"}</td>
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
