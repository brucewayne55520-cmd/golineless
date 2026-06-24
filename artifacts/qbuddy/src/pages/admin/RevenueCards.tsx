import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface RevenueCardConfig {
  label: string;
  val: number;
  Icon: LucideIcon;
  color: string;
}

interface Props {
  cards: RevenueCardConfig[];
}

export default function RevenueCards({ cards }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + i * 0.06 }}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${card.color}15` }}>
              <card.Icon size={13} style={{ color: card.color }} />
            </div>
            <p className="text-gray-400 text-xs font-medium">{card.label}</p>
          </div>
          <p className="text-xl font-black" style={{ color: card.color }}>{formatCurrency(card.val)}</p>
        </motion.div>
      ))}
    </div>
  );
}
