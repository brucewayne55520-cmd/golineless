import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { DARK_GRAD, BLUE, BLUE_GRAD } from "@/lib/theme";
interface Props {
  activeNow?: number | null;
  totalRunnersOnTask?: number | null;
  stuckTasks?: number | null;
}


export default function DispatchBanner({ activeNow, totalRunnersOnTask, stuckTasks }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="rounded-2xl p-5 mb-5 flex items-center gap-4 relative overflow-hidden"
      style={{ background: DARK_GRAD }}
    >
      <div
        className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10"
        style={{ background: `radial-gradient(circle, ${BLUE}, transparent)`, transform: "translate(30%,-30%)" }}
      />
      <div className="flex-1 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-white/60 text-[10px] font-semibold uppercase">Broadcast</p>
          <p className="text-white font-black text-xl">{Math.max(0, (activeNow ?? 0) - (totalRunnersOnTask ?? 0))}</p>
          <p className="text-white/50 text-[10px]">Waiting for Comrade</p>
        </div>
        <div className="text-center">
          <p className="text-white/60 text-[10px] font-semibold uppercase">On Task</p>
          <p className="text-white font-black text-xl">{totalRunnersOnTask ?? 0}</p>
          <p className="text-white/50 text-[10px]">Comrades working</p>
        </div>
        <div className="text-center">
          <p className="text-white/60 text-[10px] font-semibold uppercase">Stuck</p>
          <p className="text-white font-black text-xl" style={(stuckTasks ?? 0) > 0 ? { color: "#EF4444" } : {}}>{stuckTasks ?? 0}</p>
          <p className="text-white/50 text-[10px]">Over 3 hours</p>
        </div>
      </div>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: BLUE_GRAD }}>
        <TrendingUp size={22} className="text-white" />
      </div>
    </motion.div>
  );
}
