import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import AdminSidebar from "@/components/AdminSidebar";
import { useListSupportTickets, useGetSupportStats, useUpdateSupportTicket } from "@workspace/api-client-react";
import { Ticket, Clock, CheckCircle2, AlertCircle, X } from "lucide-react";
import { NAVY } from "@/lib/theme";
const STATUS_COLORS: Record<string, string> = { open: "#3B82F6", in_progress: "#F59E0B", resolved: "#10B981", closed: "#6B7280" };
const PRIORITY_COLORS: Record<string, string> = { low: "#9CA3AF", normal: "#3B82F6", high: "#F59E0B", urgent: "#EF4444" };

export default function AdminSupport() {
  const [filter, setFilter] = useState("");
  const { data: tickets, isLoading: loadingTickets, refetch: refetchTickets } = useListSupportTickets(undefined, { query: { queryKey: ["supportTickets"], refetchInterval: 10000 } });
  const { data: stats, refetch: refetchStats } = useGetSupportStats({ query: { queryKey: ["supportStats"], refetchInterval: 10000 } });
  const loading = loadingTickets;

  const updateTicketMutation = useUpdateSupportTicket();

  const updateTicket = (id: number, data: import("@workspace/api-client-react").SupportTicketUpdate) => {
    updateTicketMutation.mutate({ id, data }, {
      onSuccess: () => toast.success("Ticket updated"),
      onError: () => toast.error("Failed"),
      onSettled: () => { refetchTickets(); refetchStats(); },
    });
  };

  return (
    <div className="flex min-h-screen gl-surface dark:bg-[#0A0E1A]">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <h1 className="text-xl font-bold text-[#241100] dark:text-[#fff2e5] mb-5">Customer Support Center</h1>

        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-5">
            <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 gl-shadow-md border border-[#E5E0D8] dark:border-[#1F2937] text-center gl-transition">
              <Ticket size={18} className="mx-auto mb-1" style={{ color: NAVY }} />
              <p className="text-2xl font-black" style={{ color: NAVY }}>{stats.total}</p>
              <p className="text-[10px] text-[#9CA3AF]">Total Tickets</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100 text-center">
              <AlertCircle size={18} className="mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-black text-blue-600">{stats.open}</p>
              <p className="text-[10px] text-[#9CA3AF]">Open</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-green-100 text-center">
              <CheckCircle2 size={18} className="mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-black text-green-600">{stats.resolved}</p>
              <p className="text-[10px] text-[#9CA3AF]">Resolved</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100 text-center">
              <Clock size={18} className="mx-auto mb-1 text-amber-500" />
              <p className="text-2xl font-black text-amber-600">{stats.avgResolutionTime}<span className="text-sm font-medium">m</span></p>
              <p className="text-[10px] text-[#9CA3AF]">Avg Resolution</p>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-[#111827] rounded-2xl gl-shadow-md border border-[#E5E0D8] dark:border-[#1F2937] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E0D8] dark:border-[#1F2937] flex items-center justify-between">
            <h3 className="font-bold text-[#241100] dark:text-[#fff2e5]">Support Tickets</h3>
            <select value={filter} onChange={e => setFilter(e.target.value)} className="text-xs border border-[#E5E0D8] dark:border-[#374151] rounded-lg px-2 py-1.5 bg-white dark:bg-[#1F2937] dark:text-[#fff2e5] gl-transition">
              <option value="">All</option><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
            </select>
          </div>
          {loading ? <div className="p-8 text-center text-[#9CA3AF]">Loading...</div> : !tickets || tickets.length === 0 ? (
            <div className="p-8 text-center text-[#9CA3AF]"><Ticket size={32} className="mx-auto mb-2 opacity-30" /><p className="font-medium">No tickets yet</p></div>
          ) : (
            <div className="divide-y divide-[#F3F4F6] dark:divide-[#1F2937]">
              {(Array.isArray(tickets) ? tickets : []).filter(t => !filter || t.status === filter).map((t: Required<import("@workspace/api-client-react").SupportTicket>) => (
                <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 py-4 hover:bg-[#FFF9F2] dark:hover:bg-[#1F2937] gl-transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#9CA3AF]">{t.ticketId}</span>
                        <span className="text-sm font-semibold text-[#241100] dark:text-[#fff2e5]">{t.subject}</span>
                      </div>
                      <p className="text-xs text-[#9CA3AF] mt-1 line-clamp-2">{t.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: `${PRIORITY_COLORS[t.priority] || "#9CA3AF"}20`, color: PRIORITY_COLORS[t.priority] || "#9CA3AF" }}>{t.priority}</span>
                      <select value={t.status} onChange={e => updateTicket(t.id, { status: e.target.value })}
                        className="text-[10px] font-bold rounded-lg px-2 py-1 border" style={{ borderColor: STATUS_COLORS[t.status] || "#E5E7EB", color: STATUS_COLORS[t.status] }}>
                        <option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                  {/* M11: Expandable resolution form for open/in_progress tickets */}
                  {(t.status === "open" || t.status === "in_progress") && (
                    <ResolutionForm
                      ticketId={t.id}
                      onResolve={(resolution) => updateTicket(t.id, { resolution, status: "resolved" })}
                      onInProgress={() => updateTicket(t.id, { status: "in_progress" })}
                    />
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// M11: Proper resolution form with resolution notes textarea
function ResolutionForm({ ticketId, onResolve, onInProgress }: {
  ticketId: number;
  onResolve: (resolution: string) => void;
  onInProgress: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [resolution, setResolution] = useState("");

  if (!expanded) {
    return (
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => { setExpanded(true); onInProgress(); }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
        >
          Mark In Progress
        </button>
        <button
          onClick={() => { setExpanded(true); }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
        >
          Resolve
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mt-2 space-y-2"
    >
      <textarea
        value={resolution}
        onChange={e => setResolution(e.target.value)}
        placeholder="Describe the resolution..."
        className="w-full border border-[#E5E0D8] dark:border-[#374151] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#059669] resize-none bg-white dark:bg-[#1F2937] dark:text-[#fff2e5] gl-transition"
        rows={3}
      />
      <div className="flex gap-2">
        <button
          onClick={() => { if (!resolution.trim()) { toast.error("Please add resolution notes"); return; } onResolve(resolution); setResolution(""); setExpanded(false); }}
          className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
        >
          Mark Resolved
        </button>
        <button
          onClick={() => { setExpanded(false); setResolution(""); }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}
