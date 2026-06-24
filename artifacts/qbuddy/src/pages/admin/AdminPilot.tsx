import { motion } from "framer-motion";
import { toast } from "sonner";
import AdminSidebar from "@/components/AdminSidebar";
import { useGetPilotDashboard, useGetPilotMode, useGetKpiTracker, useUpdatePilotMode, type PilotModeUpdate } from "@workspace/api-client-react";
import { Zap, Users, ClipboardList, Percent, CheckCircle2, Wallet, Star, Clock, ShieldAlert, Ticket, Activity, Target, ToggleLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { NAVY, NAVY_GRAD, GOLD } from "@/lib/theme";

export default function AdminPilot() {
  const { data, isLoading, refetch: refetchDashboard } = useGetPilotDashboard({ query: { queryKey: ["pilotDashboard"], refetchInterval: 15000 } });
  const { data: pilotMode, refetch: refetchPilotMode } = useGetPilotMode({ query: { queryKey: ["pilotMode"], refetchInterval: 30000 } });
  const { data: kpiData, refetch: refetchKpi } = useGetKpiTracker({ query: { queryKey: ["kpiTracker"], refetchInterval: 30000 } });

  const updatePilotModeMutation = useUpdatePilotMode();

  const togglePilotMode = () => {
    const newMode = !pilotMode?.pilotMode;
    updatePilotModeMutation.mutate({ data: { pilotMode: newMode } as PilotModeUpdate }, {
      onError: () => toast.error("Failed to toggle pilot mode"),
      onSettled: () => { refetchDashboard(); refetchPilotMode(); refetchKpi(); },
    });
  };

  if (isLoading) return (
    <div className="flex min-h-screen" style={{ background: "#0A1628" }}>
      <AdminSidebar />
      <main className="flex-1 p-6">
        <div className="grid grid-cols-4 gap-4 mb-5">{[1,2,3,4].map(i => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse shadow-sm" />)}</div>
      </main>
    </div>
  );

  const metrics = [
    { label: "Active Users", val: data?.activeUsers ?? 0, Icon: Users, color: NAVY, bg: "#EEF2FA" },
    { label: "Active Comrades", val: data?.activeComrades ?? 0, Icon: Zap, color: GOLD, bg: "#FEF9EC" },
    { label: "Tasks Today", val: data?.tasksToday ?? 0, Icon: ClipboardList, color: "#3B82F6", bg: "#EFF6FF" },
    { label: "Acceptance Rate", val: `${data?.acceptanceRate ?? 0}%`, Icon: Percent, color: "#8B5CF6", bg: "#F5F3FF" },
    { label: "Completion Rate", val: `${data?.completedRate ?? 0}%`, Icon: CheckCircle2, color: "#059669", bg: "#ECFDF5" },
    { label: "Revenue Today", val: formatCurrency(data?.revenueToday ?? 0), Icon: Wallet, color: "#D97706", bg: "#FFFBEB" },
    { label: "Avg Rating", val: data?.avgRating ?? "N/A", Icon: Star, color: "#C9A84C", bg: "#FEF9EC" },
    { label: "Avg Wait Saved", val: `${data?.avgWaitSaved ?? 0}m`, Icon: Clock, color: "#0EA5E9", bg: "#F0F9FF" },
  ];

  const alerts = [
    { label: "Open Incidents", val: data?.openIncidents ?? 0, Icon: ShieldAlert, color: "#EF4444" },
    { label: "Open Tickets", val: data?.openTickets ?? 0, Icon: Ticket, color: "#F59E0B" },
    { label: "Pending KYC", val: data?.pendingKyc ?? 0, Icon: Activity, color: "#8B5CF6" },
    { label: "Online Comrades", val: data?.onlineComrades ?? 0, Icon: Users, color: "#059669" },
  ];

  return (
    <div className="flex min-h-screen" style={{ background: "#0A1628" }}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-black text-white">Pilot Command Center</h1>
              <p className="text-white/40 text-xs mt-0.5">Go LineLess · Ahmedabad Pilot · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
            </div>
            {/* Pilot Mode Toggle */}
            {pilotMode !== null && (
              <button onClick={togglePilotMode}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${pilotMode?.pilotMode ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-white/5 text-white/40 border-white/10"}`}
              >
                <ToggleLeft size={14} />
                Pilot Mode {pilotMode?.pilotMode ? "ON" : "OFF"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {data?.timestamp && (
              <span className="text-[10px] text-white/30 font-mono">Last updated: {new Date(data.timestamp).toLocaleTimeString("en-IN")}</span>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Real-time metrics */}
          <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            {metrics.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl p-5" style={{ background: m.bg }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${m.color}20` }}>
                    <m.Icon size={18} style={{ color: m.color }} />
                  </div>
                </div>
                <p className="text-2xl font-black" style={{ color: m.color }}>{m.val}</p>
                <p className="text-[10px] font-medium text-gray-500 mt-0.5">{m.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Alert cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            {alerts.map((a, i) => (
              <motion.div
                key={a.label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="rounded-2xl p-4 flex items-center gap-3"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <a.Icon size={18} style={{ color: a.color }} />
                <div>
                  <p className="text-lg font-black text-white">{a.val}</p>
                  <p className="text-[10px] text-white/40">{a.label}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Status summary */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl p-6 text-white relative overflow-hidden"
            style={{ background: NAVY_GRAD }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: `radial-gradient(circle, ${GOLD}, transparent)`, transform: "translate(30%,-30%)" }} />
            <h3 className="font-black text-white/80 text-sm mb-4 flex items-center gap-2">
              <Activity size={14} /> Pilot Status
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-2xl font-black text-white">{data?.totalUsers ?? 0}</p>
                <p className="text-[10px] text-white/50 mt-0.5">Total Users</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">{data?.totalComrades ?? 0}</p>
                <p className="text-[10px] text-white/50 mt-0.5">Verified Comrades</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">{data?.qualityTotal ?? 0}</p>
                <p className="text-[10px] text-white/50 mt-0.5">Quality Reviews</p>
              </div>
              <div>
                <p className="text-2xl font-black" style={{ color: GOLD }}>{data?.acceptanceRate ?? 0}%</p>
                <p className="text-[10px] text-white/50 mt-0.5">Acceptance Rate</p>
              </div>
            </div>
          </motion.div>

          {/* KPI Tracker */}
          {kpiData && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="rounded-2xl p-5 mt-5"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <h3 className="font-black text-white/80 text-sm mb-4 flex items-center gap-2">
                <Target size={14} className="text-green-400" /> Pilot KPI Tracker
              </h3>
              <div className="grid grid-cols-3 gap-6 mb-4">
                {(Object.entries(kpiData.goals || {}) as [string, { current: number; target: number }][]).map(([key, goal]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-white/60 uppercase">{key}</span>
                      <span className="text-sm font-black text-white">{goal.current}<span className="text-white/30 font-medium text-xs">/{goal.target}</span></span>
                    </div>
                    <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                        className="h-full rounded-full transition-all"
                        style={{
                          background: goal.current >= goal.target ? "#16A34A" :
                            goal.current >= goal.target * 0.5 ? GOLD : "#3B82F6",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <span className="text-xs text-white/30">Overall pilot progress: <strong className="text-white">{kpiData.overall ?? 0}%</strong></span>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
