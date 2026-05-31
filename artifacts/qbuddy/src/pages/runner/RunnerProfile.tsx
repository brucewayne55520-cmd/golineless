import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Star, CheckCircle2, Wallet, HelpCircle, FileText, Lock, ChevronRight, X, Camera, Shield, TrendingUp, Award } from "lucide-react";
import { useGetRunnerMe, useSubmitKyc, useLogout } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { RunnerBottomNav } from "@/components/BottomNav";
import { getInitials, formatCurrency } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const GOLD = "#C9A84C";
const GOLD_GRAD = "linear-gradient(135deg, #C9A84C, #D4B870)";
const NAVY_GRAD = "linear-gradient(135deg, #0F2557, #1D3D7C)";
const BG = "#080E1E";

const KYC_STEPS = [
  { key: "personal", label: "Personal Details", desc: "Your legal name & Aadhaar" },
  { key: "documents", label: "Aadhaar Upload", desc: "Front & back of card" },
  { key: "selfie", label: "Selfie Verification", desc: "Clear face photo" },
  { key: "bank", label: "Bank Details", desc: "For earnings transfer" },
  { key: "emergency", label: "Emergency Contact", desc: "Someone we can reach" },
  { key: "agreement", label: "Agreement", desc: "Runner code of conduct" },
];

const SPECIALIZATIONS = [
  { key: "hospital", label: "Hospital Expert", color: "#3B82F6" },
  { key: "senior", label: "Senior Care", color: "#EC4899" },
  { key: "bank", label: "Banking Help", color: "#10B981" },
  { key: "documentation", label: "Documentation", color: "#8B5CF6" },
  { key: "emergency", label: "Emergency Runner", color: "#EF4444" },
  { key: "female", label: "Female Assistant", color: "#F472B6" },
];

