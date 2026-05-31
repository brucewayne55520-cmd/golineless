import { motion } from "framer-motion";
import { ClipboardList, Zap, CheckCircle2, XCircle, Wallet, Building2, PersonStanding, Clock, AlertTriangle, Star, TrendingUp, Activity, ArrowRight } from "lucide-react";
import { useGetAdminStats, useGetAdminActivity } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import AdminSidebar from "@/components/AdminSidebar";
import { formatCurrency } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const NAVY = "#0F2557";
const NAVY_GRAD = "linear-gradient(135deg, #0F2557, #1D3D7C)";
const GOLD = "#C9A84C";
const GOLD_GRAD = "linear-gradient(135deg, #C9A84C, #D4B870)";

function CountUp({ value, prefix = "" }: { value: number; prefix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {prefix}{value?.toLocaleString("en-IN") ?? 0}
    </motion.span>
  );
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { data: stats, isLoading } = useGetAdminStats({ query: { refetchInterval: 10000 } });
  const { data: activity } = useGetAdminActivity({ query: { refetchInterval: 5000 } });

  const s = stats as any;
  const acts = (activity as any[]) ?? [];

  const metricCards: { label: string; val: number; Icon: LucideIcon; color: string; bg: string; trend?: string }[] = s ? [
    { label: "Tasks Today", val: s.totalTasksToday, Icon: ClipboardList, color: NAVY, bg: "#EEF2FA", trend: "All time" },
    { label: "Active Now", val: s.activeNow, Icon: Zap, color: GOLD, bg: "#FEF9EC", trend: "Live" },
    { label: "Completed", val: s.completedToday, Icon: CheckCircle2, color: "#16A34A", bg: "#F0FDF4", trend: "Today" },
    { label: "Cancelled", val: s.cancelledToday, Icon: XCircle, color: "#DC2626", bg: "#FEF2F2", trend: "Today" },
  ] : [];

  const revenueCards: { label: string; val: number; Icon: LucideIcon; color: string }[] = s ? [
    { label: "GMV Today", val: s.gmvToday, Icon: Wallet, color: NAVY },
    { label: "Platform Revenue", val: s.platformRevenue, Icon: Building2, color: "#7C3AED" },
    { label: "Runner Payouts", val: s.runnerPayouts, Icon: PersonStanding, color: "#16A34A" },
    { label: "Pending Payouts", val: s.pendingPayouts, Icon: Clock, color: "#D97706" },
  ] : [];

  const now = new Date();

  return (
    <div className="flex min-h-screen" style={{ background: "#F0F2F8" }}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div>
            <h1 className="text-xl font-black text-[#0A1628]">Command Center</h1>
            <p className="text-gray-400 text-xs mt-0.5">
              Go LineLess Operations · {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {s && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-700 text-xs font-bold">{s.totalRunnersOnline} Online</span>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
                  <Activity size={12} className="text-blue-500" />
                  <span className="text-blue-700 text-xs font-bold">{s.totalRunnersOnTask} On Task</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-xl">
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                  <span className="text-gray-600 text-xs font-bold">{s.totalRunnersOffline} Offline</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Alert banners */}
          {s && (s.kycPending > 0 || s.stuckTasks > 0 || s.newReviews > 0) && (
            <div className="flex gap-3 mb-5 flex-wrap">
              {s.kycPending > 0 && (
                <button
                  onClick={() => navigate("/admin/runners")}
                  className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 hover:bg-amber-100 transition-colors"
                >
                  <Clock size={14} className="text-amber-600" />
                  <span className="text-amber-700 text-sm font-bold">{s.kycPending} KYC Pending</span>
                  <ArrowRight size={12} className="text-amber-400" />
                </button>
              )}
              {s.stuckTasks > 0 && (
                <button
                  onClick={() => navigate("/admin/tasks")}
                  className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 hover:bg-red-100 transition-colors"
                >
                  <AlertTriangle size={14} className="text-red-500" />
                  <span className="text-red-700 text-sm font-bold">{s.stuckTasks} Stuck Tasks</span>
                  <ArrowRight size={12} className="text-red-400" />
                </button>
              )}
              {s.newReviews > 0 && (
                <div className="flex items-center gap-2.5 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5">
                  <Star size={14} className="text-indigo-500" />
                  <span className="text-indigo-700 text-sm font-bold">{s.newReviews} New Reviews</span>
                </div>
              )}
            </div>
          )}

          {/* Metric cards */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse shadow-sm border border-gray-100" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              {metricCards.map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07, type: "spring", stiffness: 200 }}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.bg }}>
                      <card.Icon size={18} style={{ color: card.color }} />
                    </div>
                    {card.trend && (
                      <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">{card.trend}</span>
                    )}
                  </div>
                  <div className="text-3xl font-black mb-1" style={{ color: card.color }}>
                    <CountUp value={card.val} />
                  </div>
                  <p className="text-gray-500 text-xs font-medium">{card.label}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* Revenue cards */}
          {s && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              {revenueCards.map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${card.color}15` }}>
                      <card.Icon size={13} style={{ color: card.color }} />
                    </div>
                    <p className="text-gray-400 text-xs font-medium">{card.label}</p>
                  </div>
                  <p className="text-xl font-black" style={{ color: card.color }}>{formatCurrency(card.val)}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* GMV highlight banner */}
          {s && s.gmvToday > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-2xl p-5 mb-5 flex items-center gap-4 relative overflow-hidden"
              style={{ background: NAVY_GRAD }}
            >
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10" style={{ background: `radial-gradient(circle, ${GOLD}, transparent)`, transform: "translate(30%,-30%)" }} />
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: GOLD_GRAD }}>
                <TrendingUp size={22} className="text-white" />
              </div>
              <div>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Gross Merchandise Value</p>
                <p className="text-white font-black text-2xl">{formatCurrency(s.gmvToday)}</p>
                <p className="text-white/50 text-xs">Today's total transaction volume · Ahmedabad Pilot</p>
              </div>
            </motion.div>
          )}

          {/* Activity feed */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <h3 className="font-black text-[#0A1628]">Live Activity Feed</h3>
              </div>
              <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg">Auto-refresh · 5s</span>
            </div>
            {acts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Activity size={32} className="mb-2 opacity-30" />
                <p className="text-sm font-medium">No recent activity</p>
                <p className="text-xs mt-0.5 text-gray-300">Activity appears here in real time</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                {acts.map((a: any, i: number) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: GOLD }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-snug">{a.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(a.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
