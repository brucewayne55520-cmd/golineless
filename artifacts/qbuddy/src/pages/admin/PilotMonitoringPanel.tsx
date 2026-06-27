import { motion } from "framer-motion";
import { Activity, Percent, UserCheck, CheckCircle2, XCircle, Hourglass } from "lucide-react";
import { GOLD } from "@/lib/theme";

export interface MonitoringData {
  successRate?: number | null;
  acceptanceRate?: number | null;
  completionRate?: number | null;
  cancellationRate?: number | null;
  avgWaitTimeAll?: number | null;
  totalTasks?: number | null;
  activeTasks?: number | null;
  pendingTasks?: number | null;
  completedTasks?: number | null;
  cancelledTasks?: number | null;
  uniqueUsers?: number | null;
  uniqueComrades?: number | null;
}

interface Props {
  monitoring: MonitoringData;
}

export default function PilotMonitoringPanel({ monitoring }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.63 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5"
      style={{ borderLeft: `4px solid ${GOLD}` }}
    >
      <h3 className="font-black text-[#241100] text-sm mb-3 flex items-center gap-2">
        <Activity size={14} className="text-blue-500" /> Pilot Monitoring
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-[9px] text-green-400 uppercase tracking-wide flex items-center justify-center gap-1">
            <Percent size={10} /> Success Rate
          </p>
          <p className="text-2xl font-black text-green-600">{monitoring.successRate}%</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-[9px] text-blue-400 uppercase tracking-wide flex items-center justify-center gap-1">
            <UserCheck size={10} /> Acceptance
          </p>
          <p className="text-2xl font-black text-blue-600">{monitoring.acceptanceRate}%</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <p className="text-[9px] text-emerald-400 uppercase tracking-wide flex items-center justify-center gap-1">
            <CheckCircle2 size={10} /> Completion
          </p>
          <p className="text-2xl font-black text-emerald-600">{monitoring.completionRate}%</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center">
          <p className="text-[9px] text-red-400 uppercase tracking-wide flex items-center justify-center gap-1">
            <XCircle size={10} /> Cancellation
          </p>
          <p className="text-2xl font-black text-red-500">{monitoring.cancellationRate}%</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-[9px] text-amber-400 uppercase tracking-wide flex items-center justify-center gap-1">
            <Hourglass size={10} /> Avg Wait
          </p>
          <p className="text-2xl font-black text-amber-600">
            {monitoring.avgWaitTimeAll}<span className="text-sm font-medium text-gray-400">m</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-[10px] text-gray-400 border-t border-gray-100 pt-3">
        <span>{monitoring.totalTasks} total tasks</span>
        <span>{monitoring.activeTasks} active</span>
        <span>{monitoring.pendingTasks} pending</span>
        <span>{monitoring.completedTasks} completed</span>
        <span>{monitoring.cancelledTasks} cancelled</span>
        <span>{monitoring.uniqueUsers} unique users</span>
        <span>{monitoring.uniqueComrades} unique comrades</span>
      </div>
    </motion.div>
  );
}
