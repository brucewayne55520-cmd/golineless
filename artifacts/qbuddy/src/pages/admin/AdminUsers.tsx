import { useState } from "react";
import { useListAdminUsers } from "@workspace/api-client-react";
import { BadgeCheck, XCircle, Clock, AlertTriangle, Search, Shield } from "lucide-react";
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
  const { data: users, isLoading } = useListAdminUsers({ limit: 500 });
  const list = (users ?? []) as UserWithKyc[];

  const filtered = list.filter(u => {
    const matchesSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.phone?.includes(search) || u.email?.toLowerCase().includes(search.toLowerCase()) || u.uniqueId?.toLowerCase().includes(search.toLowerCase());
    const matchesKyc = kycFilter === "all" || u.kycStatus === kycFilter;
    return matchesSearch && matchesKyc;
  });

  const kycCounts = {
    pending: list.filter(u => u.kycStatus === "pending").length,
    verified: list.filter(u => u.kycStatus === "verified").length,
    rejected: list.filter(u => u.kycStatus === "rejected").length,
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-5">
          <h1 className="text-2xl font-black text-[#1A1A2E] flex items-center gap-2">Users</h1>
          <p className="text-gray-500 text-sm">{list.length} registered users · {kycCounts.pending} pending KYC</p>
        </div>

        {/* Search + KYC Filter */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, phone, email, or ID..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3FD4] bg-white"
            />
          </div>
          <div className="flex gap-1 bg-white p-1 rounded-xl border border-gray-200">
            {["all", "pending", "verified", "rejected"].map(f => (
              <button key={f} onClick={() => setKycFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${kycFilter === f ? "bg-[#1A1A2E] text-white" : "text-gray-500 hover:bg-gray-100"}`}>
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                {f === "pending" && kycCounts.pending > 0 && <span className="ml-1 px-1 py-0.5 rounded-full text-[9px] bg-amber-400 text-white font-bold">{kycCounts.pending}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["User", "Unique ID", "Phone", "KYC", "City", "Joined"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
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
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#6C3FD4] rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {getInitials(user.name ?? user.phone)}
                        </div>
                        <div>
                          <span className="font-medium text-[#1A1A2E] block">{user.name ?? "—"}</span>
                          {user.email && <span className="text-[10px] text-gray-400">{user.email}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{user.uniqueId ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-gray-500">{user.phone ?? "—"}</td>
                    <td className="px-4 py-3"><KycBadge status={user.kycStatus} /></td>
                    <td className="px-4 py-3 text-gray-500">{user.city ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
