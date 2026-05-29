import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useListAdminTasks, useUpdateAdminTask } from "@workspace/api-client-react";
import AdminSidebar from "@/components/AdminSidebar";
import { CATEGORY_NAMES, STATUS_COLORS, STATUS_LABELS, formatCurrency } from "@/lib/utils";

const STATUS_OPTS = ["", "pending", "assigned", "on_the_way", "at_location", "in_progress", "completed", "cancelled"];

export default function AdminTasks() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [notes, setNotes] = useState("");
  const { data, isLoading, refetch } = useListAdminTasks({ params: status ? { status } : {} } as any);
  const updateTask = useUpdateAdminTask();

  const tasks = (data as any)?.tasks ?? (Array.isArray(data) ? data : []);
  const LIMIT = 20;
  const pageTasks = tasks.slice(page * LIMIT, page * LIMIT + LIMIT);

  const handleUpdate = () => {
    if (!selected) return;
    updateTask.mutate({ id: String(selected.id), data: { status: newStatus || undefined, internalNotes: notes } } as any, {
      onSuccess: () => { toast.success("Task updated"); setSelected(null); refetch(); },
      onError: () => toast.error("Update failed"),
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-5">
          <h1 className="text-2xl font-black text-[#1A1A2E]">Tasks</h1>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {STATUS_OPTS.map(s => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(0); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${status === s ? "bg-[#6C3FD4] text-white" : "bg-white text-gray-600 border border-gray-200"}`}
            >
              {s === "" ? "All" : STATUS_LABELS[s] ?? s}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["#", "User", "Category", "Location", "Runner", "Price", "Status", "Date", "Action"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : pageTasks.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-gray-400">No tasks found</td></tr>
                ) : (
                  pageTasks.map((task: any) => (
                    <tr key={task.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => { setSelected(task); setNewStatus(task.status); setNotes(task.internalNotes ?? ""); }}>
                      <td className="px-4 py-3 text-gray-500">#{task.id}</td>
                      <td className="px-4 py-3 font-medium text-[#1A1A2E]">{task.user?.name ?? task.user?.phone ?? "—"}</td>
                      <td className="px-4 py-3">{CATEGORY_NAMES[task.category] ?? task.category}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-24 truncate">{task.locationArea ?? "—"}</td>
                      <td className="px-4 py-3">{task.runner?.name ?? "—"}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(task.price)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[task.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                          {STATUS_LABELS[task.status] ?? task.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(task.createdAt).toLocaleDateString("en-IN")}</td>
                      <td className="px-4 py-3">
                        <button className="text-[#6C3FD4] text-xs font-semibold hover:underline">Edit</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, tasks.length)} of {tasks.length}</p>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded-lg border border-gray-200 text-xs disabled:opacity-40">← Prev</button>
              <button disabled={(page + 1) * LIMIT >= tasks.length} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded-lg border border-gray-200 text-xs disabled:opacity-40">Next →</button>
            </div>
          </div>
        </div>

        {/* Slide-over */}
        <AnimatePresence>
          {selected && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelected(null)} />
              <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="fixed right-0 top-0 bottom-0 w-96 bg-white z-50 shadow-2xl overflow-y-auto">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-black text-[#1A1A2E]">Task #{selected.id}</h2>
                  <button onClick={() => setSelected(null)} className="text-gray-400 text-2xl">×</button>
                </div>
                <div className="p-5 space-y-4">
                  <div><label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                    <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3FD4]">
                      {STATUS_OPTS.filter(Boolean).map(s => <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>)}
                    </select>
                  </div>
                  <div><label className="text-xs font-semibold text-gray-500 uppercase">Internal Notes</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3FD4] resize-none" placeholder="Add notes..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      ["Category", CATEGORY_NAMES[selected.category] ?? selected.category],
                      ["Price", formatCurrency(selected.price)],
                      ["Runner Earning", formatCurrency(selected.runnerEarning)],
                      ["Platform Fee", formatCurrency(selected.platformFee)],
                      ["Payment", selected.paymentMethod],
                      ["User", selected.user?.name ?? selected.user?.phone ?? "—"],
                      ["Runner", selected.runner?.name ?? "Not assigned"],
                      ["Location", `${selected.locationName ?? ""} ${selected.locationArea ?? ""}`],
                    ].map(([k, v]) => (
                      <div key={k}><p className="text-xs text-gray-400">{k}</p><p className="font-medium text-[#1A1A2E]">{v}</p></div>
                    ))}
                  </div>
                  <button onClick={handleUpdate} disabled={updateTask.isPending} className="w-full py-3 rounded-xl text-white font-bold" style={{ background: "linear-gradient(135deg, #6C3FD4, #9B6FF7)" }}>
                    {updateTask.isPending ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
