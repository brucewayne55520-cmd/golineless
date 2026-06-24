import { useState } from "react";
import { Search, Clock, User, PersonStanding, Shield, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import AdminSidebar from "@/components/AdminSidebar";

type AuditEntry = {
  id: number;
  taskId: number | null;
  previousStatus: string | null;
  newStatus: string | null;
  actor: string | null;
  actorType: string | null;
  reason: string | null;
  metadata: unknown;
  createdAt: string;
};

const ACTOR_TYPES = [
  { key: "", label: "All Actors" },
  { key: "admin", label: "Admin", icon: Shield },
  { key: "runner", label: "Runner", icon: PersonStanding },
  { key: "user", label: "User", icon: User },
  { key: "system", label: "System", icon: Zap },
];

const ACTION_TYPES = [
  { key: "", label: "All Actions" },
  { key: "approve", label: "Approve" },
  { key: "reject", label: "Reject" },
  { key: "kyc_approved", label: "KYC Approved" },
  { key: "kyc_rejected", label: "KYC Rejected" },
  { key: "cash_pending", label: "Cash Pending" },
  { key: "paid", label: "Paid" },
  { key: "refunded", label: "Refunded" },
  { key: "settled", label: "Settled" },
];

function getActorTypeBadge(type: string | null) {
  if (type === "admin") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700"><Shield size={9} /> Admin</span>;
  if (type === "runner") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#6C3FD4]/10 text-[#6C3FD4]"><PersonStanding size={9} /> Runner</span>;
  if (type === "user") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700"><User size={9} /> User</span>;
  if (type === "system") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600"><Zap size={9} /> System</span>;
  return <span className="text-[10px] text-gray-400">—</span>;
}

function getStatusBadge(status: string | null) {
  if (!status) return <span className="text-xs text-gray-400">—</span>;
  const colors: Record<string, string> = {
    approve: "bg-green-100 text-green-700",
    kyc_approved: "bg-green-100 text-green-700",
    verified: "bg-green-100 text-green-700",
    paid: "bg-green-100 text-green-700",
    settled: "bg-green-100 text-green-700",
    reject: "bg-red-100 text-red-700",
    kyc_rejected: "bg-red-100 text-red-700",
    refunded: "bg-red-100 text-red-700",
    cash_pending: "bg-amber-100 text-amber-700",
    pending: "bg-amber-100 text-amber-700",
  };
  const cls = colors[status] ?? "bg-gray-100 text-gray-600";
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}>{status.replace(/_/g, " ")}</span>;
}

export default function AdminAuditLog() {
  const [page, setPage] = useState(0);
  const [actorType, setActorType] = useState("");
  const [action, setAction] = useState("");
  const [days, setDays] = useState("30");
  const [search, setSearch] = useState("");
  const limit = 30;

  const { data, isLoading } = useQuery({
    queryKey: ["adminAuditLog", page, actorType, action, days],
    queryFn: async () => {
      const token = localStorage.getItem("golineless_admin_token") || "";
      const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit), days });
      if (actorType) params.set("actor_type", actorType);
      if (action) params.set("action", action);
      const res = await fetch(`/api/admin/audit-log?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch audit log");
      return res.json();
    },
  });

  const logs: AuditEntry[] = data?.logs ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Client-side search filter on actor, reason
  const filteredLogs = search
    ? logs.filter(l =>
        l.actor?.toLowerCase().includes(search.toLowerCase()) ||
        l.reason?.toLowerCase().includes(search.toLowerCase()) ||
        String(l.taskId).includes(search)
      )
    : logs;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-5">
          <h1 className="text-2xl font-black text-[#1A1A2E] flex items-center gap-2">
            <Clock size={24} /> Audit Log
          </h1>
          <p className="text-gray-500 text-sm mt-1">Track all admin actions, KYC reviews, and payment changes</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search actor, reason, or task ID..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3FD4]/20 bg-white"
            />
          </div>

          {/* Actor type filter */}
          <div className="flex gap-1 bg-white p-1 rounded-xl border border-gray-200">
            {ACTOR_TYPES.map(a => (
              <button
                key={a.key}
                onClick={() => { setActorType(a.key); setPage(0); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${actorType === a.key ? "bg-[#1A1A2E] text-white" : "text-gray-500 hover:bg-gray-100"}`}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Action filter */}
          <select
            value={action}
            onChange={e => { setAction(e.target.value); setPage(0); }}
            className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 bg-white focus:outline-none"
          >
            {ACTION_TYPES.map(a => (
              <option key={a.key} value={a.key}>{a.label}</option>
            ))}
          </select>

          {/* Days filter */}
          <select
            value={days}
            onChange={e => { setDays(e.target.value); setPage(0); }}
            className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 bg-white focus:outline-none"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
          <span className="font-semibold">{total} total entries</span>
          <span>·</span>
          <span>Page {page + 1} of {Math.max(1, totalPages)}</span>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Clock size={40} className="mx-auto mb-3 opacity-40" />
            <p>No audit entries found</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Time</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Actor</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Details</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Task</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getActorTypeBadge(log.actorType)}
                        <span className="text-xs font-semibold text-[#1A1A2E]">{log.actor ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {log.previousStatus && (
                          <>
                            {getStatusBadge(log.previousStatus)}
                            <span className="text-gray-300 text-xs">→</span>
                          </>
                        )}
                        {getStatusBadge(log.newStatus)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">
                      {log.reason ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {log.taskId ? (
                        <span className="text-xs font-mono text-gray-500">#{log.taskId}</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-500 font-semibold px-3">
              Page {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
