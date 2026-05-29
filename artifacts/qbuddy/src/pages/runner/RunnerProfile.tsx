import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Star, CheckCircle2, Wallet, HelpCircle, FileText, Lock, ChevronRight, X, Camera } from "lucide-react";
import { useGetRunnerMe, useSubmitKyc, useLogout } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { RunnerBottomNav } from "@/components/BottomNav";
import { getInitials } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export default function RunnerProfile() {
  const [, navigate] = useLocation();
  const { logout } = useAuth();
  const { data: runner, refetch } = useGetRunnerMe();
  const submitKyc = useSubmitKyc();
  const logoutMutation = useLogout();
  const [showKyc, setShowKyc] = useState(false);
  const [form, setForm] = useState({
    fullName: "", aadhaarNumber: "", bankAccount: "", bankIfsc: "", bankAccountHolder: "",
    emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelation: "",
    agreed: false,
  });
  const [aadhaarFront, setAadhaarFront] = useState<string | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);

  const r = runner as any;

  const handleSubmitKyc = () => {
    if (!form.agreed) { toast.error("Please accept the agreement"); return; }
    submitKyc.mutate({
      data: { ...form, aadhaarFront, aadhaarBack, selfie } as any,
    }, {
      onSuccess: () => { toast.success("KYC submitted!"); setShowKyc(false); refetch(); },
      onError: () => toast.error("Failed to submit KYC"),
    });
  };

  const handleFileRead = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setter(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined as any, {
      onSettled: () => { logout(); navigate("/"); },
    });
  };

  const kycStatusColor = r?.kycStatus === "verified" ? "text-green-400 bg-green-400/20 border-green-400/30" :
    r?.kycStatus === "rejected" ? "text-red-400 bg-red-400/20 border-red-400/30" :
    "text-yellow-400 bg-yellow-400/20 border-yellow-400/30";

  const menuItems: { Icon: LucideIcon; label: string }[] = [
    { Icon: HelpCircle, label: "Help & Support" },
    { Icon: FileText, label: "Terms of Service" },
    { Icon: Lock, label: "Privacy Policy" },
  ];

  const stats: { Icon: LucideIcon; val: string | number; label: string; color: string }[] = [
    { Icon: CheckCircle2, val: r?.totalTasks ?? 0, label: "Tasks", color: "#22C55E" },
    { Icon: Star, val: r?.rating ? Number(r.rating).toFixed(1) : "—", label: "Rating", color: "#FF6B35" },
    { Icon: Wallet, val: r?.totalEarnings ? `Rs ${Math.round(Number(r.totalEarnings))}` : "Rs 0", label: "Earned", color: "#6C3FD4" },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ background: "#0F0F1A" }}>
      <div className="px-4 pt-5 pb-4 border-b border-white/10 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white" style={{ background: "linear-gradient(135deg, #FF6B35, #FF8C42)" }}>
          {getInitials(r?.name)}
        </div>
        <div>
          <h2 className="font-black text-white text-lg">{r?.name ?? "Runner"}</h2>
          <p className="text-white/50 text-sm">{r?.phone}</p>
          {r?.rating && (
            <p className="text-yellow-400 text-xs font-semibold flex items-center gap-1">
              <Star size={11} /> {Number(r.rating).toFixed(1)} · {r.totalTasks ?? 0} tasks
            </p>
          )}
        </div>
      </div>

      <div className="mx-4 mt-4">
        <div className={`rounded-2xl p-4 border ${kycStatusColor}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">
                KYC Status: {r?.kycStatus === "verified" ? "Verified" : r?.kycStatus === "rejected" ? "Rejected" : "Pending"}
              </p>
              {r?.kycStatus === "rejected" && r?.kycRejectionReason && (
                <p className="text-xs mt-1 opacity-70">Reason: {r.kycRejectionReason}</p>
              )}
              {r?.kycStatus === "pending" && <p className="text-xs opacity-70 mt-1">Under review, usually 24 hours</p>}
            </div>
            {r?.kycStatus !== "verified" && (
              <button
                onClick={() => setShowKyc(true)}
                className="px-3 py-1.5 rounded-xl text-white text-xs font-bold"
                style={{ background: "linear-gradient(135deg, #FF6B35, #FF8C42)" }}
              >
                {r?.kycStatus === "rejected" ? "Resubmit" : r?.fullName ? "Update" : "Submit KYC"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-4 mt-4 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white/8 border border-white/10 rounded-2xl p-3 text-center">
            <s.Icon size={20} className="mx-auto mb-1" style={{ color: s.color }} />
            <div className="text-white font-black">{s.val}</div>
            <div className="text-white/40 text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mx-4 mt-4 bg-white/8 border border-white/10 rounded-2xl overflow-hidden">
        {menuItems.map((item, i) => (
          <button key={item.label} className={`w-full flex items-center gap-3 px-4 py-3.5 text-left ${i > 0 ? "border-t border-white/5" : ""}`}>
            <item.Icon size={16} className="text-white/50" />
            <span className="text-white/70 text-sm flex-1">{item.label}</span>
            <ChevronRight size={14} className="text-white/30" />
          </button>
        ))}
      </div>

      <div className="mx-4 mt-3">
        <button onClick={handleLogout} className="w-full py-3.5 rounded-2xl text-red-400 font-bold border border-red-400/30 hover:bg-red-400/10 transition-colors">
          Logout
        </button>
      </div>

      <AnimatePresence>
        {showKyc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-50 flex items-end">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-[#1A1A2E] w-full max-h-[90vh] rounded-t-3xl overflow-y-auto p-5"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white font-black text-xl">KYC Verification</h2>
                <button onClick={() => setShowKyc(false)} className="text-white/50">
                  <X size={22} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-white/60 text-xs font-semibold mb-2 uppercase">Personal Info</p>
                  {[
                    { key: "fullName", label: "Full Name", placeholder: "As per Aadhaar" },
                    { key: "aadhaarNumber", label: "Aadhaar Number", placeholder: "XXXX XXXX XXXX", type: "tel" },
                  ].map((f) => (
                    <div key={f.key} className="mb-3">
                      <label className="text-white/50 text-xs mb-1 block">{f.label}</label>
                      <input
                        type={f.type ?? "text"}
                        value={(form as any)[f.key]}
                        onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF6B35]"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-white/60 text-xs font-semibold mb-2 uppercase">Documents</p>
                  {[
                    { label: "Aadhaar Front", val: aadhaarFront, setter: setAadhaarFront },
                    { label: "Aadhaar Back", val: aadhaarBack, setter: setAadhaarBack },
                    { label: "Selfie", val: selfie, setter: setSelfie },
                  ].map((doc) => (
                    <label key={doc.label} className="block cursor-pointer mb-3">
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileRead(doc.setter)} />
                      <div className={`border-2 border-dashed rounded-xl p-4 text-center ${doc.val ? "border-green-500/50 bg-green-500/10" : "border-white/20"}`}>
                        {doc.val ? (
                          <div>
                            <img src={doc.val} alt="" className="w-16 h-16 object-cover rounded-lg mx-auto mb-1" />
                            <p className="text-green-400 text-xs">{doc.label} uploaded</p>
                          </div>
                        ) : (
                          <p className="text-white/40 text-sm flex items-center justify-center gap-1">
                            <Camera size={14} /> {doc.label}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                <div>
                  <p className="text-white/60 text-xs font-semibold mb-2 uppercase">Bank Details</p>
                  {[
                    { key: "bankAccountHolder", label: "Account Holder Name" },
                    { key: "bankAccount", label: "Account Number" },
                    { key: "bankIfsc", label: "IFSC Code" },
                  ].map((f) => (
                    <div key={f.key} className="mb-3">
                      <label className="text-white/50 text-xs mb-1 block">{f.label}</label>
                      <input
                        value={(form as any)[f.key]}
                        onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={f.label}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF6B35]"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-white/60 text-xs font-semibold mb-2 uppercase">Emergency Contact</p>
                  {[
                    { key: "emergencyContactName", label: "Name" },
                    { key: "emergencyContactPhone", label: "Phone" },
                    { key: "emergencyContactRelation", label: "Relation" },
                  ].map((f) => (
                    <div key={f.key} className="mb-3">
                      <label className="text-white/50 text-xs mb-1 block">{f.label}</label>
                      <input
                        value={(form as any)[f.key]}
                        onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={f.label}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF6B35]"
                      />
                    </div>
                  ))}
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.agreed} onChange={(e) => setForm(prev => ({ ...prev, agreed: e.target.checked }))} className="mt-0.5 accent-[#FF6B35]" />
                  <span className="text-white/50 text-xs">I agree that all information provided is accurate and true. I understand that providing false information may lead to account suspension.</span>
                </label>

                <button
                  onClick={handleSubmitKyc}
                  disabled={submitKyc.isPending}
                  className="w-full py-4 rounded-2xl text-white font-bold"
                  style={{ background: "linear-gradient(135deg, #FF6B35, #FF8C42)" }}
                >
                  {submitKyc.isPending ? "Submitting..." : "Submit KYC"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <RunnerBottomNav />
    </div>
  );
}
