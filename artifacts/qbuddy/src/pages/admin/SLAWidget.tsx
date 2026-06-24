import { motion } from "framer-motion";
import { useGetSlaMonitoring } from "@workspace/api-client-react";
import { Timer } from "lucide-react";
import { NAVY, GOLD } from "@/lib/theme";

export default function SLAWidget() {
  const { data: sla } = useGetSlaMonitoring({ query: { queryKey: ["slaMonitoring"], refetchInterval: 30000 } });

  if (!sla) return null;

  const gradeColors: Record<string, string> = {
    excellent: "#16A34A", good: "#3B82F6", average: "#F59E0B", poor: "#EF4444",
  };
  const total = (sla.gradeDist?.excellent ?? 0) + (sla.gradeDist?.good ?? 0) + (sla.gradeDist?.average ?? 0) + (sla.gradeDist?.poor ?? 0) || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.64 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5"
      style={{ borderLeft: "4px solid #3B82F6" }}
    >
      <h3 className="font-black text-[#0A1628] text-sm mb-3 flex items-center gap-2">
        <Timer size={14} className="text-blue-500" /> SLA Monitoring
      </h3>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {(Object.entries(sla.gradeDist || {}) as [string, number][]).map(([grade, count]) => (
          <div key={grade} className="rounded-xl p-3 text-center" style={{ background: `${gradeColors[grade] || "#6B7280"}10` }}>
            <p className="text-lg font-black" style={{ color: gradeColors[grade] }}>{count}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: gradeColors[grade] }}>{grade}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1">Avg Acceptance</p>
          <p className="text-lg font-black" style={{ color: NAVY }}>
            {(sla.avgAcceptanceTime ?? 0) > 60 ? `${Math.round((sla.avgAcceptanceTime ?? 0) / 60)}m ${(sla.avgAcceptanceTime ?? 0) % 60}s` : `${sla.avgAcceptanceTime || 0}s`}
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1">Avg Completion</p>
          <p className="text-lg font-black" style={{ color: GOLD }}>
            {sla.avgCompletionTime || 0}<span className="text-sm font-medium text-gray-400"> min</span>
          </p>
        </div>
      </div>

      <div className="mt-3 flex h-2 rounded-full overflow-hidden bg-gray-100">
        {(Object.entries(sla.gradeDist || {}) as [string, number][]).map(([grade, count]) => (
          total > 0 && Number(count) > 0 ? (
            <motion.div
              key={grade}
              initial={{ width: 0 }}
              animate={{ width: `${(Number(count) / total) * 100}%` }}
              style={{ background: gradeColors[grade] || "#6B7280" }}
            />
          ) : null
        ))}
      </div>
      <p className="text-[10px] text-gray-400 mt-1.5">{total} tasks graded · SLA refreshes every 30s</p>
    </motion.div>
  );
}
