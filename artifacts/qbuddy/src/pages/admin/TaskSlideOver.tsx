import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CATEGORY_NAMES, formatCurrency } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/utils";
import type { Task } from "@workspace/api-client-react";
import { useGetTaskTimeline } from "@workspace/api-client-react";
import { Clock, Trash2, UserPlus, ChevronDown, ChevronUp } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";

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
  onAction?: () => void;
}

export default function TaskSlideOver({
  task, newStatus, notes, options, isSaving,
  onStatusChange, onNotesChange, onSave, onClose, onAction,
}: Props) {
  // M6: Task timeline
  const [showTimeline, setShowTimeline] = useState(false);
  const { data: timeline, isLoading: timelineLoading } = useGetTaskTimeline(Number(task?.id ?? 0), {
    query: { queryKey: ["taskTimeline", task?.id], enabled: showTimeline && !!task?.id },
  });
  const timelineEvents = Array.isArray(timeline) ? timeline : [];

  // M9: Quick actions state
  const [showQuickAssign, setShowQuickAssign] = useState(false);
  const [quickAssignId, setQuickAssignId] = useState("");

  const handleQuickDelete = async () => {
    if (!task) return;
    if (!window.confirm(`Soft-delete Task #${task.id}? This will cancel it.`)) return;
    try {
      await customFetch(`/api/admin/tasks/${task.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("golineless_admin_token") || ""}` },
      });
      onAction?.();
      onClose();
    } catch { /* toast handled elsewhere */ }
  };

  const handleQuickAssign = async () => {
    if (!task || !quickAssignId) return;
    try {
      await customFetch(`/api/admin/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("golineless_admin_token") || ""}` },
        body: JSON.stringify({ runnerId: Number(quickAssignId) }),
      });
      setShowQuickAssign(false);
      setQuickAssignId("");
      onAction?.();
      onClose();
    } catch { /* toast handled elsewhere */ }
  };

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
              {/* M9: Quick Action Buttons */}
              <div className="flex gap-2 flex-wrap">
                {(!task.runnerId || task.runnerId === 0) && (
                  <button
                    onClick={() => setShowQuickAssign(!showQuickAssign)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    <UserPlus size={12} /> Quick Assign
                  </button>
                )}
                {task.status !== "completed" && task.status !== "cancelled" && (
                  <button
                    onClick={handleQuickDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={12} /> Quick Delete
                  </button>
                )}
              </div>
              {showQuickAssign && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Runner ID"
                    value={quickAssignId}
                    onChange={e => setQuickAssignId(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3FD4]"
                  />
                  <button onClick={handleQuickAssign} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold">Assign</button>
                </motion.div>
              )}

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

              {/* M6: Task Timeline */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowTimeline(!showTimeline)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Clock size={14} /> Task Timeline ({timelineEvents.length})
                  </span>
                  {showTimeline ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {showTimeline && (
                  <div className="px-4 pb-4 max-h-64 overflow-y-auto">
                    {timelineLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />)}
                      </div>
                    ) : timelineEvents.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">No timeline events yet</p>
                    ) : (
                      <div className="relative pl-4">
                        <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-gray-200" />
                        {timelineEvents.map((event: { id?: number; eventType?: string; description?: string; eventTimestamp?: string; actor?: string }, i: number) => (
                          <div key={event.id ?? i} className="relative mb-3 last:mb-0">
                            <div className="absolute -left-[9px] top-1 w-3 h-3 rounded-full bg-white border-2 border-blue-400" />
                            <div className="ml-3">
                              <p className="text-xs font-semibold text-[#1A1A2E]">{event.eventType?.replace(/_/g, " ")}</p>
                              {event.description && <p className="text-[10px] text-gray-400 mt-0.5">{event.description}</p>}
                              <p className="text-[10px] text-gray-300 mt-0.5">
                                {event.eventTimestamp ? new Date(event.eventTimestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                                {event.actor ? ` · ${event.actor}` : ""}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
