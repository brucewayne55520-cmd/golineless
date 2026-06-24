import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PersonStanding, MapPin, Star, CheckCircle2, XCircle, X, Wifi } from "lucide-react";
import { useListAdminRunners, useReviewRunnerKyc } from "@workspace/api-client-react";
import type { Runner } from "@workspace/api-client-react";
import AdminSidebar from "@/components/AdminSidebar";
import { getInitials } from "@/lib/utils";

const TABS = ["pending", "verified", "rejected"];
const TAB_LABELS: Record<string, string> = { pending: "Pending KYC", verified: "Verified", rejected: "Rejected" };

export default function AdminRunners() {
  const [tab, setTab] = useState("pending");
  type RunnerWithDocs = Runner & { bankAccount?: string; bankIfsc?: string; bankAccountHolder?: string; aadhaarFront?: string; aadhaarBack?: string };
  const [selected, setSelected] = useState<RunnerWithDocs | null>(null);
  const [rejReason, setRejReason] = useState("");
  const { data: runners, isLoading, refetch } = useListAdminRunners({ kyc_status: tab as import("@workspace/api-client-react").ListAdminRunnersKycStatus });
  const reviewKyc = useReviewRunnerKyc();

  const list = (runners ?? []) as Required<import("@workspace/api-client-react").Runner>[];

  const handleReview = (action: "approve" | "reject") => {
    if (!selected) return;
    reviewKyc.mutate({ id: Number(selected.id), data: { action, rejectionReason: rejReason || undefined } as import("@workspace/api-client-react").KycReviewInput }, {
      onSuccess: () => { toast.success(action === "approve" ? "Comrade approved!" : "Runner rejected"); setSelected(null); refetch(); },
      onError: () => toast.error("Action failed"),
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-5">
          <h1 className="text-2xl font-black text-[#1A1A2E]">Comrades</h1>
        </div>

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

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-gray-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <PersonStanding size={40} className="mx-auto mb-3 opacity-40" />
            <p>No {TAB_LABELS[tab]} runners</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {list.map((runner: Required<import("@workspace/api-client-react").Runner>) => (
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
                  {/* Phase 6.1: Dispatch Allowed badge */}
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
                  className="w-full py-2 rounded-xl text-white text-sm font-semibold"
                  style={{ background: "linear-gradient(135deg, #6C3FD4, #9B6FF7)" }}
                >
                  Review KYC
                </button>
              </div>
            ))}
          </div>
        )}

        <AnimatePresence>            {selected != null && (
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
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                    <X size={22} />
                  </button>
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
                      {/* Phase 6.1: Temporary dispatch approval */}
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
                          style={{ background: "linear-gradient(135deg, #C9A84C, #D4B870)" }}
                        >
                          <Wifi size={16} /> Quick Approve — Allow Dispatch (KYC Pending)
                        </button>
                      )}
                      {selected.dispatchAllowed && selected.kycStatus === "pending" && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                          <Wifi size={16} className="text-amber-600" />
                          <span className="text-amber-700 text-sm font-semibold">Dispatch already enabled. Runner can receive tasks.</span>
                        </div>
                      )}

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
                          className="flex-1 py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2"
                          style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}
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
