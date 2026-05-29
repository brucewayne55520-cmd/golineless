import { useLocation } from "wouter";
import { CheckCircle2, Clock, Wallet, Crown, Bell, Globe, HelpCircle, Lock, FileText, Info, ChevronRight, MapPin } from "lucide-react";
import { useGetMe, useGetUserStats, useGetMySubscription } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserBottomNav } from "@/components/BottomNav";
import { getInitials, formatCurrency } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export default function UserProfile() {
  const [, navigate] = useLocation();
  const { logout } = useAuth();
  const { data: me } = useGetMe();
  const { data: stats } = useGetUserStats();
  const { data: sub } = useGetMySubscription();

  const handleLogout = () => { logout(); navigate("/"); };

  const user = me as any;

  const statCards: { Icon: LucideIcon; label: string; val: string | number; color: string }[] = stats ? [
    { Icon: CheckCircle2, label: "Tasks", val: (stats as any).totalTasks ?? 0, color: "#22C55E" },
    { Icon: Clock, label: "Hrs Saved", val: `${((stats as any).hoursSaved ?? 0).toFixed(0)}h`, color: "#6C3FD4" },
    { Icon: Wallet, label: "Value", val: formatCurrency((stats as any).valueSaved ?? 0), color: "#FF6B35" },
  ] : [];

  const menuItems: { Icon: LucideIcon; label: string }[] = [
    { Icon: Bell, label: "Notifications" },
    { Icon: Globe, label: "Language" },
    { Icon: HelpCircle, label: "Help & Support" },
    { Icon: Lock, label: "Privacy Policy" },
    { Icon: FileText, label: "Terms of Service" },
    { Icon: Info, label: "About QBuddy" },
  ];

  return (
    <div className="min-h-screen bg-[#F8F7FF] pb-24">
      <div className="rounded-b-3xl p-6 text-white" style={{ background: "linear-gradient(135deg, #6C3FD4, #9B6FF7)" }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 border-2 border-white/40 rounded-full flex items-center justify-center text-2xl font-black">
            {getInitials(user?.name)}
          </div>
          <div>
            <h2 className="text-xl font-black">{user?.name ?? "User"}</h2>
            <p className="text-white/70 text-sm">{user?.phone}</p>
            {user?.city && (
              <p className="text-white/60 text-xs flex items-center gap-1 mt-0.5">
                <MapPin size={10} /> {user.city}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {statCards.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {statCards.map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-3 text-center shadow-sm">
                <s.Icon size={18} className="mx-auto mb-1" style={{ color: s.color }} />
                <div className="font-black text-[#6C3FD4] text-lg">{s.val}</div>
                <div className="text-xs text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {sub ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <Crown size={16} className="text-[#6C3FD4]" />
              <h3 className="font-bold text-[#1A1A2E]">{(sub as any).planName} Plan</h3>
              <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Active</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#6C3FD4] to-[#9B6FF7]"
                style={{ width: `${Math.min(100, ((sub as any).tasksUsed / ((sub as any).tasksPerMonth || 10)) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{(sub as any).tasksUsed} / {(sub as any).tasksPerMonth ?? "∞"} tasks used</p>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-[#6C3FD4]/10 to-[#9B6FF7]/10 rounded-2xl p-4 border border-purple-100">
            <p className="text-sm font-semibold text-[#6C3FD4]">No active subscription</p>
            <p className="text-xs text-gray-500 mt-1">Subscribe to Senior Care for unlimited tasks</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors ${i > 0 ? "border-t border-gray-50" : ""}`}
            >
              <item.Icon size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700 flex-1">{item.label}</span>
              <ChevronRight size={14} className="text-gray-300" />
            </button>
          ))}
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-3.5 rounded-2xl text-red-500 font-bold border-2 border-red-100 hover:bg-red-50 transition-colors"
        >
          Logout
        </button>
      </div>
      <UserBottomNav />
    </div>
  );
}
