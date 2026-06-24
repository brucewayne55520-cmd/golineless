import { useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, Clock, Wallet, Crown, Bell, Globe, HelpCircle, Lock, FileText, Info, ChevronRight, MapPin, Camera, Edit3, Shield, User, Phone, Mail, Calendar, CreditCard, X } from "lucide-react";
import { useListNotifications } from "@workspace/api-client-react";
import type { Notification as NotificationType } from "@workspace/api-client-react";
import { useGetMe, useGetUserStats, useGetMySubscription, type UserStats } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserBottomNav } from "@/components/BottomNav";
import { getInitials, formatCurrency } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { NAVY_GRAD, GOLD } from "@/lib/theme";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

const KYC_STEPS = [
  { key: "aadhaar", label: "Aadhaar Details", desc: "Your 12-digit Aadhaar number" },
  { key: "upload", label: "Upload Aadhaar", desc: "Front & back of your card" },
  { key: "emergency", label: "Emergency Contact", desc: "Someone we can reach in an emergency" },
];

export default function UserProfile() {
  const [, navigate] = useLocation();
  const { logout } = useAuth();
  const { data: me, refetch } = useGetMe();
  const { data: stats } = useGetUserStats();
  const { data: sub } = useGetMySubscription();

  const [editingProfile, setEditingProfile] = useState(false);
  const [showKyc, setShowKyc] = useState(false);
  const [kycStep, setKycStep] = useState(0);
  const [editForm, setEditForm] = useState({
    name: "", phone: "", email: "", city: "", area: "", gender: "", dateOfBirth: "", address: "", pincode: "",
  });
  const [kycForm, setKycForm] = useState({
    aadhaarNumber: "", emergencyContactName: "", emergencyContactPhone: "",
  });
  const [aadhaarFront, setAadhaarFront] = useState<string | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<string | null>(null);

  const { data: notifications } = useListNotifications();
  const unreadCount = ((notifications ?? []) as NotificationType[]).filter(n => !n.isRead).length;

  const user = me as Exclude<typeof me, undefined>;

  const startEditProfile = () => {
    setEditForm({
      name: user?.name ?? "", phone: user?.phone ?? "", email: user?.email ?? "",
      city: user?.city ?? "", area: user?.area ?? "", gender: (user as any)?.gender ?? "",
      dateOfBirth: (user as any)?.dateOfBirth ?? "", address: (user as any)?.address ?? "", pincode: (user as any)?.pincode ?? "",
    });
    setEditingProfile(true);
  };

  const saveProfile = async () => {
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("golineless_user_token")}` },
        body: JSON.stringify(editForm),
      });
      if (res.ok) { setEditingProfile(false); refetch(); }
    } catch { /* ignore */ }
  };

  const submitKyc = async () => {
    try {
      const res = await fetch("/api/users/me/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("golineless_user_token")}` },
        body: JSON.stringify({ ...kycForm, aadhaarFront, aadhaarBack }),
      });
      if (res.ok) { setShowKyc(false); refetch(); }
    } catch { /* ignore */ }
  };

  const handleFileRead = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setter(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogout = () => { logout(); navigate("/"); };

  const subData = sub!;
  const statsData = stats as UserStats | undefined;
  const kycStatus = (user as any)?.kycStatus ?? "none";

  const statCards: { Icon: LucideIcon; label: string; val: string | number; color: string }[] = statsData ? [
    { Icon: CheckCircle2, label: "Tasks", val: statsData.totalTasks, color: "#22C55E" },
    { Icon: Clock, label: "Hrs Saved", val: `${Math.round(statsData.hoursSaved)}h`, color: "#0F2557" },
    { Icon: Wallet, label: "Value", val: formatCurrency(statsData.valueSaved), color: GOLD },
  ] : [];

  const menuItems: { Icon: LucideIcon; label: string; action?: () => void; badge?: number }[] = [
    { Icon: Edit3, label: "Edit Profile", action: startEditProfile },
    { Icon: Shield, label: kycStatus === "verified" ? "KYC Verified ✓" : kycStatus === "pending" ? "KYC Under Review" : "Verify Identity (KYC)", action: kycStatus === "none" ? () => { setKycStep(0); setShowKyc(true); } : undefined },
    { Icon: Bell, label: "Notifications", action: () => navigate("/app/notifications"), badge: unreadCount > 0 ? unreadCount : undefined },
    { Icon: Globe, label: "Language" },
    { Icon: HelpCircle, label: "Help & Support" },
    { Icon: Lock, label: "Privacy Policy" },
    { Icon: FileText, label: "Terms of Service" },
    { Icon: Info, label: "About Go LineLess" },
  ];

  const inputClass = "w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0F2557]/20 transition-all bg-white";

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-24">
      {/* Header */}
      <div className="rounded-b-3xl p-6 text-white" style={{ background: NAVY_GRAD }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 border-2 border-white/40 rounded-full flex items-center justify-center text-2xl font-black">
            {getInitials(user?.name)}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black">{user?.name ?? "User"}</h2>
            <p className="text-white/70 text-sm">{user?.phone}</p>
            {user?.city && (
              <p className="text-white/60 text-xs flex items-center gap-1 mt-0.5">
                <MapPin size={10} /> {user.city}
              </p>
            )}
          </div>
        </div>
        {/* Unique ID */}
        {(user as any)?.uniqueId && (
          <div className="mt-3 bg-white/10 border border-white/20 rounded-xl px-3 py-2 flex items-center gap-2">
            <CreditCard size={14} className="text-white/60" />
            <span className="text-white/80 text-xs font-semibold">ID:</span>
            <span className="text-white font-black text-sm tracking-wider">{(user as any).uniqueId}</span>
          </div>
        )}
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Stats */}
        {statCards.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {statCards.map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-3 text-center shadow-sm">
                <s.Icon size={18} className="mx-auto mb-1" style={{ color: s.color }} />
                <div className="font-black text-[#0F2557] text-lg">{s.val}</div>
                <div className="text-xs text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Subscription */}
        {sub ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Crown size={16} className="text-[#C9A84C]" />
              <h3 className="font-bold text-[#0A1628]">{subData.planName} Plan</h3>
              <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Active</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ background: NAVY_GRAD, width: `${Math.min(100, ((subData.tasksUsed ?? 0) / (subData.tasksPerMonth || 10)) * 100)}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">{subData.tasksUsed ?? 0} / {subData.tasksPerMonth ?? "∞"} tasks used</p>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
            <p className="text-sm font-semibold text-[#0F2557]">No active subscription</p>
            <p className="text-xs text-gray-500 mt-1">Subscribe to Senior Care for unlimited tasks</p>
          </div>
        )}

        {/* Menu */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              onClick={item.action}
              disabled={!item.action}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors ${i > 0 ? "border-t border-gray-50" : ""} ${!item.action ? "opacity-60" : ""}`}
            >
              <item.Icon size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700 flex-1">{item.label}</span>
              {item.badge && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#6C3FD4] text-white min-w-[18px] text-center">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
              {item.action && !item.badge && <ChevronRight size={14} className="text-gray-300" />}
            </button>
          ))}
        </div>

        <button onClick={handleLogout} className="w-full py-3.5 rounded-2xl text-red-500 font-bold border-2 border-red-100 hover:bg-red-50 transition-colors">
          Logout
        </button>
      </div>

      {/* Edit Profile Modal */}
      {editingProfile && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end backdrop-blur-sm">
          <div className="bg-white w-full rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-[#0A1628] text-xl">Edit Profile</h2>
              <button onClick={() => setEditingProfile(false)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              {[
                { key: "name", label: "Full Name", placeholder: "Your name", icon: User },
                { key: "phone", label: "Phone Number", placeholder: "10-digit mobile", icon: Phone, type: "tel" },
                { key: "email", label: "Email", placeholder: "your@email.com", icon: Mail, type: "email" },
                { key: "city", label: "City", placeholder: "E.g. Ahmedabad", icon: MapPin },
                { key: "area", label: "Area / Locality", placeholder: "E.g. Navrangpura", icon: MapPin },
                { key: "gender", label: "Gender", placeholder: "Male / Female / Other", icon: User },
                { key: "dateOfBirth", label: "Date of Birth", placeholder: "YYYY-MM-DD", icon: Calendar, type: "date" },
                { key: "address", label: "Address", placeholder: "Full address", icon: MapPin },
                { key: "pincode", label: "Pincode", placeholder: "6-digit pincode", icon: MapPin, type: "tel" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">{f.label}</label>
                  <input
                    type={f.type ?? "text"}
                    value={(editForm as any)[f.key]}
                    onChange={(e) => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
            <button onClick={saveProfile} className="w-full py-3.5 rounded-2xl text-white font-bold mt-4" style={{ background: NAVY_GRAD }}>Save Changes</button>
          </div>
        </div>
      )}

      {/* KYC Modal */}
      {showKyc && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end backdrop-blur-sm">
          <div className="bg-white w-full rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-black text-[#0A1628] text-xl">Verify Identity</h2>
                <p className="text-gray-400 text-xs mt-0.5">KYC · Step {kycStep + 1} of {KYC_STEPS.length}</p>
              </div>
              <button onClick={() => setShowKyc(false)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center"><X size={18} /></button>
            </div>
            {/* Progress */}
            <div className="flex gap-1 mb-4">
              {KYC_STEPS.map((_, i) => (
                <div key={i} className="flex-1 h-1.5 rounded-full transition-all" style={{ background: i <= kycStep ? GOLD : "#E5E7EB" }} />
              ))}
            </div>
            <div className="mb-4 p-3 bg-gray-50 rounded-xl">
              <p className="font-bold text-sm text-[#0A1628]">{KYC_STEPS[kycStep].label}</p>
              <p className="text-gray-400 text-xs mt-0.5">{KYC_STEPS[kycStep].desc}</p>
            </div>
            {kycStep === 0 && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Aadhaar Number</label>
                  <input value={kycForm.aadhaarNumber} onChange={(e) => setKycForm(p => ({ ...p, aadhaarNumber: e.target.value }))} placeholder="XXXX XXXX XXXX" className={inputClass} />
                </div>
              </div>
            )}
            {kycStep === 1 && (
              <div className="space-y-3">
                {[{ label: "Aadhaar Front", val: aadhaarFront, setter: setAadhaarFront }, { label: "Aadhaar Back", val: aadhaarBack, setter: setAadhaarBack }].map((doc) => (
                  <label key={doc.label} className="block cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileRead(doc.setter)} />
                    <div className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${doc.val ? "border-green-500/50 bg-green-500/10" : "border-gray-200 hover:border-gray-300"}`}>
                      {doc.val ? (
                        <div><img src={doc.val} alt="" className="w-20 h-20 object-cover rounded-xl mx-auto mb-2" /><p className="text-green-600 text-sm font-bold">{doc.label} ✓</p></div>
                      ) : (
                        <div><Camera size={24} className="mx-auto mb-2 text-gray-300" /><p className="text-gray-500 text-sm font-semibold">{doc.label}</p><p className="text-gray-400 text-xs mt-0.5">Tap to upload</p></div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
            {kycStep === 2 && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Emergency Contact Name</label>
                  <input value={kycForm.emergencyContactName} onChange={(e) => setKycForm(p => ({ ...p, emergencyContactName: e.target.value }))} placeholder="Full name" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Emergency Contact Phone</label>
                  <input value={kycForm.emergencyContactPhone} onChange={(e) => setKycForm(p => ({ ...p, emergencyContactPhone: e.target.value }))} placeholder="10-digit mobile" className={inputClass} />
                </div>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              {kycStep > 0 && (
                <button onClick={() => setKycStep(s => s - 1)} className="flex-1 py-3.5 rounded-2xl text-gray-500 font-bold border border-gray-200">← Back</button>
              )}
              {kycStep < KYC_STEPS.length - 1 ? (
                <button onClick={() => setKycStep(s => s + 1)} className="flex-1 py-3.5 rounded-2xl text-white font-bold" style={{ background: NAVY_GRAD }}>Continue →</button>
              ) : (
                <button onClick={submitKyc} className="flex-1 py-3.5 rounded-2xl text-white font-bold" style={{ background: GOLD }}>Submit KYC</button>
              )}
            </div>
          </div>
        </div>
      )}

      <UserBottomNav />
    </div>
  );
}
