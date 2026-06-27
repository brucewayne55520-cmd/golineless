import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Star, CheckCircle2, Wallet, HelpCircle, FileText, Lock, ChevronRight, X, Camera, Shield, TrendingUp, Award, Bell } from "lucide-react";
import { useGetRunnerMe, useSubmitKyc, useLogout, useListNotifications } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { RunnerBottomNav } from "@/components/BottomNav";
import { getInitials } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { GOLD, GOLD_GRAD, NAVY_GRAD } from "@/lib/theme";

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

function getTrustBadgeInfo(score: number): { label: string; color: string; progress: number; next?: string } {
  if (score >= 95) return { label: "Elite Comrade", next: "Maximum trust level", progress: 100, color: "#ff7b00" };
  if (score >= 90) return { label: "Trusted Comrade", next: "5 more points for Elite (95+)", progress: score, color: "#10B981" };
  if (score >= 80) return { label: "Verified Comrade", next: "10 more points for Trusted (90+)", progress: score, color: "#3B82F6" };
  if (score >= 70) return { label: "Active Comrade", next: "10 more points for Verified (80+)", progress: score, color: "#9CA3AF" };
  return { label: "Improving Comrade", next: "Complete more tasks to increase score", progress: Math.max(score, 5), color: "#9CA3AF" };
}

