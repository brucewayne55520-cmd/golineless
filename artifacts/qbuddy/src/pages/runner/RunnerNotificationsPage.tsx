import { useState } from "react";
import { Bell, Check, CheckCheck, Clock, Shield, Package, AlertTriangle, CreditCard, Star, ChevronLeft, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { useListNotifications, useGetRunnerMe } from "@workspace/api-client-react";
import type { Notification } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { RunnerBottomNav } from "@/components/BottomNav";
import { customFetch } from "@workspace/api-client-react";
import { useNotificationSocket } from "@/hooks/useNotificationSocket";

const TYPE_ICONS: Record<string, typeof Bell> = {
  kyc_approved: Shield,
  kyc_rejected: Shield,
  dispatch_allowed: Shield,
  task_booked: Package,
  runner_assigned: Package,
  task_completed: CheckCircle2,
  task_cancelled: AlertTriangle,
  proof_photo: Star,
  payment_received: CreditCard,
  payment_confirmed: CreditCard,
  payment_refunded: CreditCard,
  payout_settled: CreditCard,
};

const TYPE_COLORS: Record<string, string> = {
  kyc_approved: "bg-green-100 text-green-600",
  kyc_rejected: "bg-red-100 text-red-600",
  dispatch_allowed: "bg-blue-100 text-blue-600",
  task_booked: "bg-purple-100 text-purple-600",
  runner_assigned: "bg-blue-100 text-blue-600",
  task_completed: "bg-green-100 text-green-600",
  task_cancelled: "bg-red-100 text-red-600",
  proof_photo: "bg-amber-100 text-amber-600",
  payment_received: "bg-emerald-100 text-emerald-600",
  payment_confirmed: "bg-emerald-100 text-emerald-600",
  payment_refunded: "bg-red-100 text-red-600",
  payout_settled: "bg-green-100 text-green-600",
};

function timeAgo(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function RunnerNotificationsPage() {
  const [, navigate] = useLocation();
  const { token } = useAuth();
  const { data: notifications, isLoading, refetch } = useListNotifications();
  const [markingId, setMarkingId] = useState<number | null>(null);

  const { data: runner } = useGetRunnerMe();
  // M9: Real-time notification updates via socket (needs runnerId to join room)
  useNotificationSocket(runner?.id);

  const notifs = notifications as Notification[] ?? [];
  const unreadCount = notifs.filter(n => !n.isRead).length;

  const markAsRead = async (id: number) => {
    setMarkingId(id);
    try {
      await customFetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      refetch();
    } catch { /* ignore */ }
    setMarkingId(null);
  };

  const markAllRead = async () => {
    try {
      await customFetch("/api/notifications/read-all", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      refetch();
    } catch { /* ignore */ }
  };

  const getIcon = (type: string) => TYPE_ICONS[type] ?? Bell;
  const getColor = (type: string) => TYPE_COLORS[type] ?? "bg-gray-100 text-gray-600";

  return (
    <div className="min-h-screen pb-24" style={{ background: "#080E1E" }}>
      {/* Header */}
      <div className="bg-white/5 border-b border-white/10 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/runner/feed")} className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
            <ChevronLeft size={18} className="text-white/60" />
          </button>
          <div>
            <h1 className="font-black text-white text-lg">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-[#C9A84C] font-semibold">{unreadCount} unread</p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#C9A84C]/15 text-[#C9A84C] text-xs font-bold hover:bg-[#C9A84C]/25 transition-colors"
          >
            <CheckCheck size={12} /> Mark all read
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pt-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : notifs.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Bell size={28} className="text-white/20" />
            </div>
            <p className="text-white/40 font-semibold">No notifications yet</p>
            <p className="text-white/20 text-xs mt-1">Task updates, KYC status, and payout confirmations will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifs.map(notif => {
              const Icon = getIcon(notif.type);
              const colorClass = getColor(notif.type);
              return (
                <button
                  key={notif.id}
                  onClick={() => {
                    if (!notif.isRead) markAsRead(notif.id);
                    if (notif.taskId) navigate(`/runner/active`);
                  }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    notif.isRead
                      ? "bg-white/5 border-white/10"
                      : "bg-[#C9A84C]/5 border-[#C9A84C]/20 shadow-sm"
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className={`text-sm font-bold truncate ${notif.isRead ? "text-white/50" : "text-white"}`}>
                          {notif.title}
                        </h3>
                        {!notif.isRead && (
                          <div className="w-2 h-2 rounded-full bg-[#C9A84C] flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">{notif.message}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Clock size={10} className="text-white/20" />
                        <span className="text-[10px] text-white/30">{timeAgo(notif.createdAt)}</span>
                        {notif.taskId && (
                          <>
                            <span className="text-white/10">·</span>
                            <span className="text-[10px] text-white/30 font-mono">Task #{notif.taskId}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {!notif.isRead && markingId !== notif.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                        className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/15 transition-colors flex-shrink-0"
                      >
                        <Check size={12} className="text-white/40" />
                      </button>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <RunnerBottomNav />
    </div>
  );
}
