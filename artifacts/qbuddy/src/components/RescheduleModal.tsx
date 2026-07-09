import { motion } from "framer-motion";
import { Calendar, Clock, X } from "lucide-react";
import { DARK, BLUE_GRAD } from "@/lib/theme";

interface RescheduleModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  newDate: string;
  newTime: string;
  onDateChange: (v: string) => void;
  onTimeChange: (v: string) => void;
  loading: boolean;
}

const timeSlots = Array.from({ length: 24 }, (_, h) =>
  ["00", "30"].map((m) => `${String(h).padStart(2, "0")}:${m}`)
).flat();

export function RescheduleModal({ open, onClose, onConfirm, newDate, newTime, onDateChange, onTimeChange, loading }: RescheduleModalProps) {
  if (!open) return null;
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 p-6 shadow-2xl">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-blue-600" />
            <h3 className="font-black text-gray-900 text-lg">Reschedule Task</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
        <p className="text-gray-500 text-sm mb-4">Choose a new date and time for your task. This only works before a runner is assigned.</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">New Date</label>
            <input type="date" value={newDate} onChange={(e) => onDateChange(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">New Time</label>
            <select value={newTime} onChange={(e) => onTimeChange(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent">
              {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50"
            style={{ background: BLUE_GRAD }}>
            {loading ? "Rescheduling..." : "Confirm Reschedule"}
          </button>
        </div>
      </motion.div>
    </>
  );
}
