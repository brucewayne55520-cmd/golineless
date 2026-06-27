import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import AdminSidebar from "@/components/AdminSidebar";
import { useListTrainingModules, useGetRunnerTrainingProgress, useSeedDefaultTrainingModules, useCompleteTrainingModule } from "@workspace/api-client-react";
import { BookOpen, CheckCircle2, RefreshCw, GraduationCap, Plus, Trash2, Edit2, Save, X, Search } from "lucide-react";
import { NAVY, GOLD_GRAD } from "@/lib/theme";
import { customFetch } from "@workspace/api-client-react";

export default function AdminTraining() {
  const [selectedRunner, setSelectedRunner] = useState<number | null>(null);
  const [runnerSearch, setRunnerSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingModule, setEditingModule] = useState<number | null>(null);
  const [newModule, setNewModule] = useState({ topic: "", description: "", order: 0, isRequired: true });

  const { data: modules, isLoading: loadingModules, refetch: refetchModules } = useListTrainingModules();
  const { data: progress, refetch: refetchProgress } = useGetRunnerTrainingProgress(selectedRunner ?? 0, {
    query: { queryKey: ["trainingProgress", selectedRunner ?? 0], enabled: !!selectedRunner }
  });

  const loading = loadingModules;
  const moduleList = Array.isArray(modules) ? modules : [];

  const seedModulesMutation = useSeedDefaultTrainingModules();
  const completeTrainingMutation = useCompleteTrainingModule();

  const seedModules = () => {
    seedModulesMutation.mutate(undefined as unknown as void, {
      onSuccess: () => toast.success("Training modules seeded!"),
      onError: () => toast.error("Failed to seed"),
      onSettled: () => refetchModules(),
    });
  };

  const markComplete = (moduleId: number | null | undefined) => {
    if (!selectedRunner || moduleId == null) return;
    completeTrainingMutation.mutate({ data: { runnerId: selectedRunner, moduleId, score: 100 } as import("@workspace/api-client-react").TrainingCompleteInput }, {
      onSuccess: () => toast.success("Module complete!"),
      onError: () => toast.error("Failed"),
      onSettled: () => refetchProgress(),
    });
  };

  const createModule = async () => {
    if (!newModule.topic.trim()) { toast.error("Topic is required"); return; }
    try {
      await customFetch("/api/admin/training/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("golineless_admin_token") || ""}` },
        body: JSON.stringify(newModule),
      });
      toast.success("Module created!");
      setNewModule({ topic: "", description: "", order: moduleList.length, isRequired: true });
      setShowCreateForm(false);
      refetchModules();
    } catch { toast.error("Failed to create module"); }
  };

  const updateModule = async (id: number) => {
    try {
      const topicEl = document.getElementById(`topic-${id}`) as HTMLInputElement | null;
      const descEl = document.getElementById(`desc-${id}`) as HTMLInputElement | null;
      const updates = {
        topic: topicEl?.value ?? newModule.topic,
        description: descEl?.value ?? newModule.description,
      };
      await customFetch(`/api/admin/training/modules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("golineless_admin_token") || ""}` },
        body: JSON.stringify(updates),
      });
      toast.success("Module updated!");
      setEditingModule(null);
      refetchModules();
    } catch { toast.error("Failed to update module"); }
  };

  const deleteModule = async (id: number) => {
    if (!window.confirm("Delete this training module? This cannot be undone.")) return;
    try {
      await customFetch(`/api/admin/training/modules/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("golineless_admin_token") || ""}` },
      });
      toast.success("Module deleted!");
      refetchModules();
    } catch { toast.error("Failed to delete module"); }
  };

  return (
    <div className="flex min-h-screen gl-surface dark:bg-[#0A0E1A]">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-[#241100] dark:text-[#fff2e5]">Training Center</h1>
          <div className="flex gap-2">
            <button onClick={seedModules} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E5E0D8] dark:border-[#374151] text-xs font-semibold bg-white dark:bg-[#1F2937] hover:bg-[#FFF9F2] dark:hover:bg-[#111827] gl-transition">
              <RefreshCw size={14} /> Seed Modules
            </button>
            <button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#241100] gl-transition" style={{ background: GOLD_GRAD }}>
              <Plus size={14} /> Create Module
            </button>
          </div>
        </div>

        {/* Create Module Form */}
        {showCreateForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-[#111827] rounded-2xl p-5 gl-shadow-md border border-[#EEF2FF] dark:border-[#4338CA] mb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#241100] dark:text-[#fff2e5] text-sm">New Training Module</h3>
              <button onClick={() => setShowCreateForm(false)} className="text-[#9CA3AF] hover:text-[#6B7280] gl-transition"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-[#6B7280] mb-1 block">Topic *</label>
                <input value={newModule.topic} onChange={e => setNewModule(p => ({ ...p, topic: e.target.value }))} className="w-full border border-[#E5E0D8] dark:border-[#374151] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#241100] bg-white dark:bg-[#1F2937] dark:text-[#fff2e5] gl-transition" placeholder="e.g. Hospital Protocol" />
              </div>
              <div>
                <label className="text-xs text-[#6B7280] mb-1 block">Order</label>
                <input type="number" value={newModule.order} onChange={e => setNewModule(p => ({ ...p, order: Number(e.target.value) }))} className="w-full border border-[#E5E0D8] dark:border-[#374151] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#241100] bg-white dark:bg-[#1F2937] dark:text-[#fff2e5] gl-transition" />
              </div>
            </div>
            <div className="mb-3">
              <label className="text-xs text-[#6B7280] mb-1 block">Description</label>
              <input value={newModule.description} onChange={e => setNewModule(p => ({ ...p, description: e.target.value }))} className="w-full border border-[#E5E0D8] dark:border-[#374151] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#241100] bg-white dark:bg-[#1F2937] dark:text-[#fff2e5] gl-transition" placeholder="Brief description of the module" />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <input type="checkbox" checked={newModule.isRequired} onChange={e => setNewModule(p => ({ ...p, isRequired: e.target.checked }))} className="rounded" />
              <label className="text-xs text-[#4B5563]">Required module</label>
            </div>
            <button onClick={createModule} className="px-4 py-2 rounded-xl text-[#241100] text-sm font-semibold gl-transition" style={{ background: GOLD_GRAD }}>Create Module</button>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Training Modules */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 gl-shadow-md border border-[#E5E0D8] dark:border-[#1F2937]">
            <h3 className="font-bold text-[#241100] dark:text-[#fff2e5] text-sm mb-3 flex items-center gap-2">
              <BookOpen size={14} className="text-blue-500" /> Training Modules ({moduleList.length})
            </h3>
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-[#E5E0D8] rounded-xl animate-pulse" />)}
              </div>
            ) : moduleList.length === 0 ? (
              <div className="text-center text-[#9CA3AF] py-8">
                <GraduationCap size={40} className="mx-auto mb-2 opacity-30" />
                <p className="font-medium">No modules yet</p>
                <p className="text-xs mt-1">Click "Seed Modules" to create defaults or "Create Module" to add custom ones</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {moduleList.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#FFF9F2] dark:bg-[#1F2937] group">
                    {editingModule === m.id ? (
                      <div className="flex-1 space-y-2">
                        <input defaultValue={m.topic ?? ""} id={`topic-${m.id}`} className="w-full border border-[#E5E0D8] dark:border-[#374151] rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#241100] bg-white dark:bg-[#1F2937] dark:text-[#fff2e5] gl-transition" />
                        <input defaultValue={m.description ?? ""} id={`desc-${m.id}`} className="w-full border border-[#E5E0D8] dark:border-[#374151] rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#241100] bg-white dark:bg-[#1F2937] dark:text-[#fff2e5] gl-transition" placeholder="Description" />
                        <div className="flex gap-1">
                          <button onClick={() => m.id != null && updateModule(m.id)} className="px-2 py-1 rounded-lg bg-green-500 text-white text-xs font-semibold flex items-center gap-1"><Save size={10} /> Save</button>
                          <button onClick={() => setEditingModule(null)} className="px-2 py-1 rounded-lg bg-[#E5E0D8] text-[#4B5563] text-xs font-semibold">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: NAVY }}>{m.order || i + 1}</div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-[#241100] dark:text-[#fff2e5]">{m.topic}</p>
                          {m.description &&                          <p className="text-[10px] text-[#9CA3AF] mt-0.5">{m.description ?? ""}</p>}
                        </div>
                        {m.isRequired && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 font-bold">Required</span>}
                        {selectedRunner && progress && (
                          <button
                            onClick={() => markComplete(m.id)}
                            disabled={progress.progress?.find((p: import("@workspace/api-client-react").TrainingProgressProgressItem) => p.id === m.id)?.completed}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold"
                            style={progress.progress?.find((p: import("@workspace/api-client-react").TrainingProgressProgressItem) => p.id === m.id)?.completed ? { background: "#D1FAE5", color: "#059669" } : { background: NAVY, color: "white" }}
                          >
                            {progress.progress?.find((p: import("@workspace/api-client-react").TrainingProgressProgressItem) => p.id === m.id)?.completed ? "✓ Done" : "Complete"}
                          </button>
                        )}
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { if (m.id != null) { setEditingModule(m.id); setNewModule({ topic: m.topic ?? "", description: m.description ?? "", order: m.order ?? 0, isRequired: m.isRequired ?? true }); } }} className="p-1 rounded hover:bg-[#E5E0D8]"><Edit2 size={12} className="text-[#9CA3AF]" /></button>
                          {m.id != null && <button onClick={() => deleteModule(m.id!)} className="p-1 rounded hover:bg-[#FEF2F2]"><Trash2 size={12} className="text-[#DC2626]" /></button>}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Runner Progress */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 gl-shadow-md border border-[#E5E0D8] dark:border-[#1F2937]">
            <h3 className="font-bold text-[#241100] dark:text-[#fff2e5] text-sm mb-3 flex items-center gap-2">
              <GraduationCap size={14} className="text-emerald-500" /> Runner Readiness
            </h3>
            <div className="mb-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="number"
                  placeholder="Enter Runner ID"
                  value={selectedRunner != null ? String(selectedRunner) : runnerSearch}
                  onChange={e => {
                    const v = e.target.value;
                    setRunnerSearch(v);
                    const num = Number(v);
                    if (!isNaN(num) && num > 0) setSelectedRunner(num);
                  }}
                  className="w-full pl-8 pr-4 py-2 rounded-xl border border-[#E5E0D8] dark:border-[#374151] text-sm focus:outline-none focus:ring-2 focus:ring-[#241100] bg-white dark:bg-[#1F2937] dark:text-[#fff2e5] gl-transition"
                />
              </div>
            </div>
            {!selectedRunner ? (
              <div className="text-center text-[#9CA3AF] py-8">
                <p className="font-medium">Enter a Runner ID</p>
                <p className="text-xs mt-1">to view their training progress and readiness score</p>
              </div>
            ) : !progress ? (
              <div className="text-center text-[#9CA3AF] py-8">Loading...</div>
            ) : (
              <>
                <div className="text-center mb-4">
                  <div className="text-4xl font-black" style={{ color: (progress.readiness ?? 0) >= 80 ? "#059669" : (progress.readiness ?? 0) >= 50 ? "#F59E0B" : "#EF4444" }}>
                    {progress.readiness ?? 0}%
                  </div>
                  <p className="text-xs text-[#9CA3AF]">Readiness Score</p>
                  <div className="mt-2 text-sm text-[#4B5563]">
                    {progress.completedCount} / {progress.totalModules} modules completed
                  </div>
                </div>
                <div className="w-full bg-[#F3F4F6] rounded-full h-2.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${progress.readiness ?? 0}%` }}
                    className="h-full rounded-full"
                    style={{ background: (progress.readiness ?? 0) >= 80 ? "#059669" : (progress.readiness ?? 0) >= 50 ? "#F59E0B" : "#EF4444", width: `${progress.readiness ?? 0}%` }}
                  />
                </div>
                <div className="mt-4 space-y-1.5">
                  {progress.progress?.map((p: import("@workspace/api-client-react").TrainingProgressProgressItem) => (
                    <div key={p.id} className="flex items-center gap-2 text-xs">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${p.completed ? "bg-[#ECFDF5] text-[#059669]" : "bg-[#F3F4F6] text-[#9CA3AF]"}`}>
                        {p.completed ? <CheckCircle2 size={12} /> : <div className="w-2 h-2 rounded-full bg-[#D1D5DB]" />}
                      </div>
                      <span className="flex-1 text-[#4B5563]">{p.topic}</span>
                      {p.score != null && <span className="text-[#9CA3AF]">{p.score}%</span>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
