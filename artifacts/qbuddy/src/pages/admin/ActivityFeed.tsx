import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import type { ActivityItem } from "@workspace/api-client-react";
import { GOLD } from "@/lib/theme";

interface Props {
  activities: ActivityItem[];
}

export default function ActivityFeed({ activities }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h3 className="font-black text-[#241100]">Live Activity Feed</h3>
        </div>
        <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg">
          Auto-refresh · 5s
        </span>
      </div>
      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Activity size={32} className="mb-2 opacity-30" />
          <p className="text-sm font-medium">No recent activity</p>
          <p className="text-xs mt-0.5 text-gray-300">Activity appears here in real time</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
          {activities.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: GOLD }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 leading-snug">{a.message}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(a.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