function getTrustLevel(tasks: number, rating: number) {
  if (tasks >= 100 && rating >= 4.7) return { label: "Elite Runner", next: null, progress: 100, color: "#C9A84C" };
  if (tasks >= 50 && rating >= 4.5) return { label: "Pro Runner", next: "100 tasks & 4.7★ for Elite", progress: Math.min((tasks / 100) * 100, 95), color: "#10B981" };
  if (tasks >= 20 && rating >= 4.0) return { label: "Trusted Runner", next: "50 tasks & 4.5★ for Pro", progress: Math.min((tasks / 50) * 100, 95), color: "#3B82F6" };
  if (tasks >= 5) return { label: "Active Runner", next: "20 tasks & 4.0★ for Trusted", progress: Math.min((tasks / 20) * 100, 95), color: "#9CA3AF" };
  return { label: "New Runner", next: "Complete 5 tasks to become Active", progress: Math.min((tasks / 5) * 100, 95), color: "#9CA3AF" };
}

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
  const totalTasks = r?.totalTasks ?? 0;
  const rating = r?.rating ? Number(r.rating) : 0;
  const trust = getTrustLevel(totalTasks, rating);

  const handleSubmitKyc = () => {
    if (!form.agreed) { toast.error("Please accept the runner agreement"); return; }
    submitKyc.mutate({
      data: { ...form, aadhaarFront, aadhaarBack, selfie } as any,
    }, {
      onSuccess: () => { toast.success("KYC submitted! Under review — typically within 24 hours."); setShowKyc(false); refetch(); },
      onError: () => toast.error("Failed to submit KYC. Please try again."),
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
    ? "text-green-400 bg-green-400/10 border-green-400/30"
    : r?.kycStatus === "rejected"
    ? "text-red-400 bg-red-400/10 border-red-400/30"
    : "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";

  const menuItems: { Icon: LucideIcon; label: string; sub: string }[] = [
    { Icon: HelpCircle, label: "Help & Support", sub: "FAQs, contact us" },
    { Icon: FileText, label: "Terms of Service", sub: "Runner agreement" },
    { Icon: Lock, label: "Privacy Policy", sub: "Your data rights" },
  ];

  const stats: { Icon: LucideIcon; val: string | number; label: string; color: string; bg: string }[] = [
    { Icon: CheckCircle2, val: r?.totalTasks ?? 0, label: "Tasks Done", color: "#22C55E", bg: "#22C55E20" },
    { Icon: Star, val: rating > 0 ? rating.toFixed(1) : "—", label: "Avg Rating", color: GOLD, bg: `${GOLD}20` },
    { Icon: Wallet, val: r?.totalEarnings ? `Rs ${Math.round(Number(r.totalEarnings))}` : "Rs 0", label: "Total Earned", color: "#60A5FA", bg: "#60A5FA20" },
  ];

  const inputClass = "w-full bg-white/10 border border-white/20 rounded-xl px-3.5 py-3 text-white text-sm focus:outline-none focus:border-white/40 transition-colors placeholder-white/30";

  return (
    <div className="min-h-screen pb-24" style={{ background: BG }}>
      {/* Profile header */}
      <div className="px-4 pt-6 pb-5 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-[#0A1628] shadow-lg"
            style={{ background: GOLD_GRAD }}>
            {getInitials(r?.name)}
          </div>
          <div className="flex-1">
            <h2 className="font-black text-white text-xl leading-tight">{r?.name ?? "Runner"}</h2>
            <p className="text-white/40 text-sm">{r?.phone}</p>
            {rating > 0 && (
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1">
                  <Star size={12} fill={GOLD} style={{ color: GOLD }} />
                  <span className="text-xs font-bold" style={{ color: GOLD }}>{rating.toFixed(1)}</span>
                </div>
                <span className="text-white/30 text-xs">·</span>
                <span className="text-white/40 text-xs">{totalTasks} tasks completed</span>
              </div>
            )}
          </div>
          {r?.kycStatus === "verified" && (
            <div className="flex items-center gap-1 text-green-400 text-xs font-bold bg-green-400/15 border border-green-400/30 px-2.5 py-1.5 rounded-xl">
              <Shield size={12} /> Verified
            </div>
          )}
        </div>
      </div>

      {/* Trust score card */}
      {r?.kycStatus === "verified" && (
        <div className="mx-4 mt-4 rounded-2xl p-4 border border-white/10" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Award size={14} style={{ color: trust.color }} />
              <span className="text-sm font-black" style={{ color: trust.color }}>{trust.label}</span>
            </div>
            <TrendingUp size={14} className="text-white/30" />
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${trust.progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: trust.color }}
            />
          </div>
          {trust.next && (
            <p className="text-white/40 text-[10px]">🎯 Next: {trust.next}</p>
          )}
        </div>
      )}

      {/* KYC status */}
      <div className="mx-4 mt-3">
        <div className={`rounded-2xl p-4 border ${kycStatusColor}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">
                Identity Verification: {r?.kycStatus === "verified" ? "✓ Verified" : r?.kycStatus === "rejected" ? "⚠ Rejected" : "⏳ Under Review"}
              </p>
              {r?.kycStatus === "rejected" && r?.kycRejectionReason && (
                <p className="text-xs mt-1 opacity-70 leading-relaxed">Reason: {r.kycRejectionReason}</p>
              )}
              {r?.kycStatus === "pending" && <p className="text-xs opacity-70 mt-1">Usually reviewed within 24 hours</p>}
              {r?.kycStatus === "verified" && <p className="text-xs opacity-70 mt-0.5">Your identity is confirmed · You can accept tasks</p>}
            </div>
            {r?.kycStatus !== "verified" && (
              <button
                onClick={() => setShowKyc(true)}
                className="px-3 py-1.5 rounded-xl text-[#0A1628] text-xs font-black flex-shrink-0 ml-3"
                style={{ background: GOLD_GRAD }}
              >
                {r?.kycStatus === "rejected" ? "Resubmit" : r?.fullName ? "Update" : "Submit KYC"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-4 mt-3 grid grid-cols-3 gap-2.5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl p-3 text-center border border-white/10" style={{ background: s.bg }}>
            <s.Icon size={18} className="mx-auto mb-1" style={{ color: s.color }} />
            <div className="text-white font-black text-sm">{s.val}</div>
            <div className="text-white/40 text-[10px] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Specialization badges */}
      <div className="mx-4 mt-4">
        <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2.5">Specializations</p>
        <div className="flex flex-wrap gap-2">
          {SPECIALIZATIONS.map((sp) => (
            <div
              key={sp.key}
              className="px-3 py-1.5 rounded-xl border text-xs font-semibold"
              style={{ background: `${sp.color}15`, borderColor: `${sp.color}30`, color: sp.color }}
            >
              {sp.label}
            </div>
          ))}
        </div>
      </div>

      {/* Menu */}
      <div className="mx-4 mt-5 bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        {menuItems.map((item, i) => (
          <button key={item.label} className={`w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-white/5 transition-colors ${i > 0 ? "border-t border-white/5" : ""}`}>
            <div className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0">
              <item.Icon size={15} className="text-white/50" />
            </div>
            <div className="flex-1">
              <span className="text-white/80 text-sm font-semibold">{item.label}</span>
              <p className="text-white/30 text-[10px] mt-0.5">{item.sub}</p>
            </div>
            <ChevronRight size={14} className="text-white/20" />
          </button>
        ))}
      </div>

      <div className="mx-4 mt-3">
        <button onClick={handleLogout} className="w-full py-3.5 rounded-2xl font-bold border border-red-400/20 text-red-400 hover:bg-red-400/10 transition-colors text-sm">
          Sign Out
        </button>
      </div>

      {/* KYC Modal */}
      <AnimatePresence>
        {showKyc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/85 z-50 flex items-end backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className="w-full max-h-[92vh] rounded-t-3xl overflow-y-auto p-5"
              style={{ background: "#0F2557" }}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-white font-black text-xl">Identity Verification</h2>
                  <p className="text-white/50 text-xs mt-0.5">KYC · Step {kycStep + 1} of {KYC_STEPS.length}</p>
                </div>
                <button onClick={() => setShowKyc(false)} className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                  <X size={18} className="text-white/60" />
                </button>
              </div>

              {/* Step progress */}
              <div className="flex gap-1 mb-4">
                {KYC_STEPS.map((s, i) => (
                  <div key={s.key} className="flex-1 h-1.5 rounded-full transition-all"
                    style={{ background: i <= kycStep ? GOLD : "rgba(255,255,255,0.15)" }} />
                ))}
              </div>

              <div className="mb-5 p-3 bg-white/10 rounded-xl">
                <p className="text-white font-bold text-sm">{KYC_STEPS[kycStep].label}</p>
                <p className="text-white/50 text-xs mt-0.5">{KYC_STEPS[kycStep].desc}</p>
              </div>

              <div className="space-y-4">
                {kycStep === 0 && (
                  <div className="space-y-3">
                    {[
                      { key: "fullName", label: "Full Name", placeholder: "As it appears on your Aadhaar card" },
                      { key: "aadhaarNumber", label: "Aadhaar Number", placeholder: "XXXX XXXX XXXX", type: "tel" },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="text-white/60 text-xs font-semibold mb-1.5 block">{f.label}</label>
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
                        <div className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${doc.val ? "border-green-500/50 bg-green-500/10" : "border-white/20 hover:border-white/30"}`}>
                          {doc.val ? (
                            <div>
                              <img src={doc.val} alt="" className="w-20 h-20 object-cover rounded-xl mx-auto mb-2 shadow-lg" />
                              <p className="text-green-400 text-sm font-bold">{doc.label} ✓</p>
                              <p className="text-green-400/60 text-xs mt-0.5">Tap to replace</p>
                            </div>
                          ) : (
                            <div>
                              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-2">
                                <Camera size={20} className="text-white/40" />
                              </div>
                              <p className="text-white/60 text-sm font-semibold">{doc.label}</p>
                              <p className="text-white/30 text-xs mt-0.5">Tap to upload</p>
                            </div>
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
                      <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${selfie ? "border-green-500/50 bg-green-500/10" : "border-white/20 hover:border-white/30"}`}>
                        {selfie ? (
                          <div>
                            <img src={selfie} alt="" className="w-28 h-28 object-cover rounded-full mx-auto mb-3 shadow-xl border-4" style={{ borderColor: GOLD }} />
                            <p className="text-green-400 text-sm font-bold">Selfie uploaded ✓</p>
                            <p className="text-green-400/60 text-xs mt-0.5">Tap to retake</p>
                          </div>
                        ) : (
                          <div>
                            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
                              <Camera size={28} className="text-white/30" />
                            </div>
                            <p className="text-white/70 font-semibold">Take a selfie</p>
                            <p className="text-white/30 text-xs mt-1">Face clearly visible · Good lighting</p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                )}

                {kycStep === 3 && (
                  <div className="space-y-3">
                    {[
                      { key: "bankAccountHolder", label: "Account Holder Name", placeholder: "As per bank records" },
                      { key: "bankAccount", label: "Account Number", placeholder: "Enter account number" },
                      { key: "bankIfsc", label: "IFSC Code", placeholder: "E.g. SBIN0001234" },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="text-white/60 text-xs font-semibold mb-1.5 block">{f.label}</label>
                        <input
                          value={(form as any)[f.key]}
                          onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className={inputClass}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {kycStep === 4 && (
                  <div className="space-y-3">
                    {[
                      { key: "emergencyContactName", label: "Contact Name", placeholder: "Full name" },
                      { key: "emergencyContactPhone", label: "Phone Number", placeholder: "10-digit mobile" },
                      { key: "emergencyContactRelation", label: "Relationship", placeholder: "E.g. Mother, Spouse, Friend" },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="text-white/60 text-xs font-semibold mb-1.5 block">{f.label}</label>
                        <input
                          value={(form as any)[f.key]}
                          onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className={inputClass}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {kycStep === 5 && (
                  <div>
                    <div className="bg-white/8 border border-white/15 rounded-2xl p-4 mb-4 text-white/70 text-xs leading-relaxed space-y-2.5">
                      <p className="font-black text-white text-sm">Runner Code of Conduct</p>
                      <p>✓ All information provided is accurate and true to the best of my knowledge.</p>
                      <p>✓ I understand that false information will result in permanent account suspension.</p>
                      <p>✓ I agree to maintain professional conduct during all task assignments.</p>
                      <p>✓ I agree to Go LineLess's runner guidelines, privacy policy, and terms of service.</p>
                      <p>✓ I understand that earnings are paid out weekly via bank transfer.</p>
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer bg-white/8 border border-white/15 rounded-xl p-3">
                      <input type="checkbox" checked={form.agreed} onChange={(e) => setForm(prev => ({ ...prev, agreed: e.target.checked }))} className="mt-0.5 flex-shrink-0" style={{ accentColor: GOLD }} />
                      <span className="text-white/70 text-xs leading-relaxed">I have read and agree to the runner agreement and code of conduct above.</span>
                    </label>
                  </div>
                )}

                {kycStep < KYC_STEPS.length - 1 ? (
                  <button
                    onClick={() => setKycStep(s => s + 1)}
                    className="w-full py-4 rounded-2xl text-[#0A1628] font-black mt-2 text-base"
                    style={{ background: GOLD_GRAD }}
                  >
                    Continue →
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitKyc}
                    disabled={submitKyc.isPending}
                    className="w-full py-4 rounded-2xl text-[#0A1628] font-black mt-2 text-base"
                    style={{ background: GOLD_GRAD }}
                  >
                    {submitKyc.isPending ? "Submitting..." : "Submit for Verification"}
                  </button>
                )}

                {kycStep > 0 && (
                  <button onClick={() => setKycStep(s => s - 1)} className="w-full py-2 text-white/40 text-sm text-center hover:text-white/60 transition-colors">
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
