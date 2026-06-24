import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import AdminSidebar from "@/components/AdminSidebar";
import { useListRecruitments, useGetRecruitmentFunnel, useCreateRecruit, useUpdateRecruit } from "@workspace/api-client-react";
import { Plus, UserPlus, Phone, MapPin, Bike } from "lucide-react";
import { NAVY } from "@/lib/theme";
const STAGE_COLORS: Record<string, string> = {
  applied: "#9CA3AF", interview_scheduled: "#3B82F6", documents_submitted: "#8B5CF6",
  training_pending: "#F59E0B", training_complete: "#10B981", pilot_active: "#059669", suspended: "#EF4444",
};
const STAGE_LABELS: Record<string, string> = {
  applied: "Applied", interview_scheduled: "Interview Scheduled", documents_submitted: "Documents Submitted",
  training_pending: "Training Pending", training_complete: "Training Complete", pilot_active: "Pilot Active", suspended: "Suspended",
};

export default function AdminRecruitment() {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", area: "", vehicleType: "bicycle", languages: "", availability: "full_time" });
  const { data: recruits, isLoading: loadingRecruits, refetch: refetchRecruits } = useListRecruitments(undefined, { query: { queryKey: ["recruitments"], refetchInterval: 10000 } });
  const { data: funnelData, refetch: refetchFunnel } = useGetRecruitmentFunnel({ query: { queryKey: ["recruitmentFunnel"], refetchInterval: 10000 } });
  const loading = loadingRecruits;
  const funnel = funnelData?.funnel || [];

  const createRecruitMutation = useCreateRecruit();
  const updateRecruitMutation = useUpdateRecruit();

  const addRecruit = () => {
    if (!form.name || !form.phone || !form.area) { toast.error("Name, phone, and area required"); return; }
    createRecruitMutation.mutate({ data: { ...form, languages: form.languages.split(",").map(l => l.trim()) } as import("@workspace/api-client-react").RecruitInput }, {
      onSuccess: () => {
        toast.success("Recruit added");
        setShowAdd(false);
        setForm({ name: "", phone: "", area: "", vehicleType: "bicycle", languages: "", availability: "full_time" });
      },
      onError: () => toast.error("Failed to add"),
      onSettled: () => { refetchRecruits(); refetchFunnel(); },
    });
  };

  const updateStage = (id: number, stage: string) => {
    updateRecruitMutation.mutate({ id, data: { stage } as import("@workspace/api-client-react").RecruitUpdate }, {
      onSuccess: () => toast.success(`Updated to ${STAGE_LABELS[stage]}`),
      onError: () => toast.error("Failed to update"),
      onSettled: () => { refetchRecruits(); refetchFunnel(); },
    });
  };

  const total = funnel.reduce((s: number, f: Required<import("@workspace/api-client-react").RecruitmentFunnelFunnelItem>) => s + f.count, 0);

  return (
    <div className="flex min-h-screen" style={{ background: "#F0F2F8" }}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-black text-[#0A1628]">Recruitment Pipeline</h1>
            <p className="text-gray-400 text-xs mt-0.5">{total} total recruits</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm" style={{ background: `linear-gradient(135deg, ${NAVY}, #1D3D7C)` }}>
            <Plus size={16} /> Add Recruit
          </button>
        </div>

        {/* Funnel */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5">
          <h3 className="font-black text-[#0A1628] text-sm mb-3">Recruitment Funnel</h3>
          <div className="space-y-2">
            {funnel.map((f: Required<import("@workspace/api-client-react").RecruitmentFunnelFunnelItem>) => (
              <div key={f.stage} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-500 w-36 truncate">{STAGE_LABELS[f.stage]}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${total > 0 ? (f.count / total) * 100 : 0}%` }}
                    className="h-full rounded-full transition-all"
                    style={{ background: STAGE_COLORS[f.stage] || "#9CA3AF", width: `${total > 0 ? (f.count / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-600 w-8 text-right">{f.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recruit list */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-[#0A1628]">All Recruits</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : !recruits || recruits.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <UserPlus size={32} className="mx-auto mb-2 opacity-30" />
              <p className="font-medium">No recruits yet</p>
              <p className="text-xs mt-1">Add your first recruit to start the pipeline</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {(Array.isArray(recruits) ? recruits : []).map((r: Required<import("@workspace/api-client-react").Recruit>) => (
                <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: `linear-gradient(135deg, ${NAVY}, #1D3D7C)` }}>
                    {r.name?.[0] || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#0A1628] text-sm truncate">{r.name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                      <span className="flex items-center gap-1"><Phone size={10} />{r.phone}</span>
                      <span className="flex items-center gap-1"><MapPin size={10} />{r.area}</span>
                      <span className="flex items-center gap-1"><Bike size={10} />{r.vehicleType}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={r.stage}
                      onChange={e => updateStage(r.id, e.target.value)}
                      className="text-xs font-semibold rounded-lg px-2.5 py-1.5 border"
                      style={{ borderColor: STAGE_COLORS[r.stage] || "#E5E7EB", color: STAGE_COLORS[r.stage] }}
                    >
                      {Object.entries(STAGE_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Add modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAdd(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="font-black text-[#0A1628] mb-4">Add New Recruit</h3>
              <div className="space-y-3">
                {["name", "phone", "area"].map(f => (
                  <input key={f} value={form[f as keyof typeof form]} onChange={e => setForm({ ...form, [f]: e.target.value })}
                    placeholder={f.charAt(0).toUpperCase() + f.slice(1)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
                ))}
                <select value={form.vehicleType} onChange={e => setForm({ ...form, vehicleType: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                  <option value="bicycle">Bicycle</option><option value="scooter">Scooter</option><option value="motorcycle">Motorcycle</option><option value="car">Car</option>
                </select>
                <input value={form.languages} onChange={e => setForm({ ...form, languages: e.target.value })}
                  placeholder="Languages (comma-separated)" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
                <select value={form.availability} onChange={e => setForm({ ...form, availability: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                  <option value="full_time">Full Time</option><option value="part_time">Part Time</option><option value="weekends">Weekends Only</option>
                </select>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold">Cancel</button>
                <button onClick={addRecruit} className="flex-1 py-3 rounded-xl text-white text-sm font-bold" style={{ background: `linear-gradient(135deg, ${NAVY}, #1D3D7C)` }}>Add Recruit</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
