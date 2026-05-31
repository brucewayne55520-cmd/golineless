import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { MapPin, Calendar, Search, CheckCircle, Clock, Zap, Shield, Star, TrendingUp } from "lucide-react";
import { useListAvailableTasks, useAcceptTask, useGetRunnerMe, useToggleOnlineStatus } from "@workspace/api-client-react";
import { RunnerBottomNav } from "@/components/BottomNav";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CATEGORY_NAMES, formatCurrency } from "@/lib/utils";

const NAVY = "#0F2557";
const NAVY_GRAD = "linear-gradient(135deg, #0F2557, #1D3D7C)";
const GOLD = "#C9A84C";
const GOLD_GRAD = "linear-gradient(135deg, #C9A84C, #D4B870)";
const BG = "#080E1E";

const SPECIALIZATION_BADGES: Record<string, { label: string; color: string }> = {
  hospital: { label: "Hospital Expert", color: "#3B82F6" },
  senior: { label: "Senior Care", color: "#EC4899" },
  bank: { label: "Banking Help", color: "#10B981" },
  documentation: { label: "Documentation", color: "#8B5CF6" },
  emergency: { label: "Emergency Runner", color: "#EF4444" },
  medicine: { label: "Medicine Pickup", color: "#F59E0B" },
};

function getTrustLevel(tasks: number, rating: number): { label: string; color: string; icon: string } {
  if (tasks >= 100 && rating >= 4.7) return { label: "Elite Runner", color: "#C9A84C", icon: "⭐" };
  if (tasks >= 50 && rating >= 4.5) return { label: "Pro Runner", color: "#10B981", icon: "🏆" };
  if (tasks >= 20 && rating >= 4.0) return { label: "Trusted Runner", color: "#3B82F6", icon: "✓" };
  if (tasks >= 5) return { label: "Active Runner", color: "#9CA3AF", icon: "◎" };
  return { label: "New Runner", color: "#9CA3AF", icon: "○" };
}

