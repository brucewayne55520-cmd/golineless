import { motion } from "framer-motion";
import { DARK, BLUE } from "@/lib/theme";

export interface QueueMetricsProps {
  activeQueues?: number | null;
  avgWaitTime?: number | null;
  longestQueue?: number | null;
  hospitalQueueTasks?: number | null;
  bankQueueTasks?: number | null;
  govtQueueTasks?: number | null;
}

interface Props {
  queueMetrics: QueueMetricsProps;
}

export default function QueueIntelligence({ queueMetrics }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5"
    >
      <h3 className="font-black text-gray-900 text-sm mb-3">Queue Intelligence</h3>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-[9px] text-gray-400 uppercase tracking-wide">Active Queues</p>            <p className="text-2xl font-black" style={{ color: DARK }}>{queueMetrics.activeQueues ?? 0}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-[9px] text-gray-400 uppercase tracking-wide">Avg Wait</p>
          <p className="text-2xl font-black" style={{ color: BLUE }}>
            {queueMetrics.avgWaitTime ?? 0}<span className="text-sm font-medium text-gray-400">m</span>
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-[9px] text-gray-400 uppercase tracking-wide">Longest Queue</p>
          <p className="text-2xl font-black text-red-500">
            {queueMetrics.longestQueue ?? 0}<span className="text-sm font-medium text-gray-400"> tokens</span>
          </p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-[9px] text-blue-400 uppercase tracking-wide">🏥 Hospital</p>            <p className="text-2xl font-black text-blue-600">{queueMetrics.hospitalQueueTasks ?? 0}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <p className="text-[9px] text-emerald-400 uppercase tracking-wide">🏦 Bank</p>            <p className="text-2xl font-black text-emerald-600">{queueMetrics.bankQueueTasks ?? 0}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-3 text-center">
          <p className="text-[9px] text-purple-400 uppercase tracking-wide">🏛 Government</p>            <p className="text-2xl font-black text-purple-600">{queueMetrics.govtQueueTasks ?? 0}</p>
        </div>
      </div>
    </motion.div>
  );
}
