import { motion } from "framer-motion";
import { toast } from "sonner";
import AdminSidebar from "@/components/AdminSidebar";
import { useListIncidents, useGetIncidentStats, useUpdateIncident } from "@workspace/api-client-react";
import { ShieldAlert, AlertTriangle } from "lucide-react";
import { NAVY } from "@/lib/theme";
const SEVERITY_COLORS: Record<string, string> = { low: "#9CA3AF", medium: "#F59E0B", high: "#EF4444", critical: "#DC2626" };
const TYPE_COLORS: Record<string, string> = { customer_complaint: "#3B82F6", runner_misconduct: "#EF4444", gps_failure: "#F59E0B", proof_failure: "#8B5CF6", payment_issue: "#10B981", fraud_alert: "#DC2626" };

export default function AdminIncidents() {
  const { data: incidents, isLoading: loadingIncidents, refetch: refetchIncidents } = useListIncidents(undefined, { query: { queryKey: ["incidents"], refetchInterval: 10000 } });
  const { data: stats, refetch: refetchStats } = useGetIncidentStats({ query: { queryKey: ["incidentStats"], refetchInterval: 10000 } });
  const loading = loadingIncidents;

  const updateIncidentMutation = useUpdateIncident();

  const updateIncident = (id: number, data: import("@workspace/api-client-react").IncidentUpdate) => {
    updateIncidentMutation.mutate({ id, data }, {
      onSuccess: () => toast.success("Updated"),
      onError: () => toast.error("Failed"),
      onSettled: () => { refetchIncidents(); refetchStats(); },
    });
  };

  return (
    <div className="flex min-h-screen" style={{ background: "#F0F2F8" }}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <h1 className="text-xl font-black text-[#0A1628] mb-5">Incident Management</h1>

        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-5">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <ShieldAlert size={18} className="mx-auto mb-1" style={{ color: NAVY }} />
              <p className="text-2xl font-black" style={{ color: NAVY }}>{stats.total}</p>
              <p className="text-[10px] text-gray-400">Total Incidents</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-red-100 text-center">
              <AlertTriangle size={18} className="mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-black text-red-600">{stats.open}</p>
              <p className="text-[10px] text-gray-400">Open</p>
            </div>
            {stats.typeDist && Object.entries(stats.typeDist).slice(0, 4).map(([type, count]: [string, number]) => (
              <div key={type} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                <p className="text-lg font-black" style={{ color: TYPE_COLORS[type] || "#6B7280" }}>{count}</p>
                <p className="text-[9px] text-gray-400 capitalize">{type.replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-[#0A1628]">All Incidents</h3>
          </div>
          {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : !incidents || incidents.length === 0 ? (
            <div className="p-8 text-center text-gray-400"><ShieldAlert size={32} className="mx-auto mb-2 opacity-30" /><p className="font-medium">No incidents</p></div>
          ) : (
            <div className="divide-y divide-gray-50">
              {(Array.isArray(incidents) ? incidents : []).map((inc: Required<import("@workspace/api-client-react").Incident>) => (
                <motion.div key={inc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${SEVERITY_COLORS[inc.severity] || "#9CA3AF"}20`, color: SEVERITY_COLORS[inc.severity] || "#9CA3AF" }}>
                          {inc.severity}
                        </span>
                        <span className="text-sm font-semibold text-[#0A1628] capitalize">{inc.title || inc.type?.replace(/_/g, " ")}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{inc.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <select value={inc.status} onChange={e => updateIncident(inc.id, { status: e.target.value })}
                        className="text-[10px] font-bold rounded-lg px-2 py-1 border" style={{ borderColor: inc.status === "open" ? "#EF4444" : inc.status === "in_progress" ? "#F59E0B" : "#10B981", color: inc.status === "open" ? "#EF4444" : inc.status === "in_progress" ? "#F59E0B" : "#10B981" }}>
                        <option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                  {inc.assignedAdmin && <p className="text-[10px] text-gray-400 mt-1">Assigned: {inc.assignedAdmin}</p>}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
