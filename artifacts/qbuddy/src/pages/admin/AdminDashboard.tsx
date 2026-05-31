import { motion } from "framer-motion";
import { ClipboardList, Zap, CheckCircle2, XCircle, Wallet, Building2, PersonStanding, Clock, AlertTriangle, Star } from "lucide-react";
import { useGetAdminStats, useGetAdminActivity } from "@workspace/api-client-react";
import AdminSidebar from "@/components/AdminSidebar";
import { formatCurrency } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const NAVY = "#0F2557";
const GOLD = "#C9A84C";
const GOLD_GRAD = "linear-gradient(135deg, #C9A84C, #D4B870)";

function CountUp({ value, prefix = "" }: { value: number; prefix?: string }) {
  return (
    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      {prefix}{value?.toLocaleString("en-IN") ?? 0}
    </motion.span>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats({ query: { refetchInterval: 10000 } });
  const { data: activity } = useGetAdminActivity({ query: { refetchInterval: 5000 } });

  const s = stats as any;
  const acts = (activity as any[]) ?? [];

  const metricCards: { label: string; val: number; Icon: LucideIcon; color: string; bg: string }[] = s ? [
    { label: "Tasks Today", val: s.totalTasksToday, Icon: ClipboardList, color: NAVY, bg: "#EEF2FA" },
    { label: "Active Now", val: s.activeNow, Icon: Zap, color: GOLD, bg: "#FEF9EC" },
    { label: "Completed", val: s.completedToday, Icon: CheckCircle2, color: "#22C55E", bg: "#F0FDF4" },
    { label: "Cancelled", val: s.cancelledToday, Icon: XCircle, color: "#EF4444", bg: "#FEF2F2" },
  ] : [];

  const revenueCards: { label: string; val: number; Icon: LucideIcon }[] = s ? [
    { label: "GMV Today", val: s.gmvToday, Icon: Wallet },
    { label: "Platform Revenue", val: s.platformRevenue, Icon: Building2 },
    { label: "Runner Payouts", val: s.runnerPayouts, Icon: PersonStanding },
    { label: "Pending Payouts", val: s.pendingPayouts, Icon: Clock },
  ] : [];

  return (
    <div className="flex min-h-screen" style={{ background: "#F8F9FC" }}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-[#0A1628]">Command Center</h1>
          <p className="text-gray-500 text-sm">Go LineLess real-time operations</p>
        </div>

        {s && (
          <div className="flex gap-3 mb-6 text-sm flex-wrap">
            <div className="flex items-center gap-2 bg-green-100 px-3 py-1.5 rounded-xl border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="font-semibold text-green-700">{s.totalRunnersOnline} Online</span>
            </div>
            <div className="flex items-center gap-2 bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="font-semibold text-blue-700">{s.totalRunnersOnTask} On Task</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200">
              <div className="w-2 h-2 bg-gray-400 rounded-full" />
              <span className="font-semibold text-gray-600">{s.totalRunnersOffline} Offline</span>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {metricCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: card.bg }}>
                    <card.Icon size={18} style={{ color: card.color }} />
                  </div>
                  <div className="w-2 h-2 rounded-full" style={{ background: card.color }} />
                </div>
                <div className="text-3xl font-black" style={{ color: card.color }}>
                  <CountUp value={card.val} />
                </div>
                <p className="text-gray-500 text-xs mt-1">{card.label}</p>
              </motion.div>
            ))}
          </div>
        )}

        {s && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {revenueCards.map((card) => (
              <div key={card.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <card.Icon size={14} className="text-gray-400" />
                  <p className="text-gray-400 text-xs">{card.label}</p>
                </div>
                <p className="text-xl font-black" style={{ color: NAVY }}>{formatCurrency(card.val)}</p>
              </div>
            ))}
          </div>
        )}

        {s && (
          <div className="flex gap-3 mb-6 flex-wrap">
            {s.kycPending > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 flex items-center gap-2">
                <Clock size={14} className="text-yellow-600" />
                <span className="text-yellow-700 text-sm font-semibold">{s.kycPending} KYC Pending</span>
              </div>
            )}
            {s.stuckTasks > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-red-700 text-sm font-semibold">{s.stuckTasks} Stuck Tasks</span>
              </div>
            )}
            {s.newReviews > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 flex items-center gap-2">
                <Star size={14} className="text-blue-500" />
                <span className="text-blue-700 text-sm font-semibold">{s.newReviews} New Reviews</span>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-[#0A1628] mb-4">Live Activity Feed</h3>
          {acts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No recent activity</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {acts.map((a: any) => (
                <div key={a.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 animate-pulse" style={{ background: GOLD }} />
                  <div>
                    <p className="text-sm text-gray-700">{a.message}</p>
                    <p className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleTimeString("en-IN")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
