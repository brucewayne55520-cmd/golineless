import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useListAdminUsers } from "@workspace/api-client-react";
import { BadgeCheck, XCircle, Clock, AlertTriangle, Search, Shield, Download, CheckSquare } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import { getInitials } from "@/lib/utils";

type UserWithKyc = Required<import("@workspace/api-client-react").User> & { kycStatus?: string; uniqueId?: string };

function KycBadge({ status }: { status?: string }) {
  if (status === "verified") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700"><BadgeCheck size={10} /> Verified</span>;
  if (status === "rejected") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700"><XCircle size={10} /> Rejected</span>;
  if (status === "pending") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700"><Clock size={10} /> Pending</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500"><AlertTriangle size={10} /> Not Started</span>;
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [kycFilter, setKycFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const LIMIT = 50;
  // M3 FIX: Use server-side pagination with limit/offset (API doesn't support kyc_status, so filter client-side)
  const { data: users, isLoading } = useListAdminUsers({ limit: LIMIT, offset: page * LIMIT });
  const list = (users ?? []) as UserWithKyc[];
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Client-side kyc + search filter
  const filtered = list.filter(u => {
    const matchesKyc = kycFilter === "all" || u.kycStatus === kycFilter;
    const matchesSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.phone?.includes(search) || u.email?.toLowerCase().includes(search.toLowerCase());
    return matchesKyc && matchesSearch;
  });

  const allSelected = filtered.length > 0 && filtered.every(u => selectedIds.has(u.id));
  const toggleSelectAll = () => {
    if (allSelected) { setSelectedIds(new Set()); } else { setSelectedIds(new Set(filtered.map(u => u.id))); }
  };
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const exportCsv = useCallback(() => {
    const data = selectedIds.size > 0 ? filtered.filter(u => selectedIds.has(u.id)) : filtered;
    if (data.length === 0) { toast.error("No users to export"); return; }
    const escape = (v: string) => v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    const header = "ID,Name,Phone,Email,Unique ID,KYC Status,City,Joined\n";
    const rows = data.map(u =>
      [u.id, u.name ?? "", u.phone ?? "", u.email ?? "", u.uniqueId ?? "", u.kycStatus ?? "", u.city ?? "", u.createdAt ? new Date(u.createdAt).toISOString().split("T")[0] : ""].map(v => escape(String(v))).join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `users-${kycFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${data.length} users`);
  }, [filtered, kycFilter, selectedIds]);

  return (
    <div className="flex min-h-screen gl-surface dark:bg-[#0A0E1A]">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-[#0A1628] dark:text-[#F5F0E8] flex items-center gap-2">Users</h1>
            <p className="text-[#6B7280] text-sm">Page {page + 1} · {filtered.length} users shown{kycFilter !== "all" ? ` (${kycFilter})` : ""}{selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ""}</p>
          </div>
          <button onClick={exportCsv} disabled={filtered.length === 0} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#1F2937] border border-[#E5E0D8] dark:border-[#374151] hover:bg-[#FAF7F2] dark:hover:bg-[#111827] disabled:opacity-40 gl-transition">
            <Download size={14} /> Export CSV{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
          </button>
        </div>

        {/* Search + KYC Filter */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search by name, phone, email, or ID..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E5E0D8] dark:border-[#374151] text-sm focus:outline-none focus:ring-2 focus:ring-[#0A1628] bg-white dark:bg-[#1F2937] dark:text-[#F5F0E8] gl-transition"
            />
          </div>
          <div className="flex gap-1 bg-white dark:bg-[#1F2937] p-1 rounded-xl border border-[#E5E0D8] dark:border-[#374151]">
            {["all", "pending", "verified", "rejected"].map(f => (
              <button key={f} onClick={() => { setKycFilter(f); setPage(0); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold gl-transition ${kycFilter === f ? "bg-[#0A1628] dark:bg-[#D4A843] text-white dark:text-[#0A1628]" : "text-[#6B7280] hover:bg-[#F3F4F6] dark:hover:bg-[#374151]"}`}>
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}

              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] rounded-2xl gl-shadow-md border border-[#E5E0D8] dark:border-[#1F2937] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E0D8] dark:border-[#1F2937]">
                <th className="px-4 py-3"><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="rounded" /></th>
                {["User", "Unique ID", "Phone", "KYC", "City", "Joined"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No users found</td></tr>
              ) : (
                filtered.map(user => (
                  <tr key={user.id} className="border-b border-[#F3F4F6] dark:border-[#1F2937] hover:bg-[#FAF7F2] dark:hover:bg-[#1F2937] gl-transition">
                    <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.has(user.id)} onChange={() => toggleSelect(user.id)} className="rounded" onClick={e => e.stopPropagation()} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 gl-navy rounded-full flex items-center justify-center text-[#D4A843] text-xs font-bold">
                          {getInitials(user.name ?? user.phone)}
                        </div>
                        <div>
                          <span className="font-medium text-[#0A1628] dark:text-[#F5F0E8] block">{user.name ?? "—"}</span>
                          {user.email && <span className="text-[10px] text-[#9CA3AF]">{user.email}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#6B7280]">{user.uniqueId ?? <span className="text-[#D1D5DB]">—</span>}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{user.phone ?? "—"}</td>
                    <td className="px-4 py-3"><KycBadge status={user.kycStatus} /></td>
                    <td className="px-4 py-3 text-[#6B7280]">{user.city ?? "—"}</td>
                    <td className="px-4 py-3 text-[#9CA3AF] text-xs">{user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {list.length >= LIMIT && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-500 font-semibold px-3">
              Page {page + 1} · {filtered.length} users shown
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={list.length < LIMIT}
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
