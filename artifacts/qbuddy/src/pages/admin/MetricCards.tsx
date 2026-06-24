import { motion } from "framer-motion";
import CountUp from "./CountUp";
import type { LucideIcon } from "lucide-react";

export interface MetricCardConfig {
  label: string;
  val: number;
  Icon: LucideIcon;
  color: string;
  bg: string;
  trend?: string;
}

interface Props {
  cards: MetricCardConfig[];
  isLoading?: boolean;
}

export default function MetricCards({ cards, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-white rounded-2xl animate-pulse shadow-sm border border-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, type: "spring", stiffness: 200 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.bg }}>
              <card.Icon size={18} style={{ color: card.color }} />
            </div>
            {card.trend && (
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                {card.trend}
              </span>
            )}
          </div>
          <div className="text-3xl font-black mb-1" style={{ color: card.color }}>
            <CountUp value={card.val} />
          </div>
          <p className="text-gray-500 text-xs font-medium">{card.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
