import {
  ClipboardList, Zap, CheckCircle2, XCircle, Wallet, Building2, PersonStanding,
  Clock, AlertTriangle, Star, Activity, ArrowRight, Shield,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useGetAdminStats, useGetAdminActivity, useGetDailyOps, useGetFraudFlags, customFetch } from "@workspace/api-client-react";
import type { ActivityItem, FraudFlagListFlagsItem } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import AdminSidebar from "@/components/AdminSidebar";

import SLAWidget from "./SLAWidget";
import MetricCards from "./MetricCards";
import type { MetricCardConfig } from "./MetricCards";
import RevenueCards from "./RevenueCards";
import type { RevenueCardConfig } from "./RevenueCards";
import DispatchBanner from "./DispatchBanner";
import QueueIntelligence from "./QueueIntelligence";
import TrustScoreDashboard from "./TrustScoreDashboard";
import RevenueAnalytics from "./RevenueAnalytics";
import PilotMetricsPanel from "./PilotMetricsPanel";
import type { PilotMetricsDisplay } from "./PilotMetricsPanel";
import FraudAlertsWidget from "./FraudAlertsWidget";
import PilotMonitoringPanel from "./PilotMonitoringPanel";
import DailyOpsPanel from "./DailyOpsPanel";
import HubOperationsOverview from "./HubOperationsOverview";
import CashReconciliationPanel from "./CashReconciliationPanel";
import PayoutSettlementPanel from "./PayoutSettlementPanel";
import ActivityFeed from "./ActivityFeed";
import { DARK } from "@/lib/theme";
import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

// H8: Real-time admin notifications via Socket.IO
function useAdminSocket(refetchStats: () => void) {
  const socketRef = useRef<unknown>(null);
  useEffect(() => {
    const init = async () => {
      try {
        const { io } = await import("socket.io-client");
        const authToken = localStorage.getItem("golineless_admin_token") || localStorage.getItem("golineless_runner_token") || localStorage.getItem("golineless_user_token") || "";
        const sock = io(window.location.origin, { path: "/api/socket.io", auth: { token: authToken }, reconnection: true, reconnectionDelay: 2000, reconnectionAttempts: 5 });
        sock.on("connect_error", () => { /* swallow */ });
        sock.emit("join_admin_map");
        sock.on("task_status_changed", (data: { taskId?: number; status?: string }) => {
          toast.info(`Task #${data.taskId ?? "?"} → ${(data.status ?? "?").replace(/_/g, " ")}`);
          refetchStats();
        });
        sock.on("fraud_alert", (data: { taskId?: number; type?: string }) => {
          toast.warning(`Fraud alert: ${data.type ?? "unknown"} on Task #${data.taskId ?? "?"}`);
        });
        sock.on("new_proof_photo", (data: { taskId?: number }) => {
          toast.info(`Proof photo uploaded for Task #${data.taskId ?? "?"}`);
        });
        sock.on("task_accepted", (data: { taskId?: number; runnerId?: number }) => {
          toast.success(`Runner #${data.runnerId ?? "?"} accepted Task #${data.taskId ?? "?"}`);
        });
        sock.on("cash_payment_confirmed", (data: { taskId?: number }) => {
          toast.success(`Cash confirmed for Task #${data.taskId ?? "?"}`);
        });
        socketRef.current = sock;
      } catch { /* socket init failed — non-critical */ }
    };
    init();
    return () => { (socketRef.current as { disconnect?: () => void })?.disconnect?.(); };
  }, [refetchStats]);
}

