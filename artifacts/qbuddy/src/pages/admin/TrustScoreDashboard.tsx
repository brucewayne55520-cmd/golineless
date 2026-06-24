import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { NAVY } from "@/lib/theme";

export interface TrustMetricsItem {
  id?: number | null;
  name?: string | null;
  trustScore?: number | null;
  trustBadge?: string | null;
  tasksCompleted?: number | null;
}

export interface TrustScoreData {
  avgTrustScore?: number | null;
  riskComrades?: number | null;
  topComrades?: TrustMetricsItem[] | null;
  lowestTrust?: TrustMetricsItem[] | null;
}

interface Props {
  trustMetrics: TrustScoreData;
}

export default function TrustScoreDashboard({ trustMetrics }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.57 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-[#0A1628] text-sm">Comrade Trust Scores</h3>
        <span className="text-gray-400 text-xs">
          Avg: <strong className="font-black" style={{ color: NAVY }}>{trustMetrics.avgTrustScore}</strong>
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
        {(trustMetrics.riskComrades ?? 0) > 0 && (
          <div className="bg-red-50 rounded-xl p-3 flex items-center gap-2 border border-red-100">
            <AlertTriangle size={14} className="text-red-500" />
            <span className="text-red-700 text-sm font-bold">{trustMetrics.riskComrades} Risk Comrades (score &lt; 60)</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] text-gray-400 font-semibold uppercase mb-2">Top Comrades</p>
          <div className="space-y-1">
            {trustMetrics.topComrades?.map((c) => (
              <div key={c.id} className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
                <div className={`w-1.5 h-1.5 rounded-full ${c.trustBadge === "elite" ? "bg-yellow-400" : "bg-green-400"}`} />
                <span className="text-xs font-semibold text-gray-700 flex-1">{c.name}</span>
                <span className="text-xs font-black text-green-600">{c.trustScore}</span>
                <span className="text-[9px] text-gray-400">{c.tasksCompleted} tasks</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 font-semibold uppercase mb-2">Lowest Trust</p>
          <div className="space-y-1">
            {trustMetrics.lowestTrust?.map((c) => (
              <div key={c.id} className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span className="text-xs font-semibold text-gray-700 flex-1">{c.name}</span>
                <span className="text-xs font-black text-red-500">{c.trustScore}</span>
                <span className="text-[9px] text-gray-400">{c.tasksCompleted} tasks</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
