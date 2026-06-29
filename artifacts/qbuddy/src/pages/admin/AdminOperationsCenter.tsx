
import { motion } from "framer-motion";
import AdminSidebar from "@/components/AdminSidebar";
import { useGetOperationsCenter } from "@workspace/api-client-react";
import { Users, Wifi, ShieldCheck, CheckCircle2, Zap, XCircle, MapPin, Activity } from "lucide-react";
import { DARK, BLUE } from "@/lib/theme";

export default function AdminOperationsCenter() {
  const { data, isLoading } = useGetOperationsCenter({ query: { queryKey: ["operationsCenter"], refetchInterval: 10000 } });

  return (
    <div className="flex min-h-screen gl-surface dark:bg-[#0A0E1A]">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">Comrade Operations Center</h1>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white dark:bg-[#111827] rounded-2xl animate-pulse gl-shadow-md border border-gray-200 dark:border-[#1F2937]" />)}
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              {[
                { label: "Total Comrades", val: data?.total ?? 0, Icon: Users, color: DARK, bg: "#EEF2FA" },
                { label: "Online Now", val: data?.online ?? 0, Icon: Wifi, color: "#16A34A", bg: "#F0FDF4" },
                { label: "Verified (KYC)", val: data?.verified ?? 0, Icon: ShieldCheck, color: "#3B82F6", bg: "#EFF6FF" },
                { label: "Dispatch Ready", val: data?.dispatchReady ?? 0, Icon: CheckCircle2, color: "#059669", bg: "#ECFDF5" },
                { label: "Training Complete", val: data?.trainingComplete ?? 0, Icon: Zap, color: "#8B5CF6", bg: "#F5F3FF" },
                { label: "Pilot Active", val: data?.pilotActive ?? 0, Icon: Activity, color: BLUE, bg: "#EFF6FF" },
                { label: "Suspended", val: data?.suspended ?? 0, Icon: XCircle, color: "#DC2626", bg: "#FEF2F2" },
              ].map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white dark:bg-[#111827] rounded-2xl p-4 gl-shadow-md border border-gray-200 dark:border-[#1F2937] gl-transition"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${card.color}15` }}>
                      <card.Icon size={14} style={{ color: card.color }} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: card.color }}>{card.val}</p>
                  <p className="text-[10px] font-medium text-gray-500 mt-0.5">{card.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Area-wise distribution */}
            <div className="bg-white dark:bg-[#111827] rounded-2xl gl-shadow-md border border-gray-200 dark:border-[#1F2937] overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 dark:border-[#1F2937] flex items-center justify-between">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2">
                  <MapPin size={14} /> Area-wise Distribution
                </h3>
                <span className="text-xs text-gray-400">{data?.areaDist?.length ?? 0} areas</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-[#1F2937]">
                {(data?.areaDist ?? []).map((area: Required<import("@workspace/api-client-react").OperationsCenterAreaDistItem>, i: number) => (
                  <motion.div
                    key={area.area}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-[#1F2937] gl-transition"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: "#E8EDF5", color: DARK }}>
                      {area.area?.[0] ?? "?"}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{area.area}</p>
                      <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-0.5">
                        <span>{area.total} total</span>
                        <span className="text-green-600">{area.online} online</span>
                        <span className="text-blue-600">{area.onTask} on task</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-green-500" style={{ width: `${area.total > 0 ? (area.online / area.total) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