export default function RunnerProfile() {
  const [, navigate] = useLocation();
  const { logout } = useAuth();
  const { data: runner, refetch } = useGetRunnerMe();
  const submitKyc = useSubmitKyc();
  const logoutMutation = useLogout();
  const { data: notifications } = useListNotifications();
  const unreadCount = (notifications ?? []).filter((n: { isRead?: boolean }) => !n.isRead).length;
  const [showKyc, setShowKyc] = useState(false);
  const [kycStep, setKycStep] = useState(0);
  const [form, setForm] = useState<Record<string, string | boolean>>({
    fullName: "", aadhaarNumber: "", bankAccount: "", bankIfsc: "", bankAccountHolder: "",
    emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelation: "",
    agreed: false,
  });
  const [aadhaarFront, setAadhaarFront] = useState<string | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);

  // Initialize selected specs from runner data
  const runnerSpecializations = (runner as unknown as { specializations?: string[] })?.specializations ?? [];

  useEffect(() => {
    setSelectedSpecs(runnerSpecializations);
  }, [runnerSpecializations.length]);

  const totalTasks = runner?.totalTasks ?? 0;
  const rating = runner?.rating ? Number(runner.rating) : 0;
  const trustScore = runner?.trustScore ?? 50;
  const trust = getTrustBadgeInfo(trustScore);

  const handleSubmitKyc = () => {
    if (!form.agreed) { toast.error("Please accept the runner agreement"); return; }
    // M11: Validate IFSC format
    if (typeof form.bankIfsc === 'string' && form.bankIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.bankIfsc)) {
      toast.error("Invalid IFSC code format (e.g. SBIN0001234)"); return;
    }
    submitKyc.mutate({
      data: { ...form, aadhaarFront, aadhaarBack, selfie } as import("@workspace/api-client-react").KycInput,
    }, {
      onSuccess: () => { toast.success("KYC submitted! Under review — typically within 24 hours."); setShowKyc(false); refetch(); },
      onError: () => toast.error("Failed to submit KYC. Please try again."),
    });
  };

  // M13 FIX: Pre-fill KYC form with existing runner data when modal opens
  const openKycModal = () => {
    if (runner) {
      const r = runner as import("@workspace/api-client-react").Runner & { fullName?: string; bankAccount?: string; bankIfsc?: string; bankAccountHolder?: string; emergencyContactName?: string; emergencyContactPhone?: string; emergencyContactRelation?: string };
      setForm({
        fullName: r.fullName || r.name || "",
        aadhaarNumber: "",
        bankAccount: r.bankAccount || "",
        bankIfsc: r.bankIfsc || "",
        bankAccountHolder: r.bankAccountHolder || "",
        emergencyContactName: r.emergencyContactName || "",
        emergencyContactPhone: r.emergencyContactPhone || "",
        emergencyContactRelation: r.emergencyContactRelation || "",
        agreed: false,
      });
    }
    setShowKyc(true);
  };

  const handleFileRead = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setter(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined as void, {
      onSettled: () => { logout(); navigate("/"); },
    });
  };

  const kycStatusColor = runner?.kycStatus === "verified"
    ? "text-green-400 bg-green-400/10 border-green-400/30"
    : runner?.kycStatus === "rejected"
    ? "text-red-400 bg-red-400/10 border-red-400/30"
    : "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";

  const menuItems: { Icon: LucideIcon; label: string; sub: string; onClick?: () => void }[] = [
    { Icon: Star, label: "My Reviews", sub: "See what clients say", onClick: () => navigate("/runner/reviews") },
    { Icon: TrendingUp, label: "Performance Stats", sub: "Completion rate, avg response", onClick: () => navigate("/runner/earnings") },
    { Icon: HelpCircle, label: "Help & Support", sub: "FAQs, contact us", onClick: () => window.open("https://golineless.com/support", "_blank") },
    { Icon: FileText, label: "Terms of Service", sub: "Runner agreement", onClick: () => window.open("https://golineless.com/terms", "_blank") },
    { Icon: Lock, label: "Privacy Policy", sub: "Your data rights", onClick: () => window.open("https://golineless.com/privacy", "_blank") },
  ];

  const stats: { Icon: LucideIcon; val: string | number; label: string; color: string; bg: string }[] = [
    { Icon: CheckCircle2, val: runner?.totalTasks ?? 0, label: "Tasks Done", color: "#22C55E", bg: "#22C55E20" },
    { Icon: Star, val: rating > 0 ? rating.toFixed(1) : "—", label: "Avg Rating", color: GOLD, bg: `${GOLD}20` },
    { Icon: Wallet, val: runner?.totalEarnings ? `Rs ${Math.round(Number(runner.totalEarnings))}` : "Rs 0", label: "Total Earned", color: "#60A5FA", bg: "#60A5FA20" },
  ];

  const inputClass = "w-full bg-white/10 border border-white/20 rounded-xl px-3.5 py-3 text-white text-sm focus:outline-none focus:border-white/40 transition-colors placeholder-white/30";

  // L10: Profile loading skeleton
  if (!runner) return (
    <div className="min-h-screen pb-24" style={{ background: BG }}>
      <div className="px-4 pt-6 pb-5 border-b border-white/10 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 bg-white/10 rounded" />
            <div className="h-3 w-24 bg-white/10 rounded" />
          </div>
        </div>
      </div>
      <div className="mx-4 mt-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-24" style={{ background: BG }}>
      {/* Profile header */}
      <div className="px-4 pt-6 pb-5 border-b border-white/10">
        <div className="flex justify-end mb-2">
          <button onClick={() => navigate("/runner/notifications")} className="relative p-2 rounded-xl hover:bg-white/10 transition-colors">
            <Bell size={20} className="text-white/60" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <label className="relative cursor-pointer group">
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = async (ev) => {
                const dataUrl = ev.target?.result as string;
                try {
                  const token = localStorage.getItem("golineless_runner_token") || "";
                  const res = await fetch("/api/runners/me/avatar", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ avatar: dataUrl }),
                  });
                  if (res.ok) { toast.success("Avatar updated!"); refetch(); }
                  else { toast.error("Failed to upload avatar"); }
                } catch { toast.error("Network error"); }
              };
              reader.readAsDataURL(file);
            }} />
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-[#241100] shadow-lg overflow-hidden group-hover:opacity-80 transition-opacity"
              style={{ background: (runner as unknown as { avatar?: string })?.avatar ? undefined : GOLD_GRAD }}>
              {(runner as unknown as { avatar?: string })?.avatar
                ? <img src={(runner as unknown as { avatar?: string }).avatar} alt="" className="w-full h-full object-cover" />
                : getInitials(runner?.name)}
            </div>
            <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={18} className="text-white" />
            </div>
          </label>
          <div className="flex-1">
            <h2 className="font-black text-white text-xl leading-tight">{runner?.name ?? "Runner"}</h2>
            {(runner as (typeof runner & { uniqueId?: string }))?.uniqueId && (
              <p className="text-white/50 text-xs font-mono mt-0.5">ID: {(runner as typeof runner & { uniqueId?: string }).uniqueId}</p>
            )}
            <p className="text-white/40 text-sm">{runner?.phone}</p>
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
          {runner?.kycStatus === "verified" && (
            <div className="flex items-center gap-1 text-green-400 text-xs font-bold bg-green-400/15 border border-green-400/30 px-2.5 py-1.5 rounded-xl">
              <Shield size={12} /> Verified
            </div>
          )}
        </div>
      </div>

      {/* Phase 5: Trust Score Card */}
      {runner?.kycStatus === "verified" && (() => {
        const r = runner as import("@workspace/api-client-react").Runner & { onTimeArrivals?: number; lateArrivals?: number; repeatClients?: number };
        return (
        <div className="mx-4 mt-4 rounded-2xl p-4 border border-white/10" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Award size={14} style={{ color: trust.color }} />
              <span className="text-sm font-black" style={{ color: trust.color }}>{trust.label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-black" style={{ color: trust.color }}>{trustScore}</span>
              <TrendingUp size={14} className="text-white/30" />
            </div>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${trust.progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: trust.color }}
            />
          </div>
          {trust.next && (
            <p className="text-white/40 text-[10px]">🎯 {trust.next}</p>
          )}
          {/* Score breakdown */}
          <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-4 gap-1 text-center">
            <div>
              <p className="text-white/30 text-[8px] uppercase">Completion</p>
              <p className="text-white text-xs font-bold">{r.tasksCompleted ?? 0}/{r.tasksAccepted ?? 0}</p>
            </div>
            <div>
              <p className="text-white/30 text-[8px] uppercase">Rating</p>
              <p className="text-white text-xs font-bold">{r.averageRating ? Number(r.averageRating).toFixed(1) : "—"}</p>
            </div>
            <div>
              <p className="text-white/30 text-[8px] uppercase">On Time</p>
              <p className="text-white text-xs font-bold">{r.onTimeArrivals ?? 0}/{r.lateArrivals ?? 0}</p>
            </div>
            <div>
              <p className="text-white/30 text-[8px] uppercase">Repeat</p>
              <p className="text-white text-xs font-bold">{r.repeatClients ?? 0}</p>
            </div>
          </div>
        </div>);
      })()}

      {/* KYC status */}
      <div className="mx-4 mt-3">
        <div className={`rounded-2xl p-4 border ${kycStatusColor}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">
                Identity Verification: {runner?.kycStatus === "verified" ? "✓ Verified" : runner?.kycStatus === "rejected" ? "⚠ Rejected" : "⏳ Under Review"}
              </p>
              {runner?.kycStatus === "rejected" && (
                <div className="mt-2 p-2.5 bg-red-400/10 rounded-xl border border-red-400/20">
                  {runner?.kycRejectionReason && (
                    <p className="text-xs font-semibold text-red-300 mb-1">Reason: {runner.kycRejectionReason}</p>
                  )}
                  <p className="text-[10px] text-white/40">Please update your documents and resubmit. Make sure Aadhaar photos are clear and selfie shows your full face.</p>
                </div>
              )}
              {runner?.kycStatus === "pending" && <p className="text-xs opacity-70 mt-1">Usually reviewed within 24 hours</p>}
              {runner?.kycStatus === "verified" && <p className="text-xs opacity-70 mt-0.5">Your identity is confirmed · You can accept tasks</p>}
            </div>
            {runner?.kycStatus !== "verified" && (
              <button
                onClick={openKycModal}
                className="px-3 py-1.5 rounded-xl text-[#241100] text-xs font-black flex-shrink-0 ml-3"
                style={{ background: GOLD_GRAD }}
              >
                {runner?.kycStatus === "rejected" ? "Resubmit" : runner?.fullName ? "Update" : "Submit KYC"}
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
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">Specializations</p>
          {JSON.stringify(selectedSpecs) !== JSON.stringify(runnerSpecializations) && (
            <button
              onClick={async () => {
                try {
                  const token = localStorage.getItem("golineless_runner_token") || "";
                  const res = await fetch("/api/runners/me/specializations", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ specializations: selectedSpecs }),
                  });
                  if (res.ok) { toast.success("Specializations saved!"); refetch(); }
                  else { toast.error("Failed to save"); }
                } catch { toast.error("Network error"); }
              }}
              className="text-[10px] font-bold px-2 py-1 rounded-lg"
              style={{ color: GOLD, background: `${GOLD}15` }}
            >
              Save
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {SPECIALIZATIONS.map((sp) => {
            const isActive = selectedSpecs.includes(sp.key);
            return (
              <button
                key={sp.key}
                onClick={() => setSelectedSpecs(prev => isActive ? prev.filter(k => k !== sp.key) : [...prev, sp.key])}
                className="px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all"
                style={{
                  background: isActive ? `${sp.color}30` : `${sp.color}15`,
                  borderColor: isActive ? `${sp.color}60` : `${sp.color}30`,
                  color: sp.color,
                  opacity: isActive ? 1 : 0.6,
                }}
              >
                {isActive ? "✓ " : ""}{sp.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications shortcut */}
      <div className="mx-4 mt-4">
        <button onClick={() => navigate("/runner/notifications")} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-amber-400/15 flex items-center justify-center flex-shrink-0">
            <Bell size={16} className="text-amber-400" />
          </div>
          <div className="flex-1 text-left">
            <span className="text-white/80 text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && <p className="text-amber-400 text-[10px] mt-0.5">{unreadCount} unread</p>}
          </div>
          {unreadCount > 0 && (
            <span className="w-6 h-6 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <ChevronRight size={14} className="text-white/20" />
        </button>
      </div>

      {/* Menu */}
      <div className="mx-4 mt-5 bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        {menuItems.map((item, i) => (
          <button key={item.label} onClick={item.onClick} className={`w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-white/5 transition-colors ${i > 0 ? "border-t border-white/5" : ""}`}>
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
              style={{ background: "#331900" }}
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
                      { key: "aadhaarNumber", label: "Aadhaar Number", placeholder: "XXXX XXXX XXXX", type: "tel", maxLength: 14 },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="text-white/60 text-xs font-semibold mb-1.5 block">{f.label}</label>
                        <input
                          type={f.type ?? "text"}
                          value={form[f.key] as string}
                          onChange={(e) => {
                            let val = e.target.value.replace(/[^\d]/g, "");
                            // M3: Format Aadhaar as XXXX XXXX XXXX
                            if (f.key === "aadhaarNumber") {
                              val = val.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
                            }
                            setForm(prev => ({ ...prev, [f.key]: val }));
                          }}
                          placeholder={f.placeholder}
                          className={inputClass}
                          maxLength={f.maxLength}
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
                      { key: "bankAccount", label: "Account Number", placeholder: "Enter account number", inputMode: "numeric" as const },
                      { key: "bankIfsc", label: "IFSC Code", placeholder: "E.g. SBIN0001234", maxLength: 11 },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="text-white/60 text-xs font-semibold mb-1.5 block">{f.label}</label>
                        <input
                          value={form[f.key] as string}
                          onChange={(e) => setForm(prev => ({ ...prev, [f.key]: f.key === "bankIfsc" ? e.target.value.toUpperCase() : e.target.value }))}
                          placeholder={f.placeholder}
                          className={inputClass}
                          inputMode={f.inputMode}
                          maxLength={f.maxLength}
                        />
                        {f.key === "bankIfsc" && form.bankIfsc && typeof form.bankIfsc === "string" && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.bankIfsc) && (
                          <p className="text-red-400 text-[10px] mt-1">Invalid IFSC format</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {kycStep === 4 && (
                  <div className="space-y-3">
                    {[
                      { key: "emergencyContactName", label: "Contact Name", placeholder: "Full name" },
                      { key: "emergencyContactPhone", label: "Phone Number", placeholder: "10-digit mobile", validate: (v: string) => /^\d{10}$/.test(v) ? "" : "Must be exactly 10 digits" },
                      { key: "emergencyContactRelation", label: "Relationship", placeholder: "E.g. Mother, Spouse, Friend" },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="text-white/60 text-xs font-semibold mb-1.5 block">{f.label}</label>
                        <input
                          value={form[f.key] as string}
                          onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className={inputClass}
                        />
                        {"validate" in f && f.validate && typeof form[f.key] === "string" && (form[f.key] as string).length > 0 && (f as { validate: (v: string) => string }).validate(form[f.key] as string) && (
                          <p className="text-red-400 text-[10px] mt-1">{(f as { validate: (v: string) => string }).validate(form[f.key] as string)}</p>
                        )}
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
                      <input type="checkbox" checked={!!form.agreed} onChange={(e) => setForm(prev => ({ ...prev, agreed: e.target.checked }))} className="mt-0.5 flex-shrink-0" style={{ accentColor: GOLD }} />
                      <span className="text-white/70 text-xs leading-relaxed">I have read and agree to the runner agreement and code of conduct above.</span>
                    </label>
                  </div>
                )}

                {kycStep < KYC_STEPS.length - 1 ? (
                  <button
                    onClick={() => setKycStep(s => s + 1)}
                    className="w-full py-4 rounded-2xl text-[#241100] font-black mt-2 text-base"
                    style={{ background: GOLD_GRAD }}
                  >
                    Continue →
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitKyc}
                    disabled={submitKyc.isPending}
                    className="w-full py-4 rounded-2xl text-[#241100] font-black mt-2 text-base"
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
