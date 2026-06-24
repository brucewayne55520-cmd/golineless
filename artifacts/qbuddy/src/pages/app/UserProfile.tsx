import { useLocation } from "wouter";
import { CheckCircle2, Clock, Wallet, Crown, Bell, Globe, HelpCircle, Lock, FileText, Info, ChevronRight, MapPin } from "lucide-react";
import { useGetMe, useGetUserStats, useGetMySubscription, type UserStats } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserBottomNav } from "@/components/BottomNav";
import { getInitials, formatCurrency } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { NAVY_GRAD, GOLD } from "@/lib/theme";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

export default function UserProfile() {
  const [, navigate] = useLocation();
  const { logout } = useAuth();
  const { data: me } = useGetMe();
  const { data: stats } = useGetUserStats();
  const { data: sub } = useGetMySubscription();

  const handleLogout = () => { logout(); navigate("/"); };

  const user = me as Exclude<typeof me, undefined>;
  const subData = sub!;

  const statsData = stats as UserStats | undefined;
  const statCards: { Icon: LucideIcon; label: string; val: string | number; color: string }[] = statsData ? [
    { Icon: CheckCircle2, label: "Tasks", val: statsData.totalTasks, color: "#22C55E" },
    { Icon: Clock, label: "Hrs Saved", val: `${Math.round(statsData.hoursSaved)}h`, color: "#0F2557" },
    { Icon: Wallet, label: "Value", val: formatCurrency(statsData.valueSaved), color: GOLD },
  ] : [];

  const menuItems: { Icon: LucideIcon; label: string }[] = [
    { Icon: Bell, label: "Notifications" },
    { Icon: Globe, label: "Language" },
    { Icon: HelpCircle, label: "Help & Support" },
    { Icon: Lock, label: "Privacy Policy" },
    { Icon: FileText, label: "Terms of Service" },
    { Icon: Info, label: "About Go LineLess" },
  ];

  const isLoadingStats = !stats;

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-24">
      <div className="rounded-b-3xl p-6 text-white" style={{ background: NAVY_GRAD }}>
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
        {isLoadingStats ? (
          <div className="grid grid-cols-3 gap-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-3 text-center shadow-sm">
                <div className="w-8 h-8 bg-gray-200 rounded-lg mx-auto mb-2 animate-pulse" />
                <div className="h-6 w-16 bg-gray-200 rounded-lg mx-auto mb-1 animate-pulse" />
                <div className="h-3 w-12 bg-gray-200 rounded-lg mx-auto animate-pulse" />
              </div>
            ))}
          </div>
        ) : statCards.length > 0 && (
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

        {sub ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Crown size={16} className="text-[#C9A84C]" />
              <h3 className="font-bold text-[#0A1628]">{subData.planName} Plan</h3>
              <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Active</span>
            </div>              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ background: NAVY_GRAD, width: `${Math.min(100, ((subData.tasksUsed ?? 0) / (subData.tasksPerMonth || 10)) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{subData.tasksUsed ?? 0} / {subData.tasksPerMonth ?? "∞"} tasks used</p>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
            <p className="text-sm font-semibold text-[#0F2557]">No active subscription</p>
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
