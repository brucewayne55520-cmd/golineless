import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import AdminSidebar from "@/components/AdminSidebar";
import { useListSupportTickets, useGetSupportStats, useUpdateSupportTicket } from "@workspace/api-client-react";
import { Ticket, Clock, CheckCircle2, AlertCircle } from "lucide-react";
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
    <div className="flex min-h-screen" style={{ background: "#F0F2F8" }}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <h1 className="text-xl font-black text-[#0A1628] mb-5">Customer Support Center</h1>

        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-5">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <Ticket size={18} className="mx-auto mb-1" style={{ color: NAVY }} />
              <p className="text-2xl font-black" style={{ color: NAVY }}>{stats.total}</p>
              <p className="text-[10px] text-gray-400">Total Tickets</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100 text-center">
              <AlertCircle size={18} className="mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-black text-blue-600">{stats.open}</p>
              <p className="text-[10px] text-gray-400">Open</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-green-100 text-center">
              <CheckCircle2 size={18} className="mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-black text-green-600">{stats.resolved}</p>
              <p className="text-[10px] text-gray-400">Resolved</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100 text-center">
              <Clock size={18} className="mx-auto mb-1 text-amber-500" />
              <p className="text-2xl font-black text-amber-600">{stats.avgResolutionTime}<span className="text-sm font-medium">m</span></p>
              <p className="text-[10px] text-gray-400">Avg Resolution</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-[#0A1628]">Support Tickets</h3>
            <select value={filter} onChange={e => setFilter(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
              <option value="">All</option><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
            </select>
          </div>
          {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : !tickets || tickets.length === 0 ? (
            <div className="p-8 text-center text-gray-400"><Ticket size={32} className="mx-auto mb-2 opacity-30" /><p className="font-medium">No tickets yet</p></div>
          ) : (
            <div className="divide-y divide-gray-50">
              {(Array.isArray(tickets) ? tickets : []).filter(t => !filter || t.status === filter).map((t: Required<import("@workspace/api-client-react").SupportTicket>) => (
                <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-gray-400">{t.ticketId}</span>
                        <span className="text-sm font-semibold text-[#0A1628]">{t.subject}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{t.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: `${PRIORITY_COLORS[t.priority] || "#9CA3AF"}20`, color: PRIORITY_COLORS[t.priority] || "#9CA3AF" }}>{t.priority}</span>
                      <select value={t.status} onChange={e => updateTicket(t.id, { status: e.target.value })}
                        className="text-[10px] font-bold rounded-lg px-2 py-1 border" style={{ borderColor: STATUS_COLORS[t.status] || "#E5E7EB", color: STATUS_COLORS[t.status] }}>
                        <option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                  {t.status === "in_progress" && (
                    <div className="mt-2 flex gap-2">
                      <input placeholder="Resolution notes..." className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs"
                        onKeyDown={e => { if (e.key === "Enter") updateTicket(t.id, { resolution: (e.target as HTMLInputElement).value, status: "resolved" }); }} />
                    </div>
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
