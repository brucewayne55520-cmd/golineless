import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { MapPin, Calendar, Search, CheckCircle, Clock, Zap, Shield, Star, TrendingUp, Navigation, Timer, Wifi, Camera, CreditCard, User, Loader2, ChevronDown, RotateCw, X, Briefcase } from "lucide-react";
import { useListAvailableTasks, useAcceptTask, useGetRunnerMe, useToggleOnlineStatus, useGetRunnerReadiness, useGetRunnerEarnings, useGetActiveTask } from "@workspace/api-client-react";
import type { Task, Runner } from "@workspace/api-client-react";
import { RunnerBottomNav } from "@/components/BottomNav";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CATEGORY_NAMES, formatCurrency } from "@/lib/utils";
import { BLUE, BLUE_GRAD } from "@/lib/theme";
import { EmptyState } from "@/components/EmptyState";
import { useGpsTracking } from "@/hooks/useGpsTracking";

const BG = "#080E1E";

// Shared haversine distance calculator (km)
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function ReadinessBanner({ runner }: { runner: Runner }) {
  const { data: score, isLoading, isError } = useGetRunnerReadiness();
  const [, navigate] = useLocation();

  if (isError) return null;

  if (isLoading || !score) return (
    <div className="bg-white/8 border border-white/10 rounded-xl p-3 flex items-center gap-3">
      <Loader2 size={16} className="animate-spin text-blue-600" />
      <span className="text-white/50 text-xs">Checking readiness...</span>
    </div>
  );

  const scoreVal = score.score ?? 0;
  const scoreColor = scoreVal >= 80 ? "#22C55E" : scoreVal >= 50 ? "#3B82F6" : "#EF4444";
  const scoreLabel = score.status === "ready" ? "Ready for Dispatch" : score.status === "partial" ? "Almost Ready" : "Setup Required";

  const items: { key: string; label: string; icon: import("lucide-react").LucideIcon; ok: boolean }[] = [
    // KYC shows as ok even when pending submission (score >= 50)
    { key: "kyc", label: "KYC", icon: Shield, ok: (score.breakdown?.kyc ?? 0) >= 50 },
    { key: "gps", label: "GPS", icon: Navigation, ok: (score.breakdown?.gps ?? 0) >= 100 },
    { key: "bank", label: "Bank", icon: CreditCard, ok: (score.breakdown?.bank ?? 0) >= 100 },
    { key: "online", label: "Online", icon: Wifi, ok: (score.breakdown?.online ?? 0) >= 100 },
    { key: "selfie", label: "Selfie", icon: Camera, ok: (score.breakdown?.selfie ?? 0) >= 100 },
    { key: "name", label: "Name", icon: User, ok: (score.breakdown?.name ?? 0) >= 100 },
  ];

  return (
    <div className="bg-white/8 border border-white/10 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Wifi size={14} className="text-blue-600" />
          <span className="text-white text-xs font-bold">Dispatch Readiness</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-black" style={{ color: scoreColor }}>{scoreVal}%</span>
        </div>
      </div>        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
          <div className="h-full rounded-full transition-all" style={{ width: `${scoreVal}%`, background: scoreColor }} />
      </div>
      <p className="text-white/40 text-[10px] mb-2">{scoreLabel}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${item.ok ? "bg-green-500/15 text-green-400" : "bg-white/8 text-white/40"}`}
            >
              <Icon size={10} />
              {item.label}
            </div>
          );
        })}
      </div>
      {score.missingItems && score.missingItems.length > 0 && scoreVal < 100 && runner.kycStatus === "pending" && (
        <button
          onClick={() => navigate("/runner/onboarding")}
          className="mt-2 w-full py-2 rounded-xl text-gray-900 text-xs font-black flex items-center justify-center gap-1"
          style={{ background: "linear-gradient(135deg, #3B82F6, #60A5FA)" }}
        >
          Complete Setup ({score.missingItems?.length} steps left)
        </button>
      )}
    </div>
  );
}

function getTrustLevel(tasks: number, rating: number): { label: string; color: string; icon: string } {
  if (tasks >= 100 && rating >= 4.7) return { label: "Elite Comrade", color: "#3B82F6", icon: "⭐" };
  if (tasks >= 50 && rating >= 4.5) return { label: "Pro Comrade", color: "#10B981", icon: "🏆" };
  if (tasks >= 20 && rating >= 4.0) return { label: "Trusted Comrade", color: "#3B82F6", icon: "✓" };
  if (tasks >= 5) return { label: "Active Comrade", color: "#9CA3AF", icon: "◎" };
  return { label: "New Comrade", color: "#9CA3AF", icon: "○" };
}

function TaskCard({ task, onAccept, acceptingId, expanded, detail, loadingDetail, onToggleExpand, distance }: { task: Task; onAccept: (id: number) => void; acceptingId: number | null; expanded?: boolean; detail?: Task | null; loadingDetail?: boolean; onToggleExpand?: () => void; distance?: number | null }) {
  const runnerCut = Math.round(Number(task.price ?? 0) * 0.7);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/8 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all"
    >
      {/* Task header */}
      <div className="flex items-start gap-3 p-4 pb-0">
        <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-white flex-shrink-0">
          <CategoryIcon category={task.category} size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-black text-white text-sm">{CATEGORY_NAMES[task.category]}</h3>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-black" style={{ color: BLUE }}>
                {formatCurrency(runnerCut)}
              </div>
              <div className="text-[9px] text-white/40">your payout</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-2 pb-3">
        {/* Client area name */}
        {task.locationArea && (
          <p className="text-white/60 text-xs flex items-center gap-1 mb-1.5">
            <MapPin size={10} /> {task.locationArea}, {task.locationCity ?? "Ahmedabad"}
          </p>
        )}
        {!task.locationArea && !task.locationLat && (
          <p className="text-white/40 text-xs flex items-center gap-1 mb-1.5">
            <MapPin size={10} /> Location details not available
          </p>
        )}

        {/* From/To area */}
        {(task.fromArea || task.toArea) && (
          <p className="text-white/40 text-[10px] flex items-center gap-1 mb-1.5">
            <Navigation size={9} /> {task.fromArea || "?"} → {task.toArea || task.locationArea || "?"}
          </p>
        )}

        {/* Description */}
        <p className="text-white/70 text-sm mb-3 line-clamp-2 leading-relaxed">{task.description}</p>

        {/* Dispatch info chips */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {task.distanceBand && (
            <span className="bg-white/8 border border-white/10 text-white/50 text-[10px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1">
              <Clock size={9} /> {task.distanceBand} km
            </span>
          )}
          {/* M14: Show actual computed distance */}
          {distance != null && (
            <span className="bg-white/8 border border-white/10 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
              📍 {distance} km away
            </span>
          )}
          {task.estimatedDurationMinutes && (
            <span className="bg-white/8 border border-white/10 text-white/50 text-[10px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1">
              <Timer size={9} /> ~{task.estimatedDurationMinutes} min
            </span>
          )}
          {task.urgency === "urgent" && (
            <span className="bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
              <Zap size={9} /> Urgent
            </span>
          )}
          {task.seniorInvolved && (
            <span className="bg-pink-500/20 border border-pink-500/30 text-pink-400 text-[10px] font-semibold px-2 py-1 rounded-lg">
              👴 Senior Care
            </span>
          )}
          {task.pickupRequired && (
            <span className="bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-semibold px-2 py-1 rounded-lg">
              📦 Pickup Required
            </span>
          )}
          {task.scheduledAt && (
            <span className="bg-white/8 border border-white/10 text-white/40 text-[10px] px-2 py-1 rounded-lg flex items-center gap-1">
              <Calendar size={9} />
              {new Date(task.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
          )}
          {/* L13: Show payment method */}
          {task.paymentMethod && (
            <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1 ${task.paymentMethod === "cash" ? "bg-green-500/15 border border-green-500/30 text-green-400" : "bg-blue-500/15 border border-blue-500/30 text-blue-400"}`}>
              {task.paymentMethod === "cash" ? "💵 Cash" : "💳 Online"}
            </span>
          )}
        </div>

        {/* M6: Task detail preview */}
        {onToggleExpand && (
          <button onClick={onToggleExpand} className="w-full text-center py-1.5 text-white/30 text-[10px] font-semibold hover:text-white/50 transition-colors">
            {expanded ? "▲ Hide details" : "▼ View full details"}
          </button>
        )}
        {expanded && (
          <div className="px-4 pb-3 pt-1 border-t border-white/5">
            {loadingDetail ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 size={12} className="animate-spin text-white/30" />
                <span className="text-white/30 text-[10px]">Loading details...</span>
              </div>
            ) : detail ? (
              <div className="space-y-1.5 text-[10px] text-white/50">
                {detail.locationName && <p><span className="text-white/30">Address:</span> {detail.locationName}</p>}
                {detail.specialInstructions && <p><span className="text-white/30">Instructions:</span> {detail.specialInstructions}</p>}
                {detail.paymentMethod && <p><span className="text-white/30">Payment:</span> {detail.paymentMethod === "cash" ? "Cash on delivery" : "Online"}</p>}
                {detail.scheduledAt && <p><span className="text-white/30">Scheduled:</span> {new Date(detail.scheduledAt).toLocaleString("en-IN")}</p>}
                {(detail.urgency as string) === "emergency" && <p className="text-red-400 font-bold">⚠ EMERGENCY TASK</p>}
              </div>
            ) : null}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2.5">
          <button
            onClick={() => onAccept(task.id)}
            disabled={acceptingId === task.id}
            className="flex-1 py-2.5 rounded-xl text-gray-900 text-sm font-black flex items-center justify-center gap-1.5 transition-all hover:shadow-lg disabled:opacity-60"
            style={{ background: BLUE_GRAD }}
          >
            <CheckCircle size={14} />
            {acceptingId === task.id ? "Accepting..." : "Accept Task"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function RunnerFeed() {
  const [, navigate] = useLocation();
  const { data: runner, refetch: refetchRunner } = useGetRunnerMe();
  const { data: tasks, isLoading, refetch, isFetching } = useListAvailableTasks({ query: { queryKey: ["availableTasks"], refetchInterval: 30000, retry: false } });
  const toggleOnline = useToggleOnlineStatus();
  const acceptTask = useAcceptTask({
    request: {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("golineless_runner_token") || ""}`,
      },
    },
  });
  const [accepting, setAccepting] = useState<number | null>(null);
  // E5+L1: Socket ref for real-time dispatch notifications
  const socketRef = useRef<ReturnType<typeof import("socket.io-client").io> | null>(null);

  // Debounced refetch to avoid excessive API calls when many tasks dispatched rapidly
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const init = async () => {
        const { io } = await import("socket.io-client");
        const sock = io(window.location.origin, {
          path: "/api/socket.io",
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 10,
          // L3: Heartbeat handled server-side via pingInterval/pingTimeout
        });
        sock.on("connect_error", () => { /* L12: swallow socket init errors */ });
        // E5: Listen for new task broadcasts dispatched to this runner
        sock.on("new_task_broadcast", () => {
          // L7: Vibrate device on new task notification
          try { navigator.vibrate?.(200); } catch { /* noop */ }
          // H4: Play dispatch audio cue
          try {
            const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkI+Ig3dxa3F4hYyOiYB4dG9xeIWJj4uBe3VycXmGiI6KgHl1cnB5hoiOioB5dXJxeYaIjoqAeXVycHmGiI6KgHl1cnB5hoiOioB5dXJweYaIjoqAeXVycHmGiI6KgHl1cnB5hoiOioB5dXJweY==");
            audio.volume = 0.3;
            audio.play().catch(() => {});
          } catch { /* noop */ }
          // Debounce refetch to avoid flooding API when many tasks arrive at once
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => refetch(), 500);
        });
        socketRef.current = sock;
      };
      init();
    } catch { /* L12: Socket init error boundary */ }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      socketRef.current?.disconnect();
    };
  }, []);

  // L1: Join comrades room when runner is identified and socket is connected
  useEffect(() => {
    if (runner?.id && socketRef.current?.connected) {
      socketRef.current.emit("join_comrades_room", { runnerId: runner.id });
    } else if (runner?.id && socketRef.current) {
      socketRef.current.once("connect", () => {
        socketRef.current?.emit("join_comrades_room", { runnerId: runner.id });
      });
    }
  }, [runner?.id]);

  const { data: earningsData } = useGetRunnerEarnings();
  const earningsToday = earningsData?.today ?? 0;

  // M6: Expanded task detail state
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [expandedTaskDetail, setExpandedTaskDetail] = useState<Task | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchTaskDetail = useCallback(async (taskId: number) => {
    setLoadingDetail(true);
    try {
      const token = localStorage.getItem("golineless_runner_token") || "";
      const res = await fetch(`/api/tasks/${taskId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setExpandedTaskDetail(await res.json());
    } catch { /* ignore */ } finally { setLoadingDetail(false); }
  }, []);

  const toggleExpand = useCallback((taskId: number) => {
    if (expandedTaskId === taskId) { setExpandedTaskId(null); setExpandedTaskDetail(null); return; }
    setExpandedTaskId(taskId);
    fetchTaskDetail(taskId);
  }, [expandedTaskId, fetchTaskDetail]);

  const isOnline = runner?.isOnline ?? false;

  // H9: Check for active task to show back-to-active banner (only when online)
  const { data: activeTask } = useGetActiveTask({ query: { queryKey: ["activeTask"], refetchInterval: isOnline ? 30000 : false, retry: false, enabled: isOnline } });

  // C2+H1+M1: Use shared GPS tracking hook to emit location every 10s while online
  useGpsTracking({ enabled: isOnline, taskId: null, runnerId: runner?.id, socketRef });

  const totalTasks = runner?.totalTasks ?? 0;
  const rating = runner?.rating ? Number(runner.rating) : 0;
  const trust = getTrustLevel(totalTasks, rating);

  // Fix #51 + M14: Sort tasks by distance, compute distance per task
  const getTaskDistance = useCallback((task: Task) => {
    const runnerLat = runner?.currentLat ? Number(runner.currentLat) : null;
    const runnerLng = runner?.currentLng ? Number(runner.currentLng) : null;
    const tLat = task.locationLat ? Number(task.locationLat) : null;
    const tLng = task.locationLng ? Number(task.locationLng) : null;
    if (runnerLat == null || runnerLng == null || tLat == null || tLng == null) return null;
    return Math.round(haversineDistance(runnerLat, runnerLng, tLat, tLng) * 10) / 10;
  }, [runner?.currentLat, runner?.currentLng]);

  const sortedTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    const runnerLat = runner?.currentLat ? Number(runner.currentLat) : null;
    const runnerLng = runner?.currentLng ? Number(runner.currentLng) : null;
    if (runnerLat == null || runnerLng == null) return tasks;

    return [...tasks].sort((a, b) => {
      const aLat = a.locationLat ? Number(a.locationLat) : null;
      const aLng = a.locationLng ? Number(a.locationLng) : null;
      const bLat = b.locationLat ? Number(b.locationLat) : null;
      const bLng = b.locationLng ? Number(b.locationLng) : null;
      const distA = aLat != null && aLng != null ? haversineDistance(runnerLat, runnerLng, aLat, aLng) : Infinity;
      const distB = bLat != null && bLng != null ? haversineDistance(runnerLat, runnerLng, bLat, bLng) : Infinity;
      return distA - distB;
    });
  }, [tasks, runner?.currentLat, runner?.currentLng]);

  // M5: Pagination state for infinite scroll (must be after sortedTasks)
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const allTasks = sortedTasks;
  const paginatedTasks = allTasks.slice(0, (page + 1) * PAGE_SIZE);
  const hasMore = allTasks.length > (page + 1) * PAGE_SIZE;

  const handleToggle = () => {
    toggleOnline.mutate({ data: { isOnline: !isOnline } }, {
      onSuccess: () => { refetchRunner(); },
      onError: () => toast.error("Failed to toggle status"),
    });
  };

  const handleAccept = (taskId: number) => {
    setAccepting(taskId);
    acceptTask.mutate({ id: Number(taskId) }, {
      onSuccess: () => {
        toast.success("Task accepted! Let's go!");
        // C8+M7 FIX: Invalidate queries so active task loads immediately
        refetch();
        navigate("/runner/active");
      },
      onError: () => { toast.error("Failed to accept task"); setAccepting(null); },
    });
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: BG }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <img src="/logo.jpg" alt="Go LineLess" className="h-6 w-auto brightness-0 invert" />
            </div>
            <p className="text-white/50 text-xs">
              {runner?.name ? `Hello, ${runner.name.split(" ")[0]}` : "Welcome, Comrade"}
            </p>
          </div>
          {/* Online/Offline toggle */}
          <div className="flex items-center gap-2.5 bg-white/8 border border-white/10 rounded-xl px-3 py-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-400 animate-pulse" : "bg-gray-500"}`} />
            <span className="text-white/70 text-xs font-semibold">{isOnline ? "Online" : "Offline"}</span>
            <button
              onClick={handleToggle}
              className="w-11 h-6 rounded-full transition-all relative ml-1"
              style={{ background: isOnline ? "#22C55E" : "#374151" }}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${isOnline ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>

        {/* Trust score bar */}          {runner?.kycStatus === "verified" ? (
            <div className="bg-white/8 border border-white/10 rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: `${trust.color}20` }}>
                {trust.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-xs font-bold">{trust.label}</span>
                  <span className="text-xs font-bold" style={{ color: BLUE }}>{formatCurrency(earningsToday)} today</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Star size={10} fill={BLUE} style={{ color: BLUE }} />
                    <span className="text-white/60 text-[10px]">{rating > 0 ? rating.toFixed(1) : "—"} rating</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle size={10} className="text-green-400" />
                    <span className="text-white/60 text-[10px]">{totalTasks} tasks done</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp size={10} className="text-blue-400" />
                    <span className="text-white/60 text-[10px]">lifetime earnings</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            runner && (
              <ReadinessBanner runner={runner} />
            )
          )}
      </div>

      {/* KYC banner */}
      {runner && runner.kycStatus !== "verified" && (
        <div className={`mx-4 mt-4 rounded-2xl p-4 ${runner.kycStatus === "rejected" ? "bg-red-500/15 border border-red-500/30" : "bg-yellow-500/15 border border-yellow-500/30"}`}>
          <p className={`text-sm font-black ${runner.kycStatus === "rejected" ? "text-red-400" : "text-yellow-400"}`}>
            {runner.kycStatus === "rejected" ? "⚠ KYC Rejected" : "🔒 KYC Verification Required"}
          </p>
          <p className="text-white/60 text-xs mt-1 leading-relaxed">
            {runner.kycStatus === "rejected"
              ? `Reason: ${runner.kycRejectionReason ?? "Documents unclear. Please resubmit."} `
              : "Complete your identity verification to start earning. Usually verified within 24 hours. "}
            <button onClick={() => navigate("/runner/profile")} className="font-bold underline" style={{ color: BLUE }}>
              {runner.kycStatus === "rejected" ? "Resubmit KYC →" : "Complete KYC →"}
            </button>
          </p>
        </div>
      )}

      {/* H9: Active task banner */}
      {activeTask && (
        <div className="mx-4 mt-4">
          <button
            onClick={() => navigate("/runner/active")}
            className="w-full bg-green-500/15 border border-green-500/30 rounded-2xl px-4 py-3 flex items-center gap-3 hover:bg-green-500/20 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <Briefcase size={18} className="text-green-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-green-400 font-bold text-sm">Active Task in Progress</p>
              <p className="text-green-400/60 text-xs">Task #{activeTask.id} · {activeTask.status?.replace(/_/g, " ")}</p>
            </div>
            <span className="text-green-400 text-xs font-bold">→ Go</span>
          </button>
        </div>
      )}

      {/* Tasks section */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-black text-white">Available Tasks</h1>
            {isOnline && (
              <p className="text-white/40 text-xs mt-0.5">Showing real-time dispatch near you</p>
            )}
          </div>
          <button onClick={() => refetch()} className="w-8 h-8 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center">
            <Search size={14} className="text-white/50" />
          </button>
        </div>

        {/* M4: Pull-to-refresh indicator + refresh button */}
        {isFetching && !isLoading && (
          <div className="flex items-center justify-center gap-2 py-2 mb-2">
            <RotateCw size={12} className="animate-spin text-blue-600" />
            <span className="text-white/40 text-[10px]">Refreshing...</span>
          </div>
        )}

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white/8 border border-white/10 rounded-2xl p-4 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-white/10" />
                  <div className="flex-1 space-y-2"><div className="h-4 w-24 bg-white/10 rounded" /><div className="h-2 w-16 bg-white/10 rounded" /></div>
                  <div className="h-6 w-16 bg-white/10 rounded-lg" />
                </div>
                <div className="h-2 w-full bg-white/10 rounded mb-2" /><div className="h-2 w-3/4 bg-white/10 rounded mb-3" />
                <div className="flex gap-2"><div className="h-6 w-20 bg-white/10 rounded-lg" /><div className="h-6 w-16 bg-white/10 rounded-lg" /><div className="h-6 w-24 bg-white/10 rounded-lg" /></div>
                <div className="h-10 w-full bg-white/10 rounded-xl mt-3" />
              </div>
            ))
          ) : !tasks || tasks.length === 0 ? (
            <>
              <EmptyState
                icon={Search}
                title="No tasks right now"
                description="New dispatch requests appear here instantly"
                variant="dark"
              />
              {!isOnline && (
                <div className="mt-4 bg-yellow-500/15 border border-yellow-500/30 rounded-xl px-4 py-3">
                  <p className="text-yellow-400 text-xs font-semibold">Go Online to receive dispatch notifications</p>
                </div>
              )}
            </>
          ) : (
            paginatedTasks.map((task: Task) => (
              <TaskCard
                key={task.id}
                task={task}
                onAccept={handleAccept}
                acceptingId={accepting}
                expanded={expandedTaskId === task.id}
                detail={expandedTaskId === task.id ? expandedTaskDetail : null}
                loadingDetail={expandedTaskId === task.id && loadingDetail}
                onToggleExpand={() => toggleExpand(task.id)}
                distance={getTaskDistance(task)}
              />
            ))
          )}
          {/* M5: Load more button */}
          {hasMore && !isLoading && (
            <button onClick={() => setPage(p => p + 1)} className="w-full py-2.5 text-white/40 text-xs font-semibold flex items-center justify-center gap-1.5 hover:text-white/60 transition-colors">
              <ChevronDown size={14} /> Load more tasks ({allTasks.length - paginatedTasks.length} remaining)
            </button>
          )}
        </div>
      </div>



      {/* Trust badge */}
      {runner?.kycStatus === "verified" && (
        <div className="mx-4 mt-4 mb-2 flex items-center justify-center gap-2 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
          <Shield size={12} className="text-green-400" />
          <span className="text-green-400 text-xs font-semibold">KYC Verified · Trusted Comrade</span>
        </div>
      )}

      <RunnerBottomNav />
    </div>
  );
}
