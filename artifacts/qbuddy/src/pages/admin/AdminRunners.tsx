import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useListAdminRunners, useReviewRunnerKyc } from "@workspace/api-client-react";
import AdminSidebar from "@/components/AdminSidebar";
import { getInitials } from "@/lib/utils";

const TABS = ["pending", "verified", "rejected"];
const TAB_LABELS: Record<string, string> = { pending: "Pending KYC", verified: "Verified", rejected: "Rejected" };

export default function AdminRunners() {
  const [tab, setTab] = useState("pending");
  const [selected, setSelected] = useState<any | null>(null);
  const [rejReason, setRejReason] = useState("");
  const { data: runners, isLoading, refetch } = useListAdminRunners({ params: { kyc_status: tab } } as any);
  const reviewKyc = useReviewRunnerKyc();

  const list = (runners as any[]) ?? [];

  const handleReview = (action: "approve" | "reject") => {
    if (!selected) return;
    reviewKyc.mutate({ id: String(selected.id), body: { action, rejectionReason: rejReason || undefined } } as any, {
      onSuccess: () => { toast.success(action === "approve" ? "Runner approved!" : "Runner rejected"); setSelected(null); refetch(); },
      onError: () => toast.error("Action failed"),
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-5">
          <h1 className="text-2xl font-black text-[#1A1A2E]">Runners</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? "bg-[#6C3FD4] text-white" : "bg-white text-gray-600 border border-gray-200"}`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-gray-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">🏃</div>
            <p>No {TAB_LABELS[tab]} runners</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {list.map((runner: any) => (
              <div key={runner.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-[#6C3FD4] rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {getInitials(runner.name)}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1A1A2E]">{runner.name ?? runner.phone}</h3>
                    <p className="text-xs text-gray-500">{runner.phone}</p>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-gray-500 mb-4">
                  {runner.city && <p>📍 {runner.city}, {runner.area}</p>}
                  {runner.rating && <p>⭐ {Number(runner.rating).toFixed(1)} · {runner.totalTasks} tasks</p>}
                  <p>Joined: {new Date(runner.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
                <button
                  onClick={() => { setSelected(runner); setRejReason(""); }}
                  className="w-full py-2 rounded-xl text-white text-sm font-semibold"
                  style={{ background: "linear-gradient(135deg, #6C3FD4, #9B6FF7)" }}
                >
                  Review KYC
                </button>
              </div>
            ))}
          </div>
        )}

        {/* KYC Review Modal */}
        <AnimatePresence>
          {selected && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelected(null)} />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="fixed inset-4 md:inset-20 bg-white rounded-3xl z-50 overflow-y-auto shadow-2xl"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-xl font-black text-[#1A1A2E]">KYC Review — {selected.name ?? selected.phone}</h2>
                  <button onClick={() => setSelected(null)} className="text-gray-400 text-2xl hover:text-gray-600">×</button>
                </div>
                <div className="p-6 grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-bold text-gray-700 mb-3">Personal Info</h3>
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
                          <dd className="font-medium text-[#1A1A2E]">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <h3 className="font-bold text-gray-700 mt-5 mb-3">Bank Details</h3>
                    <dl className="space-y-2 text-sm">
                      {[
                        ["Account", selected.bankAccount ?? "—"],
                        ["IFSC", selected.bankIfsc ?? "—"],
                        ["Holder", selected.bankAccountHolder ?? "—"],
                      ].map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <dt className="text-gray-400 w-24 flex-shrink-0">{k}:</dt>
                          <dd className="font-medium text-[#1A1A2E]">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-700 mb-3">Documents</h3>
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
                <div className="p-6 border-t border-gray-100 space-y-4">
                  {tab === "pending" && (
                    <>
                      <input
                        value={rejReason}
                        onChange={e => setRejReason(e.target.value)}
                        placeholder="Rejection reason (if rejecting)"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3FD4]"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleReview("approve")}
                          disabled={reviewKyc.isPending}
                          className="flex-1 py-3 rounded-xl text-white font-bold"
                          style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => handleReview("reject")}
                          disabled={reviewKyc.isPending}
                          className="flex-1 py-3 rounded-xl text-white font-bold bg-red-500 hover:bg-red-600"
                        >
                          ❌ Reject
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