export default function RunnerFeed() {
  const [, navigate] = useLocation();
  const { data: runner, refetch: refetchRunner } = useGetRunnerMe();
  const { data: tasks, isLoading, refetch } = useListAvailableTasks({ query: { refetchInterval: 10000 } });
  const toggleOnline = useToggleOnlineStatus();
  const acceptTask = useAcceptTask();
  const [accepting, setAccepting] = useState<number | null>(null);

  const r = runner as any;
  const isOnline = r?.isOnline ?? false;
  const totalTasks = r?.totalTasks ?? 0;
  const rating = r?.rating ? Number(r.rating) : 0;
  const trust = getTrustLevel(totalTasks, rating);

  const handleToggle = () => {
    toggleOnline.mutate({ data: { isOnline: !isOnline } } as any, {
      onSuccess: () => { refetchRunner(); },
      onError: () => toast.error("Failed to toggle status"),
    });
  };

  const handleAccept = (taskId: number) => {
    setAccepting(taskId);
    acceptTask.mutate({ id: String(taskId) } as any, {
      onSuccess: () => {
        toast.success("Task accepted! Let's go!");
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
              {r?.name ? `Hello, ${r.name.split(" ")[0]}` : "Welcome, Runner"}
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

        {/* Runner trust score bar */}
        {r?.kycStatus === "verified" && (
          <div className="bg-white/8 border border-white/10 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: `${trust.color}20` }}>
              {trust.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white text-xs font-bold">{trust.label}</span>
                <span className="text-xs font-bold" style={{ color: GOLD }}>{formatCurrency(0)} today</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star size={10} fill={GOLD} style={{ color: GOLD }} />
                  <span className="text-white/60 text-[10px]">{rating > 0 ? rating.toFixed(1) : "—"} rating</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle size={10} className="text-green-400" />
                  <span className="text-white/60 text-[10px]">{totalTasks} tasks done</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp size={10} className="text-blue-400" />
                  <span className="text-white/60 text-[10px]">70% earnings</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KYC banner */}
      {r && r.kycStatus !== "verified" && (
        <div className={`mx-4 mt-4 rounded-2xl p-4 ${r.kycStatus === "rejected" ? "bg-red-500/15 border border-red-500/30" : "bg-yellow-500/15 border border-yellow-500/30"}`}>
          <p className={`text-sm font-black ${r.kycStatus === "rejected" ? "text-red-400" : "text-yellow-400"}`}>
            {r.kycStatus === "rejected" ? "⚠ KYC Rejected" : "🔒 KYC Verification Required"}
          </p>
          <p className="text-white/60 text-xs mt-1 leading-relaxed">
            {r.kycStatus === "rejected"
              ? `Reason: ${r.kycRejectionReason ?? "Documents unclear. Please resubmit."} `
              : "Complete your identity verification to start earning. Usually verified within 24 hours. "}
            <button onClick={() => navigate("/runner/profile")} className="font-bold underline" style={{ color: GOLD }}>
              {r.kycStatus === "rejected" ? "Resubmit KYC →" : "Complete KYC →"}
            </button>
          </p>
        </div>
      )}

      {/* Tasks section */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-black text-white">Available Tasks</h1>
            {isOnline && (
              <p className="text-white/40 text-xs mt-0.5">Showing real-time opportunities near you</p>
            )}
          </div>
          <button onClick={() => refetch()} className="w-8 h-8 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center">
            <Search size={14} className="text-white/50" />
          </button>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-44 bg-white/5 rounded-2xl animate-pulse" />
            ))
          ) : !tasks || (tasks as any[]).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <Search size={28} className="text-white/20" />
              </div>
              <h3 className="font-black text-white text-lg mb-1">No tasks right now</h3>
              <p className="text-white/40 text-sm">New requests appear here instantly</p>
              {!isOnline && (
                <div className="mt-4 bg-yellow-500/15 border border-yellow-500/30 rounded-xl px-4 py-3">
                  <p className="text-yellow-400 text-xs font-semibold">Go Online to start receiving tasks</p>
                </div>
              )}
            </div>
          ) : (
            (tasks as any[]).map((task: any, i: number) => {
              const specialization = SPECIALIZATION_BADGES[task.category];
              const runnerCut = Math.round(Number(task.price ?? 0) * 0.7);

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, type: "spring", stiffness: 200 }}
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
                          {specialization && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full mt-0.5 inline-block"
                              style={{ background: `${specialization.color}25`, color: specialization.color }}>
                              {specialization.label}
                            </span>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-black" style={{ color: GOLD }}>
                            {formatCurrency(runnerCut)}
                          </div>
                          <div className="text-[9px] text-white/40">your earning</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pt-2 pb-3">
                    {task.locationArea && (
                      <p className="text-white/50 text-xs flex items-center gap-1 mb-2">
                        <MapPin size={10} /> {task.locationArea}, {task.locationCity ?? "Ahmedabad"}
                      </p>
                    )}

                    <p className="text-white/70 text-sm mb-3 line-clamp-2 leading-relaxed">{task.description}</p>

                    {/* Meta chips */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {task.distanceBand && (
                        <span className="bg-white/8 border border-white/10 text-white/50 text-[10px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1">
                          <Clock size={9} /> {task.distanceBand} km away
                        </span>
                      )}
                      {task.urgency === "urgent" && (
                        <span className="bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                          <Zap size={9} /> Urgent
                        </span>
                      )}
                      {task.seniorInvolved && (
                        <span className="bg-pink-500/20 border border-pink-500/30 text-pink-400 text-[10px] font-semibold px-2 py-1 rounded-lg">
                          👴 Senior
                        </span>
                      )}
                      {task.scheduledAt && (
                        <span className="bg-white/8 border border-white/10 text-white/40 text-[10px] px-2 py-1 rounded-lg flex items-center gap-1">
                          <Calendar size={9} />
                          {new Date(task.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2.5">
                      <button className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/50 text-sm font-semibold hover:bg-white/5 transition-colors">
                        Skip
                      </button>
                      <button
                        onClick={() => handleAccept(task.id)}
                        disabled={accepting === task.id || r?.kycStatus !== "verified"}
                        className="flex-[2] py-2.5 rounded-xl text-[#0A1628] text-sm font-black flex items-center justify-center gap-1.5 transition-all hover:shadow-lg disabled:opacity-60"
                        style={{ background: r?.kycStatus !== "verified" ? "#374151" : GOLD_GRAD }}
                      >
                        <CheckCircle size={14} />
                        {accepting === task.id ? "Accepting..." : "Accept Task"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* KYC verified trust badge at bottom */}
      {r?.kycStatus === "verified" && (
        <div className="mx-4 mt-4 mb-2 flex items-center justify-center gap-2 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
          <Shield size={12} className="text-green-400" />
          <span className="text-green-400 text-xs font-semibold">KYC Verified · Trusted Runner</span>
        </div>
      )}

      <RunnerBottomNav />
    </div>
  );
}
