import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useGetMe, useGetUserStats, useGetMySubscription, useLogout } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserBottomNav } from "@/components/BottomNav";
import { getInitials, formatCurrency } from "@/lib/utils";

export default function UserProfile() {
  const [, navigate] = useLocation();
  const { logout } = useAuth();
  const { data: me } = useGetMe();
  const { data: stats } = useGetUserStats();
  const { data: sub } = useGetMySubscription();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate({ body: {} } as any, {
      onSuccess: () => { logout(); navigate("/"); },
    });
    logout();
    navigate("/");
  };

  const user = me as any;

  return (
    <div className="min-h-screen bg-[#F8F7FF] pb-24">
      {/* Header gradient */}
      <div className="rounded-b-3xl p-6 text-white" style={{ background: "linear-gradient(135deg, #6C3FD4, #9B6FF7)" }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 border-2 border-white/40 rounded-full flex items-center justify-center text-2xl font-black">
            {getInitials(user?.name)}
          </div>
          <div>
            <h2 className="text-xl font-black">{user?.name ?? "User"}</h2>
            <p className="text-white/70 text-sm">{user?.phone}</p>
            {user?.city && <p className="text-white/60 text-xs">📍 {user.city}</p>}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: "✅", label: "Tasks", val: (stats as any).totalTasks ?? 0 },
              { icon: "⏱️", label: "Hrs Saved", val: `${((stats as any).hoursSaved ?? 0).toFixed(0)}h` },
              { icon: "💰", label: "Value", val: formatCurrency((stats as any).valueSaved ?? 0) },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-3 text-center shadow-sm">
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="font-black text-[#6C3FD4] text-lg">{s.val}</div>
                <div className="text-xs text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Subscription */}
        {sub ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">👑</span>
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

        {/* Settings */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {[
            { icon: "🔔", label: "Notifications", action: () => {} },
            { icon: "🌐", label: "Language", action: () => {} },
            { icon: "❓", label: "Help & Support", action: () => {} },
            { icon: "🔒", label: "Privacy Policy", action: () => {} },
            { icon: "📄", label: "Terms of Service", action: () => {} },
            { icon: "ℹ️", label: "About QBuddy", action: () => {} },
          ].map((item, i) => (
            <button
              key={item.label}
              onClick={item.action}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors ${i > 0 ? "border-t border-gray-50" : ""}`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-medium text-gray-700 flex-1">{item.label}</span>
              <span className="text-gray-300">›</span>
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
