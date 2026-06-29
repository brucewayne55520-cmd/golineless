import { motion } from "framer-motion";
import AdminSidebar from "@/components/AdminSidebar";
import { useGetFounderDashboard } from "@workspace/api-client-react";
import { Users, PersonStanding, ClipboardList, Wallet, Star, ShieldAlert, Ticket, TrendingUp, Target } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { DARK_GRAD, BLUE, BLUE_GRAD, DARK } from "@/lib/theme";
export default function AdminFounder() {
  const { data, isLoading } = useGetFounderDashboard({ query: { queryKey: ["founderDashboard"], refetchInterval: 15000 } });

  if (isLoading) return (
    <div className="flex min-h-screen" style={{ background: DARK }}>
      <AdminSidebar />
      <main className="flex-1 p-6">
        <div className="grid grid-cols-3 gap-4 mb-5">{[1,2,3].map(i => <div key={i} className="h-28 bg-white/5 rounded-2xl animate-pulse" />)}</div>
      </main>
    </div>
  );

  const sections = [
    {
      title: "Users", icon: Users, color: "#3B82F6",
      metrics: [
        { label: "Total Users", val: data?.users?.total ?? 0 },
        { label: "Active Users", val: data?.users?.uniqueWithTasks ?? 0 },
      ],
    },
    {
      title: "Comrades", icon: PersonStanding, color: "#8B5CF6",
      metrics: [
        { label: "Total", val: data?.comrades?.total ?? 0 },
        { label: "Verified", val: data?.comrades?.verified ?? 0, sub: `/${data?.comrades?.total ?? 0}` },
        { label: "Online Now", val: data?.comrades?.online ?? 0 },
      ],
    },
    {
      title: "Tasks", icon: ClipboardList, color: "#0EA5E9",
      metrics: [
        { label: "Total", val: data?.tasks?.total ?? 0 },
        { label: "Completed", val: data?.tasks?.completed ?? 0 },
        { label: "Active Now", val: data?.tasks?.activeNow ?? 0 },
        { label: "Completion Rate", val: `${data?.tasks?.completionRate ?? 0}%` },
      ],
    },
    {
      title: "Revenue", icon: Wallet, color: "#F59E0B",
      metrics: [
        { label: "Today", val: formatCurrency(data?.revenue?.today ?? 0) },
        { label: "Total", val: formatCurrency(data?.revenue?.total ?? 0) },
      ],
    },
    {
      title: "Quality", icon: Star, color: BLUE,
      metrics: [
        { label: "Avg Rating", val: data?.quality?.avgRating ?? "0.0" },
        { label: "Avg Trust", val: data?.quality?.avgTrustScore ?? 0 },
        { label: "Wait Saved", val: `${data?.quality?.avgWaitSaved ?? 0}m` },
      ],
    },
    {
      title: "Incidents", icon: ShieldAlert, color: "#EF4444",
      metrics: [
        { label: "Open", val: data?.incidents?.open ?? 0 },
        { label: "Total", val: data?.incidents?.total ?? 0 },
      ],
    },
    {
      title: "Support", icon: Ticket, color: "#10B981",
      metrics: [
        { label: "Open Tickets", val: data?.support?.open ?? 0 },
        { label: "Total", val: data?.support?.total ?? 0 },
      ],
    },
    {
      title: "Growth", icon: TrendingUp, color: "#06B6D4",
      metrics: [
        { label: "This Week", val: data?.growth?.weekTasks ?? 0 },
        { label: "Prev Week", val: data?.growth?.prevWeekTasks ?? 0 },
        { label: "Growth Rate", val: `${data?.growth?.taskGrowth ?? 0}%`, isUp: (data?.growth?.taskGrowth ?? 0) >= 0 },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen" style={{ background: DARK }}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white">Founder Command Center</h1>
            <p className="text-white/40 text-xs mt-0.5">Go LineLess · Single-screen overview · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          {data?.timestamp && (
            <span className="text-[10px] text-white/30 font-mono">{new Date(data.timestamp).toLocaleTimeString("en-IN")}</span>
          )}
        </div>

        <div className="p-6">
          {/* Pilot Progress */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-6 mb-6 text-white relative overflow-hidden"
            style={{ background: DARK_GRAD }}
          >
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10" style={{ background: `radial-gradient(circle, ${BLUE}, transparent)`, transform: "translate(30%,-30%)" }} />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: BLUE_GRAD }}>
                <Target size={18} className="text-white" />
              </div>
              <div>
                <h2 className="font-black text-lg">Pilot Progress</h2>
              </div>
            </div>
            <div className="flex items-end gap-1 mb-2">
              <span className="text-4xl font-black">{data?.pilotProgress ?? 0}%</span>
              <span className="text-white/50 text-sm mb-1">toward Ahmedabad launch</span>
            </div>
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(data?.pilotProgress ?? 0, 100)}%` }}
                className="h-full rounded-full"
                style={{ background: BLUE_GRAD }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              {(Object.entries(data?.pilotGoals ?? {}) as [string, { current: number; target: number }][]).map(([key, goal]) => (
                <div key={key} className="text-center">
                  <p className="text-xs font-black text-white/80 uppercase">{key}</p>
                  <p className="text-lg font-black">{goal.current}<span className="text-white/50 text-sm font-medium">/{goal.target}</span></p>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
                    <div className="h-full rounded-full bg-green-400" style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Section Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sections.map((section, i) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.04 }}
                className="rounded-2xl p-5"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <section.icon size={16} style={{ color: section.color }} />
                  <h3 className="font-bold text-white/80 text-sm">{section.title}</h3>
                </div>
                <div className="space-y-2">
                  {section.metrics.map((m: { label: string; val: string | number; sub?: string; isUp?: boolean }) => (
                    <div key={m.label} className="flex items-center justify-between">
                      <span className="text-[10px] text-white/40">{m.label}</span>
                      <span className="text-sm font-black text-white flex items-center gap-1">
                        {m.val}
                        {m.sub && <span className="text-white/30 text-xs font-normal">{m.sub}</span>}
                        {m.isUp !== undefined && (
                          m.isUp ? <TrendingUp size={10} className="text-green-400" /> : <TrendingUp size={10} className="text-red-400 rotate-180" />
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom status */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-center text-[10px] text-white/20"
          >
            Founder Dashboard · Auto-refresh every 15s · Data from all systems
          </motion.div>
        </div>
      </main>
    </div>
  );
}
