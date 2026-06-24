import { motion } from "framer-motion";
import AdminSidebar from "@/components/AdminSidebar";
import { useGetIncidentResponseCenter } from "@workspace/api-client-react";
import { ShieldAlert, Clock, CheckCircle2, AlertTriangle, Activity } from "lucide-react";
import { NAVY } from "@/lib/theme";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#DC2626", high: "#EF4444", medium: "#F59E0B", low: "#6B7280",
};

export default function AdminIncidentResponse() {
  const { data: responseCenter, isLoading: loadingResponse } = useGetIncidentResponseCenter({ query: { queryKey: ["incidentResponse"], refetchInterval: 15000 } });
  const loading = loadingResponse;

  return (
    <div className="flex min-h-screen" style={{ background: "#F0F2F8" }}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-black text-[#0A1628]">Incident Response Center</h1>
            <p className="text-gray-400 text-xs mt-0.5">Real-time incident management · Auto-refresh 15s</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse shadow-sm border border-gray-100" />)}</div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              {[
                { label: "Open Incidents", val: responseCenter?.open ?? 0, Icon: ShieldAlert, color: "#EF4444", bg: "#FEF2F2" },
                { label: "Critical", val: responseCenter?.critical ?? 0, Icon: AlertTriangle, color: "#DC2626", bg: "#FEF2F2" },
                { label: "Resolved", val: responseCenter?.resolved ?? 0, Icon: CheckCircle2, color: "#16A34A", bg: "#F0FDF4" },
                { label: "Avg Resolution", val: `${responseCenter?.avgResolutionTime ?? 0}m`, Icon: Clock, color: "#3B82F6", bg: "#EFF6FF" },
              ].map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${card.color}15` }}>
                      <card.Icon size={14} style={{ color: card.color }} />
                    </div>
                  </div>
                  <p className="text-2xl font-black" style={{ color: card.color }}>{card.val}</p>
                  <p className="text-[10px] font-medium text-gray-500 mt-0.5">{card.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Type distribution */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5">
              <h3 className="font-black text-[#0A1628] text-sm mb-3">Incident Types</h3>
              <div className="space-y-2">
                {Object.entries(responseCenter?.typeDist ?? {}).map(([type, count]: [string, number]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-500 w-36 truncate capitalize">{type.replace(/_/g, " ")}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / Math.max(responseCenter?.total ?? 1, 1)) * 100}%` }}
                        className="h-full rounded-full"
                        style={{ background: type === "customer_complaint" ? "#EF4444" : type === "fraud_alert" ? "#DC2626" : type === "gps_failure" ? "#F59E0B" : "#3B82F6" }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-600 w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent incidents */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-black text-[#0A1628] text-sm flex items-center gap-2">
                  <Activity size={14} /> Recent Incidents
                </h3>
                <span className="text-xs text-gray-400">{responseCenter?.total ?? 0} total</span>
              </div>
              <div className="divide-y divide-gray-50">
                {(responseCenter?.recent ?? []).length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <ShieldAlert size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="font-medium">No incidents recorded</p>
                  </div>
                ) : (
                  (responseCenter?.recent ?? []).map((i: Required<import("@workspace/api-client-react").Incident>, idx: number) => (
                    <motion.div
                      key={i.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50"
                    >
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SEVERITY_COLORS[i.severity] || "#9CA3AF" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-700 truncate">{i.title || i.type?.replace(/_/g, " ")}</p>
                        <p className="text-[10px] text-gray-400">
                          {i.type?.replace(/_/g, " ")} · {i.status} · {new Date(i.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${i.severity === "critical" ? "bg-red-100 text-red-600" : i.severity === "high" ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"}`}>
                        {i.severity}
                      </span>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
