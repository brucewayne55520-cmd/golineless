import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import AdminSidebar from "@/components/AdminSidebar";
import { useListIncidents, useGetIncidentStats, useUpdateIncident } from "@workspace/api-client-react";
import { ShieldAlert, AlertTriangle, Plus, X } from "lucide-react";
import { NAVY } from "@/lib/theme";
import { customFetch } from "@workspace/api-client-react";
const SEVERITY_COLORS: Record<string, string> = { low: "#9CA3AF", medium: "#F59E0B", high: "#EF4444", critical: "#DC2626" };
const TYPE_COLORS: Record<string, string> = { customer_complaint: "#3B82F6", runner_misconduct: "#EF4444", gps_failure: "#F59E0B", proof_failure: "#8B5CF6", payment_issue: "#10B981", fraud_alert: "#DC2626" };

const INCIDENT_TYPES = ["customer_complaint", "runner_misconduct", "gps_failure", "proof_failure", "payment_issue", "fraud_alert"];
const SEVERITY_LEVELS = ["low", "medium", "high", "critical"];

export default function AdminIncidents() {
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ type: "customer_complaint", title: "", description: "", severity: "medium" as string });
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

  const handleCreate = async () => {
    if (!createForm.title.trim() || !createForm.description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    try {
      await customFetch("/api/admin/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      toast.success("Incident created");
      setShowCreate(false);
      setCreateForm({ type: "customer_complaint", title: "", description: "", severity: "medium" });
      refetchIncidents();
      refetchStats();
    } catch {
      toast.error("Failed to create incident");
    }
  };

  return (
    <div className="flex min-h-screen gl-surface dark:bg-[#0A0E1A]">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-[#241100] dark:text-[#fff2e5]">Incident Management</h1>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold gl-transition"
            style={{ background: "linear-gradient(135deg, #E85D4A, #F08C7E)" }}
          >
            <Plus size={14} /> Create Incident
          </button>
        </div>

        {/* M13: Create Incident Form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 bg-white dark:bg-[#111827] rounded-2xl p-5 gl-shadow-md border border-[#E5E0D8] dark:border-[#1F2937]"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#241100] dark:text-[#fff2e5]">New Incident</h3>
                <button onClick={() => setShowCreate(false)} className="text-[#9CA3AF] hover:text-[#6B7280] gl-transition"><X size={18} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-medium text-[#6B7280] mb-1 block">Type</label>
                  <select value={createForm.type} onChange={e => setCreateForm(prev => ({ ...prev, type: e.target.value }))} className="w-full border border-[#E5E0D8] dark:border-[#374151] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#241100] bg-white dark:bg-[#1F2937] dark:text-[#fff2e5] gl-transition">
                    {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6B7280] mb-1 block">Severity</label>
                  <select value={createForm.severity} onChange={e => setCreateForm(prev => ({ ...prev, severity: e.target.value }))} className="w-full border border-[#E5E0D8] dark:border-[#374151] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#241100] bg-white dark:bg-[#1F2937] dark:text-[#fff2e5] gl-transition">
                    {SEVERITY_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="text-xs font-medium text-[#6B7280] mb-1 block">Title</label>
                <input value={createForm.title} onChange={e => setCreateForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Brief incident title" className="w-full border border-[#E5E0D8] dark:border-[#374151] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#241100] bg-white dark:bg-[#1F2937] dark:text-[#fff2e5] gl-transition" />
              </div>
              <div className="mb-4">
                <label className="text-xs font-medium text-[#6B7280] mb-1 block">Description</label>
                <textarea value={createForm.description} onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Detailed description of the incident..." rows={3} className="w-full border border-[#E5E0D8] dark:border-[#374151] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#241100] resize-none bg-white dark:bg-[#1F2937] dark:text-[#fff2e5] gl-transition" />
              </div>
              <button onClick={handleCreate} className="px-6 py-2 rounded-xl text-white text-sm font-semibold" style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)" }}>
                Create Incident
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-5">
            <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 gl-shadow-md border border-[#E5E0D8] dark:border-[#1F2937] text-center gl-transition">
              <ShieldAlert size={18} className="mx-auto mb-1" style={{ color: NAVY }} />
              <p className="text-2xl font-black" style={{ color: NAVY }}>{stats.total}</p>
              <p className="text-[10px] text-[#9CA3AF]">Total Incidents</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-red-100 text-center">
              <AlertTriangle size={18} className="mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-black text-red-600">{stats.open}</p>
              <p className="text-[10px] text-[#9CA3AF]">Open</p>
            </div>
            {stats.typeDist && Object.entries(stats.typeDist).slice(0, 4).map(([type, count]: [string, number]) => (
              <div key={type} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                <p className="text-lg font-black" style={{ color: TYPE_COLORS[type] || "#6B7280" }}>{count}</p>
                <p className="text-[9px] text-gray-400 capitalize">{type.replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white dark:bg-[#111827] rounded-2xl gl-shadow-md border border-[#E5E0D8] dark:border-[#1F2937] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E0D8] dark:border-[#1F2937]">
            <h3 className="font-bold text-[#241100] dark:text-[#fff2e5]">All Incidents</h3>
          </div>
          {loading ? <div className="p-8 text-center text-[#9CA3AF]">Loading...</div> : !incidents || incidents.length === 0 ? (
            <div className="p-8 text-center text-[#9CA3AF]"><ShieldAlert size={32} className="mx-auto mb-2 opacity-30" /><p className="font-medium">No incidents</p></div>
          ) : (
            <div className="divide-y divide-[#F3F4F6] dark:divide-[#1F2937]">
              {(Array.isArray(incidents) ? incidents : []).map((inc: Required<import("@workspace/api-client-react").Incident>) => (
                <motion.div key={inc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 py-4 hover:bg-[#FFF9F2] dark:hover:bg-[#1F2937] gl-transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${SEVERITY_COLORS[inc.severity] || "#9CA3AF"}20`, color: SEVERITY_COLORS[inc.severity] || "#9CA3AF" }}>
                          {inc.severity}
                        </span>
                        <span className="text-sm font-semibold text-[#241100] dark:text-[#fff2e5] capitalize">{inc.title || inc.type?.replace(/_/g, " ")}</span>
                      </div>
                      <p className="text-xs text-[#9CA3AF] mt-1 line-clamp-2">{inc.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <select value={inc.status} onChange={e => updateIncident(inc.id, { status: e.target.value })}
                        className="text-[10px] font-bold rounded-lg px-2 py-1 border" style={{ borderColor: inc.status === "open" ? "#EF4444" : inc.status === "in_progress" ? "#F59E0B" : "#10B981", color: inc.status === "open" ? "#EF4444" : inc.status === "in_progress" ? "#F59E0B" : "#10B981" }}>
                        <option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                  {inc.assignedAdmin && <p className="text-[10px] text-[#9CA3AF] mt-1">Assigned: {inc.assignedAdmin}</p>}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
