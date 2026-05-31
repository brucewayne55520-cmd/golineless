import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Star, CheckCircle2, Wallet, HelpCircle, FileText, Lock, ChevronRight, X, Camera, Shield } from "lucide-react";
import { useGetRunnerMe, useSubmitKyc, useLogout } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { RunnerBottomNav } from "@/components/BottomNav";
import { getInitials } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const GOLD = "#C9A84C";
const GOLD_GRAD = "linear-gradient(135deg, #C9A84C, #D4B870)";
const BG = "#080E1E";

const KYC_STEPS = [
  { key: "personal", label: "Personal Details" },
  { key: "documents", label: "Aadhaar Upload" },
  { key: "selfie", label: "Selfie Verification" },
  { key: "bank", label: "Bank Details" },
  { key: "emergency", label: "Emergency Contact" },
  { key: "agreement", label: "Agreement" },
];

export default function RunnerProfile() {
  const [, navigate] = useLocation();
  const { logout } = useAuth();
  const { data: runner, refetch } = useGetRunnerMe();
  const submitKyc = useSubmitKyc();
  const logoutMutation = useLogout();
  const [showKyc, setShowKyc] = useState(false);
  const [kycStep, setKycStep] = useState(0);
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

  const kycStatusColor = r?.kycStatus === "verified"
    ? "text-green-400 bg-green-400/20 border-green-400/30"
    : r?.kycStatus === "rejected"
    ? "text-red-400 bg-red-400/20 border-red-400/30"
    : "text-yellow-400 bg-yellow-400/20 border-yellow-400/30";

  const menuItems: { Icon: LucideIcon; label: string }[] = [
    { Icon: HelpCircle, label: "Help & Support" },
    { Icon: FileText, label: "Terms of Service" },
    { Icon: Lock, label: "Privacy Policy" },
  ];

  const stats: { Icon: LucideIcon; val: string | number; label: string; color: string }[] = [
    { Icon: CheckCircle2, val: r?.totalTasks ?? 0, label: "Tasks", color: "#22C55E" },
    { Icon: Star, val: r?.rating ? Number(r.rating).toFixed(1) : "—", label: "Rating", color: GOLD },
    { Icon: Wallet, val: r?.totalEarnings ? `Rs ${Math.round(Number(r.totalEarnings))}` : "Rs 0", label: "Earned", color: "#60A5FA" },
  ];

  const inputClass = "w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none transition-colors";

  return (
    <div className="min-h-screen pb-24" style={{ background: BG }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-white/10 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-[#0A1628]"
          style={{ background: GOLD_GRAD }}>
          {getInitials(r?.name)}
        </div>
        <div>
          <h2 className="font-black text-white text-lg">{r?.name ?? "Runner"}</h2>
          <p className="text-white/50 text-sm">{r?.phone}</p>
          {r?.rating && (
            <p className="text-xs font-semibold flex items-center gap-1" style={{ color: GOLD }}>
              <Star size={11} /> {Number(r.rating).toFixed(1)} · {r.totalTasks ?? 0} tasks
            </p>
          )}
        </div>
        {r?.kycStatus === "verified" && (
          <div className="ml-auto flex items-center gap-1 text-green-400 text-xs font-semibold bg-green-400/20 border border-green-400/30 px-2 py-1 rounded-lg">
            <Shield size={12} /> Verified
          </div>
        )}
      </div>

      {/* KYC Status */}
      <div className="mx-4 mt-4">
        <div className={`rounded-2xl p-4 border ${kycStatusColor}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">
                KYC: {r?.kycStatus === "verified" ? "✓ Verified" : r?.kycStatus === "rejected" ? "Rejected" : "Pending Review"}
              </p>
              {r?.kycStatus === "rejected" && r?.kycRejectionReason && (
                <p className="text-xs mt-1 opacity-70">Reason: {r.kycRejectionReason}</p>
              )}
              {r?.kycStatus === "pending" && <p className="text-xs opacity-70 mt-1">Under review · usually within 24 hours</p>}
            </div>
            {r?.kycStatus !== "verified" && (
              <button
                onClick={() => setShowKyc(true)}
                className="px-3 py-1.5 rounded-xl text-[#0A1628] text-xs font-bold"
                style={{ background: GOLD_GRAD }}
              >
                {r?.kycStatus === "rejected" ? "Resubmit" : r?.fullName ? "Update" : "Submit KYC"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-4 mt-4 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white/8 border border-white/10 rounded-2xl p-3 text-center">
            <s.Icon size={20} className="mx-auto mb-1" style={{ color: s.color }} />
            <div className="text-white font-black">{s.val}</div>
            <div className="text-white/40 text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Menu */}
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

      {/* KYC Modal */}
      <AnimatePresence>
        {showKyc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-50 flex items-end">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-h-[92vh] rounded-t-3xl overflow-y-auto p-5"
              style={{ background: "#0F2557" }}
            >
              {/* KYC header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-black text-xl">KYC Verification</h2>
                <button onClick={() => setShowKyc(false)} className="text-white/50"><X size={22} /></button>
              </div>

              {/* Step progress */}
              <div className="flex gap-1 mb-5">
                {KYC_STEPS.map((s, i) => (
                  <div key={s.key} className="flex-1 h-1.5 rounded-full transition-all"
                    style={{ background: i <= kycStep ? GOLD : "rgba(255,255,255,0.2)" }} />
                ))}
              </div>
              <p className="text-white/60 text-xs font-semibold mb-4 uppercase tracking-wider">
                Step {kycStep + 1}/{KYC_STEPS.length}: {KYC_STEPS[kycStep].label}
              </p>

              <div className="space-y-4">
                {kycStep === 0 && (
                  <div className="space-y-3">
                    {[
                      { key: "fullName", label: "Full Name", placeholder: "As per Aadhaar" },
                      { key: "aadhaarNumber", label: "Aadhaar Number", placeholder: "XXXX XXXX XXXX", type: "tel" },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="text-white/50 text-xs mb-1 block">{f.label}</label>
                        <input
                          type={f.type ?? "text"}
                          value={(form as any)[f.key]}
                          onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className={inputClass}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {kycStep === 1 && (
                  <div className="space-y-3">
                    {[
                      { label: "Aadhaar Front", val: aadhaarFront, setter: setAadhaarFront },
                      { label: "Aadhaar Back", val: aadhaarBack, setter: setAadhaarBack },
                    ].map((doc) => (
                      <label key={doc.label} className="block cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileRead(doc.setter)} />
                        <div className={`border-2 border-dashed rounded-xl p-4 text-center ${doc.val ? "border-green-500/50 bg-green-500/10" : "border-white/20"}`}>
                          {doc.val ? (
                            <div>
                              <img src={doc.val} alt="" className="w-16 h-16 object-cover rounded-lg mx-auto mb-1" />
                              <p className="text-green-400 text-xs font-semibold">{doc.label} uploaded ✓</p>
                            </div>
                          ) : (
                            <p className="text-white/40 text-sm flex items-center justify-center gap-1">
                              <Camera size={14} /> Tap to upload {doc.label}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {kycStep === 2 && (
                  <div>
                    <label className="block cursor-pointer">
                      <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleFileRead(setSelfie)} />
                      <div className={`border-2 border-dashed rounded-xl p-8 text-center ${selfie ? "border-green-500/50 bg-green-500/10" : "border-white/20"}`}>
                        {selfie ? (
                          <div>
                            <img src={selfie} alt="" className="w-24 h-24 object-cover rounded-full mx-auto mb-2 border-4" style={{ borderColor: "#C9A84C" }} />
                            <p className="text-green-400 text-sm font-semibold">Selfie uploaded ✓</p>
                          </div>
                        ) : (
                          <div>
                            <Camera size={32} className="text-white/30 mx-auto mb-2" />
                            <p className="text-white/50 text-sm">Take a clear selfie</p>
                            <p className="text-white/30 text-xs mt-1">Face should be clearly visible</p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                )}

                {kycStep === 3 && (
                  <div className="space-y-3">
                    {[
                      { key: "bankAccountHolder", label: "Account Holder Name" },
                      { key: "bankAccount", label: "Account Number" },
                      { key: "bankIfsc", label: "IFSC Code" },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="text-white/50 text-xs mb-1 block">{f.label}</label>
                        <input
                          value={(form as any)[f.key]}
                          onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder={f.label}
                          className={inputClass}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {kycStep === 4 && (
                  <div className="space-y-3">
                    {[
                      { key: "emergencyContactName", label: "Name" },
                      { key: "emergencyContactPhone", label: "Phone" },
                      { key: "emergencyContactRelation", label: "Relation (e.g. Mother)" },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="text-white/50 text-xs mb-1 block">{f.label}</label>
                        <input
                          value={(form as any)[f.key]}
                          onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder={f.label}
                          className={inputClass}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {kycStep === 5 && (
                  <div>
                    <div className="bg-white/10 rounded-2xl p-4 mb-4 text-white/70 text-xs leading-relaxed space-y-2">
                      <p className="font-semibold text-white">Runner Agreement</p>
                      <p>By submitting KYC, I confirm that all information provided is accurate and true.</p>
                      <p>I understand that providing false information may lead to permanent account suspension.</p>
                      <p>I agree to abide by Go LineLess's code of conduct and runner guidelines.</p>
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.agreed} onChange={(e) => setForm(prev => ({ ...prev, agreed: e.target.checked }))} className="mt-0.5" style={{ accentColor: GOLD }} />
                      <span className="text-white/60 text-xs">I have read and agree to the above terms and conditions.</span>
                    </label>
                  </div>
                )}

                {kycStep < KYC_STEPS.length - 1 ? (
                  <button
                    onClick={() => setKycStep(s => s + 1)}
                    className="w-full py-4 rounded-2xl text-[#0A1628] font-bold mt-2"
                    style={{ background: GOLD_GRAD }}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitKyc}
                    disabled={submitKyc.isPending}
                    className="w-full py-4 rounded-2xl text-[#0A1628] font-bold mt-2"
                    style={{ background: GOLD_GRAD }}
                  >
                    {submitKyc.isPending ? "Submitting..." : "Submit KYC"}
                  </button>
                )}

                {kycStep > 0 && (
                  <button onClick={() => setKycStep(s => s - 1)} className="w-full py-2 text-white/40 text-sm text-center">
                    ← Back
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <RunnerBottomNav />
    </div>
  );
}
