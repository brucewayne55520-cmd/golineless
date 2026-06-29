import { motion } from "framer-motion";
import { DARK_MUTED } from "@/lib/theme";

interface HubStat {
  pending?: number;
  active?: number;
  completed?: number;
  total?: number;
}

interface Props {
  hubStats: Record<string, HubStat>;
}

const HUBS: Record<string, { icon: string; color: string; label: string }> = {
  healthcare: { icon: "🏥", color: "#0EA5E9", label: "Healthcare" },
  documentation: { icon: "📄", color: "#8B5CF6", label: "Documentation" },
  banking: { icon: "🏦", color: "#10B981", label: "Banking" },
  senior: { icon: "💙", color: "#F43F5E", label: "Senior Care" },
  emergency: { icon: "⚡", color: "#EF4444", label: "Emergency" },
};

export default function HubOperationsOverview({ hubStats }: Props) {
  return (
    <div className="mb-5">
      <h3 className="font-black text-gray-900 text-sm mb-3">Service Hub Overview</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.entries(hubStats) as [string, HubStat][]).map(([hub, stats], i) => {
          const h = HUBS[hub] || { icon: "📋", color: DARK_MUTED, label: hub };
          return (
            <motion.div
              key={hub}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.05 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{h.icon}</span>
                <span className="text-sm font-bold text-gray-900">{h.label}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-center">
                <div>
                  <p className="text-lg font-black" style={{ color: h.color }}>{stats.active || 0}</p>
                  <p className="text-[9px] text-gray-400">Active</p>
                </div>
                <div>
                  <p className="text-lg font-black text-gray-700">{stats.pending || 0}</p>
                  <p className="text-[9px] text-gray-400">Pending</p>
                </div>
                <div>
                  <p className="text-lg font-black text-green-600">{stats.total || 0}</p>
                  <p className="text-[9px] text-gray-400">Total</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
