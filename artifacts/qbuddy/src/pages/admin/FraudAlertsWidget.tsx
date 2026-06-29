import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, RefreshCw } from "lucide-react";
import type { FraudFlagListFlagsItem } from "@workspace/api-client-react";

export interface FraudData {
  highSeverity?: number | null;
  total?: number | null;
}

interface Props {
  fraud: FraudData;
  flags: FraudFlagListFlagsItem[];
  onRefresh?: () => void;
}

export default function FraudAlertsWidget({ fraud, flags, onRefresh }: Props) {
  const [autoRefreshing, setAutoRefreshing] = useState(false);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!onRefresh) return;
    const interval = setInterval(() => {
      setAutoRefreshing(true);
      onRefresh();
      setTimeout(() => setAutoRefreshing(false), 1000);
    }, 30000);
    return () => clearInterval(interval);
  }, [onRefresh]);
  if (flags.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.62 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5"
      style={{ borderLeft: "4px solid #EF4444" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-gray-900 text-sm flex items-center gap-2">
          <ShieldAlert size={14} className="text-red-500" /> Fraud Center
          {onRefresh && (
            <button onClick={() => { onRefresh(); setAutoRefreshing(true); setTimeout(() => setAutoRefreshing(false), 1000); }} className="ml-1" title="Refresh">
              <RefreshCw size={11} className={`text-gray-400 hover:text-gray-600 transition-colors ${autoRefreshing ? "animate-spin" : ""}`} />
            </button>
          )}
        </h3>
        <div className="flex gap-2 items-center">
          {(fraud.highSeverity ?? 0) > 0 && (              <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {fraud.highSeverity ?? 0} high
            </span>
          )}                  <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {fraud.total ?? 0} total
                </span>
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1.5">
        {flags.slice(0, 10).map((flag) => (
          <div
            key={flag.id}
            className="flex items-center gap-3 px-3 py-2 rounded-xl"
            style={{ background: flag.severity === "high" ? "#FEF2F2" : "#FFFBEB" }}
          >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${flag.severity === "high" ? "bg-red-500" : "bg-amber-400"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-700 capitalize truncate">
                {flag.reason || flag.type?.replace(/_/g, " ")}
              </p>
              <p className="text-[10px] text-gray-400">
                Task #{flag.taskId}
                {flag.runnerId ? ` · Comrade #${flag.runnerId}` : ""}
                {flag.timestamp
                  ? ` · ${new Date(flag.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                  : ""}
              </p>
            </div>
            <span className={`text-[9px] font-bold uppercase ${flag.severity === "high" ? "text-red-500" : "text-amber-500"}`}>
              {flag.severity}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
