import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import AdminSidebar from "@/components/AdminSidebar";
import { useListTrainingModules, useGetRunnerTrainingProgress, useSeedDefaultTrainingModules, useCompleteTrainingModule } from "@workspace/api-client-react";
import { BookOpen, CheckCircle2, RefreshCw, GraduationCap } from "lucide-react";
import { NAVY, GOLD } from "@/lib/theme";

export default function AdminTraining() {
  const [selectedRunner, setSelectedRunner] = useState<number | null>(null);
  const { data: modules, isLoading: loadingModules, refetch: refetchModules } = useListTrainingModules({ query: { queryKey: ["trainingModules"], refetchInterval: 10000 } });
  const { data: progress, refetch: refetchProgress } = useGetRunnerTrainingProgress(selectedRunner ?? 0, { query: { queryKey: ["trainingProgress", selectedRunner ?? 0], enabled: !!selectedRunner, refetchInterval: 10000 } });
  const loading = loadingModules;

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

  return (
    <div className="flex min-h-screen" style={{ background: "#F0F2F8" }}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-black text-[#0A1628]">Training Center</h1>
          <div className="flex gap-2">
            <button onClick={seedModules} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold bg-white">
              <RefreshCw size={14} /> Seed Modules
            </button>
            <input
              type="number"
              placeholder="Runner ID"
              value={selectedRunner || ""}
              onChange={e => { const v = Number(e.target.value); if (!isNaN(v)) setSelectedRunner(v); }}
              className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Training Modules */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-black text-[#0A1628] text-sm mb-3 flex items-center gap-2">
              <BookOpen size={14} className="text-blue-500" /> Training Modules
            </h3>
            {loading ? (
              <div className="text-center text-gray-400 py-8">Loading...</div>
            ) : !modules || modules.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <GraduationCap size={40} className="mx-auto mb-2 opacity-30" />
                <p className="font-medium">No modules yet</p>
                <p className="text-xs mt-1">Click "Seed Modules" to create default training</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(Array.isArray(modules) ? modules : []).map((m, i) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: NAVY }}>{i + 1}</div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#0A1628]">{m.topic}</p>
                      {m.description && <p className="text-[10px] text-gray-400 mt-0.5">{m.description}</p>}
                    </div>
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
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Runner Progress */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-black text-[#0A1628] text-sm mb-3 flex items-center gap-2">
              <GraduationCap size={14} className="text-emerald-500" /> Runner Readiness
            </h3>
            {!selectedRunner ? (
              <div className="text-center text-gray-400 py-8">
                <p className="font-medium">Enter a Runner ID</p>
                <p className="text-xs mt-1">to view their training progress and readiness score</p>
              </div>
            ) : !progress ? (
              <div className="text-center text-gray-400 py-8">Loading...</div>
            ) : (
              <>
                <div className="text-center mb-4">
                  <div className="text-4xl font-black" style={{ color: (progress.readiness ?? 0) >= 80 ? "#059669" : (progress.readiness ?? 0) >= 50 ? "#F59E0B" : "#EF4444" }}>
                    {progress.readiness ?? 0}%
                  </div>
                  <p className="text-xs text-gray-400">Readiness Score</p>
                  <div className="mt-2 text-sm text-gray-600">
                    {progress.completedCount} / {progress.totalModules} modules completed
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${progress.readiness ?? 0}%` }}
                    className="h-full rounded-full"
                    style={{ background: (progress.readiness ?? 0) >= 80 ? "#059669" : (progress.readiness ?? 0) >= 50 ? "#F59E0B" : "#EF4444", width: `${progress.readiness ?? 0}%` }}
                  />
                </div>
                <div className="mt-4 space-y-1.5">
                  {progress.progress?.map((p: import("@workspace/api-client-react").TrainingProgressProgressItem) => (
                    <div key={p.id} className="flex items-center gap-2 text-xs">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${p.completed ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                        {p.completed ? <CheckCircle2 size={12} /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                      </div>
                      <span className="flex-1 text-gray-600">{p.topic}</span>
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
