import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { NAVY, GOLD } from "@/lib/theme";

export interface PilotMetricsDisplay {
  activeUsers?: number | null;
  activeComrades?: number | null;
  completedTasks?: number | null;
  avgAcceptanceTime?: number | null;
  avgQueueTime?: number | null;
  avgTrustScore?: number | null;
  revenueToday?: number | null;
  totalUsers?: number | null;
}

interface Props {
  pilotMetrics: PilotMetricsDisplay;
}

export default function PilotMetricsPanel({ pilotMetrics }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.61 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5"
      style={{ borderLeft: `4px solid ${NAVY}` }}
    >
      <h3 className="font-black text-[#0A1628] text-sm mb-3 flex items-center gap-2">
        <Zap size={14} className="text-yellow-500" /> Pilot Launch Metrics
      </h3>
      <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
        <div className="text-center">
          <p className="text-lg font-black" style={{ color: NAVY }}>{pilotMetrics.activeUsers}</p>
          <p className="text-[9px] text-gray-400">Active Users</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-black" style={{ color: GOLD }}>{pilotMetrics.activeComrades}</p>
          <p className="text-[9px] text-gray-400">Active Comrades</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-black text-green-600">{pilotMetrics.completedTasks}</p>
          <p className="text-[9px] text-gray-400">Completed</p>
        </div>
        <div className="text-center">            <p className="text-lg font-black text-blue-600">
            {(pilotMetrics.avgAcceptanceTime ?? 0) > 60
              ? `${Math.round((pilotMetrics.avgAcceptanceTime ?? 0) / 60)}m`
              : `${pilotMetrics.avgAcceptanceTime ?? 0}s`}
          </p>
          <p className="text-[9px] text-gray-400">Avg Accept</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-black text-amber-600">{pilotMetrics.avgQueueTime}m</p>
          <p className="text-[9px] text-gray-400">Avg Queue</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-black text-purple-600">{pilotMetrics.avgTrustScore}</p>
          <p className="text-[9px] text-gray-400">Avg Trust</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-black text-green-600">{formatCurrency(pilotMetrics.revenueToday)}</p>
          <p className="text-[9px] text-gray-400">Rev Today</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-black" style={{ color: NAVY }}>{pilotMetrics.totalUsers}</p>
          <p className="text-[9px] text-gray-400">Total Users</p>
        </div>
      </div>
    </motion.div>
  );
}
