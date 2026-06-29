import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PersonStanding, MapPin, Star, CheckCircle2, XCircle, X, Wifi, Download, Search } from "lucide-react";
import { useListAdminRunners, useReviewRunnerKyc } from "@workspace/api-client-react";
import type { Runner } from "@workspace/api-client-react";
import AdminSidebar from "@/components/AdminSidebar";
import { getInitials } from "@/lib/utils";
import { BLUE_GRAD } from "@/lib/theme";

const TABS = ["pending", "verified", "rejected"];
const TAB_LABELS: Record<string, string> = { pending: "Pending KYC", verified: "Verified", rejected: "Rejected" };
const LIMIT = 50;

export default function AdminRunners() {
  const [tab, setTab] = useState("pending");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  type RunnerWithDocs = Runner & { bankAccount?: string; bankIfsc?: string; bankAccountHolder?: string; aadhaarFront?: string; aadhaarBack?: string };
  const [selected, setSelected] = useState<RunnerWithDocs | null>(null);
  const [rejReason, setRejReason] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const { data: runners, isLoading, refetch } = useListAdminRunners({
    kyc_status: tab as import("@workspace/api-client-react").ListAdminRunnersKycStatus,
    limit: LIMIT,
    offset: page * LIMIT,
  });
  const reviewKyc = useReviewRunnerKyc();

  const list = (runners ?? []) as Required<import("@workspace/api-client-react").Runner>[];

  // Client-side search filter
  const filtered = list.filter(r =>
    !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.phone?.includes(search) || r.city?.toLowerCase().includes(search.toLowerCase()) || r.area?.toLowerCase().includes(search.toLowerCase())
  );

  const allSelected = filtered.length > 0 && filtered.every(r => selectedIds.has(Number(r.id)));
  const toggleSelectAll = () => {
    if (allSelected) { setSelectedIds(new Set()); } else { setSelectedIds(new Set(filtered.map(r => Number(r.id)))); }
  };
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const handleReview = (action: "approve" | "reject") => {
    if (!selected) return;
    reviewKyc.mutate({ id: Number(selected.id), data: { action, rejectionReason: rejReason || undefined } as import("@workspace/api-client-react").KycReviewInput }, {
      onSuccess: () => { toast.success(action === "approve" ? "Comrade approved!" : "Runner rejected"); setSelected(null); refetch(); },
      onError: () => toast.error("Action failed"),
    });
  };

  // CSV export for current tab (selected or all)
  const exportCsv = useCallback(() => {
    const data = selectedIds.size > 0 ? filtered.filter(r => selectedIds.has(Number(r.id))) : filtered;
    if (data.length === 0) { toast.error("No runners to export"); return; }
    const header = "ID,Name,Phone,Email,City,Area,Trust Score,Badge,Rating,Tasks Completed,KYC Status,Dispatch Allowed,Joined\n";
    const escape = (v: string) => v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    const rows = data.map(r =>
      [r.id, r.name ?? "", r.phone ?? "", r.email ?? "", r.city ?? "", r.area ?? "", r.trustScore ?? "", r.trustBadge ?? "", r.rating ?? "", r.tasksCompleted ?? "", r.kycStatus ?? "", r.dispatchAllowed ? "Yes" : "No", r.createdAt ? new Date(r.createdAt).toISOString().split("T")[0] : ""].map(v => escape(String(v))).join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `runners-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${data.length} runners`);
  }, [filtered, tab, selectedIds]);

  return (
    <div className="flex min-h-screen gl-surface dark:bg-[#0A0E1A]">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Comrades</h1>
            <p className="text-gray-500 text-sm">Page {page + 1} · {filtered.length} runners shown ({TAB_LABELS[tab]}){selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ""}</p>
          </div>
          <button onClick={exportCsv} disabled={filtered.length === 0} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151] hover:bg-gray-50 dark:hover:bg-[#111827] disabled:opacity-40 gl-transition">
            <Download size={14} /> Export CSV{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search by name, phone, city, or area..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#374151] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#1F2937] dark:text-gray-100 gl-transition"
            />
          </div>
          <div className="flex gap-1 bg-white dark:bg-[#1F2937] p-1 rounded-xl border border-gray-200 dark:border-[#374151]">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setPage(0); setSelectedIds(new Set()); }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold gl-transition ${tab === t ? "bg-gray-900 dark:bg-blue-600 text-white dark:text-gray-900" : "bg-white dark:bg-[#1F2937] text-gray-500 border border-gray-200 dark:border-[#374151]"}`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i =>            <div key={i} className="h-48 bg-gray-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <PersonStanding size={40} className="mx-auto mb-3 opacity-40" />
            <p>No {TAB_LABELS[tab]} runners{search ? ` matching "${search}"` : ""}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Select all checkbox */}
            <div className="col-span-full flex items-center gap-2 mb-2">
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="rounded" />
              <span className="text-xs text-gray-500 font-semibold">{allSelected ? "Deselect all" : "Select all"}</span>
            </div>
            {filtered.map((runner: Required<import("@workspace/api-client-react").Runner>) => (
              <div key={runner.id} className={`bg-white dark:bg-[#111827] rounded-2xl p-5 gl-shadow-md border ${selectedIds.has(Number(runner.id)) ? "border-[#6366F1] ring-1 ring-[#C7D2FE]" : "border-gray-200 dark:border-[#1F2937]"} gl-transition`}>
                <div className="flex items-center gap-3 mb-3">
                  <input type="checkbox" checked={selectedIds.has(Number(runner.id))} onChange={() => toggleSelect(Number(runner.id))} className="rounded" />
                  <div className="w-12 h-12 gl-navy rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                    {getInitials(runner.name)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">{runner.name ?? runner.phone}</h3>
                    <p className="text-xs text-gray-500">{runner.phone}</p>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-gray-500 mb-4">
                  {runner.city && (
                    <p className="flex items-center gap-1">
                      <MapPin size={11} /> {runner.city}, {runner.area}
                    </p>
                  )}
                  {runner.trustScore != null && (
                    <p className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        runner.trustScore >= 95 ? "bg-yellow-400" :
                        runner.trustScore >= 90 ? "bg-green-400" :
                        runner.trustScore >= 80 ? "bg-blue-400" :
                        runner.trustScore >= 70 ? "bg-gray-400" :
                        "bg-red-400"
                      }`} />
                      <span className="font-bold">{runner.trustScore}</span> Trust Score
                      {runner.trustBadge && runner.trustBadge !== "improving" && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          runner.trustBadge === "elite" ? "bg-yellow-100 text-yellow-700" :
                          runner.trustBadge === "trusted" ? "bg-green-100 text-green-700" :
                          runner.trustBadge === "verified" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>{runner.trustBadge}</span>
                      )}
                    </p>
                  )}
                  {runner.rating && (
                    <p className="flex items-center gap-1">
                      <Star size={11} className="text-yellow-400" /> {Number(runner.rating).toFixed(1)} · {runner.totalTasks} tasks
                    </p>
                  )}
                  {runner.tasksCompleted != null && (
                    <p className="text-gray-400">{runner.tasksCompleted}/{runner.tasksAccepted ?? 0} completed</p>
                  )}
                  <p>Joined: {new Date(runner.createdAt).toLocaleDateString("en-IN")}</p>
                  {runner.dispatchAllowed && runner.kycStatus === "pending" && (
                    <p className="flex items-center gap-1 text-amber-600">
                      <Wifi size={11} /> Dispatch enabled (temp)
                    </p>
                  )}
                  {runner.onboardingCompleted && (
                    <p className="text-gray-400 text-[10px]">Onboarding ✓</p>
                  )}
                </div>
                <button
                  onClick={() => { setSelected(runner); setRejReason(""); }}
                  className="w-full py-2 rounded-xl text-gray-900 text-sm font-bold gl-transition hover:gl-shadow-lg active:scale-[0.98]"
                  style={{ background: BLUE_GRAD }}
                >
                  Review KYC
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {list.length >= LIMIT && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-[#374151] disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-[#1F2937] gl-transition"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-500 font-semibold px-3">
              Page {page + 1}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={list.length < LIMIT}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-[#374151] disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-[#1F2937] gl-transition"
            >
              Next →
            </button>
          </div>
        )}

        <AnimatePresence>            {selected != null && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelected(null)} />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="fixed inset-4 md:inset-20 bg-white dark:bg-[#111827] rounded-3xl z-50 overflow-y-auto gl-shadow-xl"
              >
                <div className="p-6 border-b border-gray-200 dark:border-[#1F2937] flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">KYC Review — {selected.name ?? selected.phone}</h2>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-500 gl-transition">
                    <X size={22} />
                  </button>
                </div>
                <div className="p-6 grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-bold text-[#374151] mb-3">Personal Info</h3>
                    <dl className="space-y-2 text-sm">
                      {[
                        ["Full Name", selected.fullName ?? selected.name ?? "—"],
                        ["Phone", selected.phone],
                        ["Email", selected.email ?? "—"],
                        ["City", selected.city ?? "—"],
                        ["Area", selected.area ?? "—"],
                      ].map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <dt className="text-gray-400 w-24 flex-shrink-0">{k}:</dt>
                          <dd className="font-medium text-gray-900 dark:text-gray-100">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <h3 className="font-bold text-[#374151] mt-5 mb-3">Bank Details</h3>
                    <dl className="space-y-2 text-sm">
                      {[
                        ["Account", selected.bankAccount ?? "—"],
                        ["IFSC", selected.bankIfsc ?? "—"],
                        ["Holder", selected.bankAccountHolder ?? "—"],
                      ].map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <dt className="text-gray-400 w-24 flex-shrink-0">{k}:</dt>
                          <dd className="font-medium text-gray-900 dark:text-gray-100">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#374151] mb-3">Documents</h3>
                    <div className="space-y-3">
                      {[
                        { label: "Aadhaar Front", src: selected.aadhaarFront },
                        { label: "Aadhaar Back", src: selected.aadhaarBack },
                        { label: "Selfie", src: selected.selfie },
                      ].map((doc) => (
                        <div key={doc.label}>
                          <p className="text-xs text-gray-500 mb-1">{doc.label}</p>
                          {doc.src ? (
                            <img src={doc.src} alt={doc.label} className="w-full max-h-36 object-cover rounded-xl border border-gray-200" />
                          ) : (
                            <div className="h-24 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm">Not uploaded</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="p-6 border-t border-gray-200 dark:border-[#1F2937] space-y-4">
                  {tab === "pending" && (
                    <>
                      {selected.kycStatus === "pending" && !selected.dispatchAllowed && (
                        <button
                          onClick={() => {
                            reviewKyc.mutate({ id: Number(selected.id), data: { dispatchAllowed: true } as import("@workspace/api-client-react").KycReviewInput }, {
                              onSuccess: () => { toast.success("Dispatch allowed! Runner can now receive tasks while KYC is pending."); setSelected(null); refetch(); },
                              onError: () => toast.error("Failed to update"),
                            });
                          }}
                          disabled={reviewKyc.isPending}
                          className="w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2"
                          style={{ background: BLUE_GRAD }}
                        >
                          <Wifi size={16} /> Quick Approve — Allow Dispatch (KYC Pending)
                        </button>
                      )}
                      {selected.dispatchAllowed && selected.kycStatus === "pending" && (
                        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3 flex items-center gap-2">
                          <Wifi size={16} className="text-[#D97706]" />
                          <span className="text-[#B45309] text-sm font-semibold">Dispatch already enabled. Runner can receive tasks.</span>
                        </div>
                      )}

                      <input
                        value={rejReason}
                        onChange={e => setRejReason(e.target.value)}
                        placeholder="Rejection reason (if rejecting)"
                        className="w-full border border-gray-200 dark:border-[#374151] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 gl-transition"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleReview("approve")}
                          disabled={reviewKyc.isPending}
                          className="flex-1 py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2"
                          style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}
                        >
                          <CheckCircle2 size={16} /> Full Approve (KYC Verified)
                        </button>
                        <button
                          onClick={() => handleReview("reject")}
                          disabled={reviewKyc.isPending}
                          className="flex-1 py-3 rounded-xl text-white font-bold bg-red-500 hover:bg-red-600 flex items-center justify-center gap-2"
                        >
                          <XCircle size={16} /> Reject
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
