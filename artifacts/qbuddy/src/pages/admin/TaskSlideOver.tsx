import { motion, AnimatePresence } from "framer-motion";
import { CATEGORY_NAMES, formatCurrency } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/utils";
import type { Task } from "@workspace/api-client-react";

interface Props {
  task: Required<Task> | null;
  newStatus: string;
  notes: string;
  options: string[];
  isSaving: boolean;
  onStatusChange: (status: string) => void;
  onNotesChange: (notes: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function TaskSlideOver({
  task, newStatus, notes, options, isSaving,
  onStatusChange, onNotesChange, onSave, onClose,
}: Props) {
  return (
    <AnimatePresence>
      {task && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            className="fixed right-0 top-0 bottom-0 max-w-lg w-full bg-white z-50 shadow-2xl overflow-y-auto"
          >
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-black text-[#1A1A2E]">Task #{task.id}</h2>
              <button onClick={onClose} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                <select
                  value={newStatus}
                  onChange={e => onStatusChange(e.target.value)}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3FD4]"
                >
                  {options.filter(Boolean).map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Internal Notes</label>
                <textarea
                  value={notes}
                  onChange={e => onNotesChange(e.target.value)}
                  rows={3}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3FD4] resize-none"
                  placeholder="Add notes..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Category", CATEGORY_NAMES[task.category] ?? task.category],
                  ["Price", formatCurrency(task.price)],
                  ["Runner Earning", formatCurrency(task.runnerEarning)],
                  ["Platform Fee", formatCurrency(task.platformFee)],
                  ["Payment", task.paymentMethod],
                  ["User", task.user?.name ?? task.user?.phone ?? "—"],
                  ["Runner", task.runner?.name ?? "Not assigned"],
                  ["Location", `${task.locationName ?? ""} ${task.locationArea ?? ""}`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-gray-400">{k}</p>
                    <p className="font-medium text-[#1A1A2E]">{v}</p>
                  </div>
                ))}
              </div>

              {/* Payment Status Section */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Payment Status</h4>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    task.paymentStatus === "paid" ? "bg-green-100 text-green-700" :
                    task.paymentStatus === "pending" ? "bg-amber-100 text-amber-700" :
                    task.paymentStatus === "refunded" ? "bg-red-100 text-red-700" :
                    task.paymentStatus === "cash_pending" ? "bg-orange-100 text-orange-700" :
                    "bg-gray-100 text-gray-500"
                  }`}>
                    {task.paymentStatus === "paid" ? "✓ Paid" : task.paymentStatus === "pending" ? "⏳ Pending" : task.paymentStatus === "refunded" ? "✗ Refunded" : task.paymentStatus === "cash_pending" ? "Cash Pending" : "Unpaid"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {task.paymentMethod === "cash" ? "Cash on Delivery" : task.paymentMethod === "online" ? "Online Payment" : task.paymentMethod}
                  </span>
                  {task.paymentStatus === "paid" && task.paymentConfirmedAt && (
                    <span className="text-[10px] text-gray-400">
                      Paid {new Date(task.paymentConfirmedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
                {(task.paymentStatus === "pending" || task.paymentStatus === "cash_pending") && task.status !== "completed" && (
                  <p className="text-[10px] text-amber-600 mt-2">
                    Payment must be received before marking task as completed.
                  </p>
                )}
              </div>
              <button
                onClick={onSave}
                disabled={isSaving}
                className="w-full py-3 rounded-xl text-white font-bold"
                style={{ background: "linear-gradient(135deg, #6C3FD4, #9B6FF7)" }}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