// L4: Keyboard shortcuts
function useAdminShortcuts(navigate: (path: string) => void) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
    if (!e.altKey && !e.ctrlKey && !e.metaKey) return;
    const shortcuts: Record<string, string> = {
      d: "/admin", t: "/admin/tasks", r: "/admin/runners", m: "/admin/map",
      h: "/admin/heatmap", a: "/admin/analytics", s: "/admin/settings",
      k: "/admin/kyc", n: "/admin/audit-log", o: "/admin/operations",
    };
    const key = e.key.toLowerCase();
    if (shortcuts[key]) { e.preventDefault(); navigate(shortcuts[key]); }
  }, [navigate]);
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  // H8: Wire up real-time socket + L4 keyboard shortcuts
  useAdminShortcuts(navigate);
  const { data: stats, isLoading, refetch: refetchStats } = useGetAdminStats({ query: { queryKey: ["adminStats"], refetchInterval: 10000 } });
  // H8 FIX: Stable callback to prevent socket reconnection loop
  const refetchAll = useCallback(() => { refetchStats(); }, [refetchStats]);
  useAdminSocket(refetchAll);
  const { data: activity } = useGetAdminActivity({ query: { queryKey: ["adminActivity"], refetchInterval: 5000 } });

  // H1 FIX: Use customFetch instead of raw fetch for KYC metrics
  const { data: kycMetrics } = useQuery({
    queryKey: ["kycMetrics"],
    queryFn: async () => {
      const [usersData, runnersData] = await Promise.all([
        customFetch("/api/admin/users?limit=500") as Promise<Array<{ kycStatus?: string; updatedAt?: string }>>,
        customFetch("/api/admin/runners?limit=500") as Promise<Array<{ kycStatus?: string; updatedAt?: string }>>,
      ]);
      const allUsers = Array.isArray(usersData) ? usersData : [];
      const allRunners = Array.isArray(runnersData) ? runnersData : [];
      const all = [...allUsers, ...allRunners];
      const stale = all.filter((u) =>
        u.kycStatus === "pending" && u.updatedAt && (Date.now() - new Date(u.updatedAt).getTime()) > 7 * 86400000
      ).length;
      return {
        pending: all.filter((u) => u.kycStatus === "pending").length,
        verified: all.filter((u) => u.kycStatus === "verified").length,
        rejected: all.filter((u) => u.kycStatus === "rejected").length,
        stale,
        total: all.length,
      };
    },
    refetchInterval: 60000,
  });

  const s = stats as Required<import("@workspace/api-client-react").AdminStats>;
  const pm = s?.pilotMetrics as unknown as PilotMetricsDisplay | undefined;
  const acts = (activity ?? []) as ActivityItem[];

  const { data: dailyOps } = useGetDailyOps({ query: { queryKey: ["dailyOps"], refetchInterval: 15000 } });

  const { data: fraud, refetch: refetchFraud } = useGetFraudFlags({ query: { queryKey: ["fraudFlags"], refetchInterval: 15000 } });
  // H2 FIX: Use customFetch instead of raw fetch for reconciliation and payouts
  const { data: reconciliation, isLoading: reconciliationLoading, isError: reconciliationError } = useQuery({
    queryKey: ["cashReconciliation"],
    queryFn: () => customFetch("/api/admin/reconciliation?days=7") as Promise<{ summary: { totalCashCollected: number; totalCashPending: number; totalOnlineCollected: number; totalOnlinePending: number; cashRunnerPayouts: number; onlineRunnerPayouts: number; pendingRunnerPayouts: number; cashPlatformFees: number; onlinePlatformFees: number; totalCashTasks: number; totalOnlineTasks: number; cashConfirmedCount: number; cashPendingCount: number }; dailyBreakdown: Array<{ date: string; cashCollected: number; cashPending: number; onlineCollected: number; runnerPayouts: number; platformFees: number; cashTasks: number; onlineTasks: number; totalTasks: number }>; runnerReconciliation: Array<{ runnerId: number; name: string; cashTasksCollected: number; cashCollected: number; runnerPayout: number; totalTasks: number; totalEarnings: number }> } | undefined>,
    refetchInterval: 30000,
  });
  const { data: payouts, isLoading: payoutsLoading, isError: payoutsError, refetch: refetchPayouts } = useQuery({
    queryKey: ["payoutSettlements"],
    queryFn: () => customFetch("/api/admin/payouts") as Promise<{ runners: Array<{ runnerId: number; name: string; phone: string | null; bankAccount: string | null; bankIfsc: string | null; outstandingAmount: number; unsettledTaskCount: number; unsettledTaskIds: number[]; settledAmount: number; totalPaidOut: number; lifetimeEarnings: number; totalTasks: number }>; settlements: Array<{ id: number; runnerId: number; runnerName: string; amount: number; taskCount: number; taskIds: string; status: string; settledBy: string | null; settledAt: string | null; reference: string | null; notes: string | null; createdAt: string }> } | undefined>,
    refetchInterval: 30000,
  });
  const flags: FraudFlagListFlagsItem[] = fraud?.flags ?? [];

  const metricCards: MetricCardConfig[] = s ? [
    { label: "Tasks Today", val: s.totalTasksToday, Icon: ClipboardList, color: DARK, bg: "#E8EDF5", trend: "All time" },
    { label: "Active Now", val: s.activeNow, Icon: Zap, color: "#3B82F6", bg: "#FEF7E0", trend: "Live" },
    { label: "Completed", val: s.completedToday, Icon: CheckCircle2, color: "#16A34A", bg: "#ECFDF5", trend: "Today" },
    { label: "Cancelled", val: s.cancelledToday, Icon: XCircle, color: "#DC2626", bg: "#FEF2F2", trend: "Today" },
  ] : [];

  const revenueCards: RevenueCardConfig[] = s ? [
    { label: "GMV Today", val: s.gmvToday, Icon: Wallet, color: DARK },
    { label: "Platform Revenue", val: s.platformRevenue, Icon: Building2, color: "#7C3AED" },
    { label: "Comrade Payouts", val: s.runnerPayouts, Icon: PersonStanding, color: "#16A34A" },
    { label: "Pending Payouts", val: s.pendingPayouts, Icon: Clock, color: "#D97706" },
  ] : [];

  const now = new Date();

  return (
    <div className="flex min-h-screen gl-surface dark:bg-[#0A0E1A]" role="main" aria-label="Admin Dashboard">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}          <div className="bg-white dark:bg-[#111827] border-b border-gray-200 dark:border-[#1F2937] px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-10 gl-shadow-sm">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">Command Center</h1>
            <p className="text-gray-500 text-xs mt-0.5">
              Go LineLess Operations · {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <p className="text-gray-400 text-[9px] mt-0.5">Alt+D Dashboard · Alt+T Tasks · Alt+R Runners · Alt+M Map · Alt+K KYC</p>
          </div>
          <div className="flex items-center gap-3">
            {s && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-1.5 rounded-xl gl-transition">
                  <div className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse" />
                  <span className="text-[#059669] text-xs font-bold">{s.totalRunnersOnline} Online</span>
                </div>
                <div className="flex items-center gap-2 bg-[#EEF2FF] border border-[#C7D2FE] px-3 py-1.5 rounded-xl gl-transition">
                  <Activity size={12} className="text-[#6366F1]" />
                  <span className="text-[#4F46E5] text-xs font-bold">{s.totalRunnersOnTask} On Task</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-100 border border-gray-300 px-3 py-1.5 rounded-xl gl-transition">
                  <div className="w-2 h-2 bg-[#9CA3AF] rounded-full" />
                  <span className="text-gray-500 text-xs font-bold">{s.totalRunnersOffline} Offline</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Alert banners */}
          {s && (s.kycPending > 0 || s.stuckTasks > 0 || s.newReviews > 0) && (
            <div className="flex gap-3 mb-5 flex-wrap">
              {s.kycPending > 0 && (
                <button
                  onClick={() => navigate("/admin/runners")}
                  className="flex items-center gap-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-4 py-2.5 hover:bg-[#FEF3C7] gl-transition"
                >
                  <Clock size={14} className="text-[#D97706]" />
                  <span className="text-[#B45309] text-sm font-bold">{s.kycPending} KYC Pending</span>
                  <ArrowRight size={12} className="text-[#F59E0B]" />
                </button>
              )}
              {s.stuckTasks > 0 && (
                <button
                  onClick={() => navigate("/admin/tasks")}
                  className="flex items-center gap-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-2.5 hover:bg-[#FEE2E2] gl-transition"
                >
                  <AlertTriangle size={14} className="text-[#DC2626]" />
                  <span className="text-[#B91C1C] text-sm font-bold">{s.stuckTasks} Stuck Tasks</span>
                  <ArrowRight size={12} className="text-[#EF4444]" />
                </button>
              )}
              {s.newReviews > 0 && (
                <div className="flex items-center gap-2.5 bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl px-4 py-2.5 gl-transition">
                  <Star size={14} className="text-[#6366F1]" />
                  <span className="text-[#4338CA] text-sm font-bold">{s.newReviews} New Reviews</span>
                </div>
              )}
            </div>
          )}

          {/* Metric cards */}
          <MetricCards cards={metricCards} isLoading={isLoading} />

          {/* Revenue cards */}
          {s && <RevenueCards cards={revenueCards} />}

          {/* Dispatch monitoring banner */}
          {s && (
            <DispatchBanner
              activeNow={s.activeNow}
              totalRunnersOnTask={s.totalRunnersOnTask}
              stuckTasks={s.stuckTasks}
            />
          )}

          {/* Phase 4: Queue Intelligence */}
          {s?.queueMetrics && <QueueIntelligence queueMetrics={s.queueMetrics} />}

          {/* Phase 5: Trust Score Dashboard */}
          {s?.trustMetrics && <TrustScoreDashboard trustMetrics={s.trustMetrics} />}

          {/* Cash Reconciliation Dashboard */}
          <CashReconciliationPanel data={reconciliation} isLoading={reconciliationLoading} isError={reconciliationError} />

          {/* Payout Settlement */}
          <div className="mt-5">
            <PayoutSettlementPanel data={payouts} isLoading={payoutsLoading} isError={payoutsError} refetch={refetchPayouts} />
          </div>

          {/* Phase 6: Revenue Analytics */}
          {s?.revenueMetrics && <RevenueAnalytics revenueMetrics={s.revenueMetrics} />}

          {/* Phase 6: Pilot Launch Dashboard */}
          {pm && <PilotMetricsPanel pilotMetrics={pm} />}

          {/* A4: KYC Metrics Widget */}
          {kycMetrics && kycMetrics.total > 0 && (
            <div className="mt-5 bg-white dark:bg-[#111827] rounded-2xl p-5 border border-gray-200 dark:border-[#1F2937] gl-shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Shield size={18} /> KYC Overview
                </h3>
                <button
                  onClick={() => navigate("/admin/kyc")}
                  className="text-xs font-semibold text-[#7C3AED] hover:underline"
                >
                  View All →
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                <div className="bg-[#FFFBEB] rounded-xl p-3 text-center gl-transition">
                  <p className="text-2xl font-bold text-[#D97706]">{kycMetrics.pending}</p>
                  <p className="text-xs text-[#B45309] font-semibold">Pending</p>
                </div>
                <div className="bg-[#ECFDF5] rounded-xl p-3 text-center gl-transition">
                  <p className="text-2xl font-bold text-[#059669]">{kycMetrics.verified}</p>
                  <p className="text-xs text-[#047857] font-semibold">Verified</p>
                </div>
                <div className="bg-[#FEF2F2] rounded-xl p-3 text-center gl-transition">
                  <p className="text-2xl font-bold text-[#DC2626]">{kycMetrics.rejected}</p>
                  <p className="text-xs text-[#B91C1C] font-semibold">Rejected</p>
                </div>
                {kycMetrics.stale > 0 && (
                  <div className="bg-[#FEF2F2] rounded-xl p-3 text-center border border-[#FECACA] gl-transition">
                    <p className="text-2xl font-bold text-[#DC2626]">{kycMetrics.stale}</p>
                    <p className="text-xs text-[#B91C1C] font-semibold">Overdue (&gt;7d)</p>
                  </div>
                )}
                <div className="bg-gray-100 rounded-xl p-3 text-center gl-transition">
                  <p className="text-2xl font-bold text-[#374151]">{kycMetrics.total}</p>
                  <p className="text-xs text-gray-500 font-semibold">Total</p>
                </div>
              </div>
            </div>
          )}

          {/* Phase 7.2: Fraud Alerts */}
          {fraud && flags.length > 0 && (
            <FraudAlertsWidget
              fraud={{ highSeverity: fraud.highSeverity ?? 0, total: fraud.total }}
              flags={flags}
              onRefresh={refetchFraud}
            />
          )}

          {/* Phase 7.2: Pilot Monitoring */}
          {s?.monitoring && <PilotMonitoringPanel monitoring={s.monitoring} />}

          {/* Phase 9: Daily Operations */}
          {dailyOps && <DailyOpsPanel dailyOps={dailyOps} />}

          {/* Hub Operations + SLA Widget */}
          <SLAWidget />
          {s?.hubStats && <HubOperationsOverview hubStats={s.hubStats} />}

          {/* L1: Changelog widget */}
          <div className="mt-5 bg-gradient-to-r from-[#EEF2FF] to-[#F5F3FF] dark:from-[#1E1B4B] dark:to-[#2E1065] rounded-2xl p-5 border border-[#C7D2FE] dark:border-[#4338CA]">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3">📋 What's New</h3>
            <div className="space-y-2 text-xs">
              {[
                { date: "Jun 2026", text: "Phase 5: Runner earnings chart, task timeline, quick actions, keyboard shortcuts" },
                { date: "Jun 2026", text: "Phase 4: Real-time notifications, heatmap SQL optimization, training overview" },
                { date: "May 2026", text: "Phase 3: Admin notifications center, KYC search, bulk actions" },
                { date: "May 2026", text: "Phase 2: Trust scores, fraud detection, dispatch engine improvements" },
              ].map((item, i) => (
                <div key={i} className="flex gap-2">
                  <span className="font-bold text-[#6366F1] dark:text-[#A78BFA] whitespace-nowrap">{item.date}</span>
                  <span className="text-gray-500 dark:text-gray-400">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity feed */}
          <ActivityFeed activities={acts} />
        </div>
      </main>
    </div>
  );
}
