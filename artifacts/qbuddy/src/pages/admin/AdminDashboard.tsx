import {
  ClipboardList, Zap, CheckCircle2, XCircle, Wallet, Building2, PersonStanding,
  Clock, AlertTriangle, Star, Activity, ArrowRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useGetAdminStats, useGetAdminActivity, useGetDailyOps, useGetFraudFlags } from "@workspace/api-client-react";
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
import { NAVY } from "@/lib/theme";

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { data: stats, isLoading } = useGetAdminStats({ query: { queryKey: ["adminStats"], refetchInterval: 10000 } });
  const { data: activity } = useGetAdminActivity({ query: { queryKey: ["adminActivity"], refetchInterval: 5000 } });

  const s = stats as Required<import("@workspace/api-client-react").AdminStats>;
  const pm = s?.pilotMetrics as unknown as PilotMetricsDisplay | undefined;
  const acts = (activity ?? []) as ActivityItem[];

  const { data: dailyOps } = useGetDailyOps({ query: { queryKey: ["dailyOps"], refetchInterval: 15000 } });

  const { data: fraud, refetch: refetchFraud } = useGetFraudFlags({ query: { queryKey: ["fraudFlags"], refetchInterval: 15000 } });
  const { data: reconciliation, isLoading: reconciliationLoading, isError: reconciliationError } = useQuery({
    queryKey: ["cashReconciliation"],
    queryFn: async () => {
      const token = localStorage.getItem("golineless_admin_token") || "";
      const res = await fetch("/api/admin/reconciliation?days=7", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch reconciliation");
      return res.json();
    },
    refetchInterval: 30000,
  });
  const { data: payouts, isLoading: payoutsLoading, isError: payoutsError, refetch: refetchPayouts } = useQuery({
    queryKey: ["payoutSettlements"],
    queryFn: async () => {
      const token = localStorage.getItem("golineless_admin_token") || "";
      const res = await fetch("/api/admin/payouts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch payouts");
      return res.json();
    },
    refetchInterval: 30000,
  });
  const flags: FraudFlagListFlagsItem[] = fraud?.flags ?? [];

  const metricCards: MetricCardConfig[] = s ? [
    { label: "Tasks Today", val: s.totalTasksToday, Icon: ClipboardList, color: NAVY, bg: "#EEF2FA", trend: "All time" },
    { label: "Active Now", val: s.activeNow, Icon: Zap, color: "#C9A84C", bg: "#FEF9EC", trend: "Live" },
    { label: "Completed", val: s.completedToday, Icon: CheckCircle2, color: "#16A34A", bg: "#F0FDF4", trend: "Today" },
    { label: "Cancelled", val: s.cancelledToday, Icon: XCircle, color: "#DC2626", bg: "#FEF2F2", trend: "Today" },
  ] : [];

  const revenueCards: RevenueCardConfig[] = s ? [
    { label: "GMV Today", val: s.gmvToday, Icon: Wallet, color: NAVY },
    { label: "Platform Revenue", val: s.platformRevenue, Icon: Building2, color: "#7C3AED" },
    { label: "Comrade Payouts", val: s.runnerPayouts, Icon: PersonStanding, color: "#16A34A" },
    { label: "Pending Payouts", val: s.pendingPayouts, Icon: Clock, color: "#D97706" },
  ] : [];

  const now = new Date();

  return (
    <div className="flex min-h-screen" style={{ background: "#F0F2F8" }}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div>
            <h1 className="text-xl font-black text-[#0A1628]">Command Center</h1>
            <p className="text-gray-400 text-xs mt-0.5">
              Go LineLess Operations · {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {s && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-700 text-xs font-bold">{s.totalRunnersOnline} Online</span>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
                  <Activity size={12} className="text-blue-500" />
                  <span className="text-blue-700 text-xs font-bold">{s.totalRunnersOnTask} On Task</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-xl">
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                  <span className="text-gray-600 text-xs font-bold">{s.totalRunnersOffline} Offline</span>
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
                  className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 hover:bg-amber-100 transition-colors"
                >
                  <Clock size={14} className="text-amber-600" />
                  <span className="text-amber-700 text-sm font-bold">{s.kycPending} KYC Pending</span>
                  <ArrowRight size={12} className="text-amber-400" />
                </button>
              )}
              {s.stuckTasks > 0 && (
                <button
                  onClick={() => navigate("/admin/tasks")}
                  className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 hover:bg-red-100 transition-colors"
                >
                  <AlertTriangle size={14} className="text-red-500" />
                  <span className="text-red-700 text-sm font-bold">{s.stuckTasks} Stuck Tasks</span>
                  <ArrowRight size={12} className="text-red-400" />
                </button>
              )}
              {s.newReviews > 0 && (
                <div className="flex items-center gap-2.5 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5">
                  <Star size={14} className="text-indigo-500" />
                  <span className="text-indigo-700 text-sm font-bold">{s.newReviews} New Reviews</span>
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

          {/* Activity feed */}
          <ActivityFeed activities={acts} />
        </div>
      </main>
    </div>
  );
}
