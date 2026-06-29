import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { DARK } from "@/lib/theme";

export interface DailyOpsData {
  tasksToday?: number | null;
  completed?: number | null;
  acceptanceRate?: number | null;
  completionRate?: number | null;
  cancellationRate?: number | null;
  revenueToday?: number | null;
  avgRating?: number | string | null;
}

interface Props {
  dailyOps: DailyOpsData;
}

export default function DailyOpsPanel({ dailyOps }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5"
      style={{ borderLeft: "4px solid #0EA5E9" }}
    >
      <h3 className="font-black text-gray-900 text-sm mb-3 flex items-center gap-2">
        <BarChart3 size={14} className="text-sky-500" /> Daily Operations
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mb-3">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-[9px] text-gray-400 uppercase">Tasks Today</p>
          <p className="text-lg font-black" style={{ color: DARK }}>{dailyOps.tasksToday}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-[9px] text-green-400 uppercase">Completed</p>
          <p className="text-lg font-black text-green-600">{dailyOps.completed}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-[9px] text-blue-400 uppercase">Acceptance</p>
          <p className="text-lg font-black text-blue-600">{dailyOps.acceptanceRate}%</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <p className="text-[9px] text-emerald-400 uppercase">Completion</p>
          <p className="text-lg font-black text-emerald-600">{dailyOps.completionRate}%</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center">
          <p className="text-[9px] text-red-400 uppercase">Cancellation</p>
          <p className="text-lg font-black text-red-500">{dailyOps.cancellationRate}%</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-[9px] text-amber-400 uppercase">Revenue</p>
          <p className="text-lg font-black text-amber-600">{formatCurrency(dailyOps.revenueToday)}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-3 text-center">
          <p className="text-[9px] text-purple-400 uppercase">Rating</p>            <p className="text-lg font-black text-purple-600">{dailyOps.avgRating ?? "—"}</p>
        </div>
      </div>
    </motion.div>
  );
}
