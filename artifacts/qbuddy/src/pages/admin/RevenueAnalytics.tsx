import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { DARK, BLUE } from "@/lib/theme";

export interface RevenueMetricsData {
  today?: number | null;
  thisWeek?: number | null;
  thisMonth?: number | null;
  waitingRevenue?: number | null;
  priorityRevenue?: number | null;
  subscriptionRevenue?: number | null;
}

interface Props {
  revenueMetrics: RevenueMetricsData;
}

export default function RevenueAnalytics({ revenueMetrics }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.59 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5"
    >
      <h3 className="font-black text-gray-900 text-sm mb-3">Revenue Analytics</h3>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-[9px] text-gray-400 uppercase">Today</p>
          <p className="text-lg font-black" style={{ color: DARK }}>{formatCurrency(revenueMetrics.today)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-[9px] text-gray-400 uppercase">This Week</p>
          <p className="text-lg font-black" style={{ color: BLUE }}>{formatCurrency(revenueMetrics.thisWeek)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-[9px] text-gray-400 uppercase">This Month</p>
          <p className="text-lg font-black text-green-600">{formatCurrency(revenueMetrics.thisMonth)}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-3 text-center">
          <p className="text-[9px] text-purple-400 uppercase">Waiting Rev</p>
          <p className="text-lg font-black text-purple-600">{formatCurrency(revenueMetrics.waitingRevenue)}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-[9px] text-amber-400 uppercase">Priority Rev</p>
          <p className="text-lg font-black text-amber-600">{formatCurrency(revenueMetrics.priorityRevenue)}</p>
        </div>
        <div className="bg-indigo-50 rounded-xl p-3 text-center">
          <p className="text-[9px] text-indigo-400 uppercase">Platform Rev</p>
          <p className="text-lg font-black text-indigo-600">{formatCurrency(revenueMetrics.subscriptionRevenue)}</p>
        </div>
      </div>
    </motion.div>
  );
}
