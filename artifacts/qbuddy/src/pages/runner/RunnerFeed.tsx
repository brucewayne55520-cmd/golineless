import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { MapPin, Calendar, Search, CheckCircle, Clock, Zap } from "lucide-react";
import { useListAvailableTasks, useAcceptTask, useGetRunnerMe, useToggleOnlineStatus } from "@workspace/api-client-react";
import { RunnerBottomNav } from "@/components/BottomNav";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CATEGORY_NAMES, formatCurrency } from "@/lib/utils";

const NAVY_GRAD = "linear-gradient(135deg, #0F2557, #1D3D7C)";
const GOLD = "#C9A84C";
const GOLD_GRAD = "linear-gradient(135deg, #C9A84C, #D4B870)";
const BG = "#080E1E";

export default function RunnerFeed() {
  const [, navigate] = useLocation();
  const { data: runner, refetch: refetchRunner } = useGetRunnerMe();
  const { data: tasks, isLoading, refetch } = useListAvailableTasks({ query: { refetchInterval: 10000 } });
  const toggleOnline = useToggleOnlineStatus();
  const acceptTask = useAcceptTask();
  const [accepting, setAccepting] = useState<number | null>(null);

  const r = runner as any;
  const isOnline = r?.isOnline ?? false;

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
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <img src="/logo.jpg" alt="Go LineLess" className="h-6 w-auto brightness-0 invert" />
          </div>
          <p className="text-white/40 text-xs">
            {r?.name ? `Hello, ${r.name.split(" ")[0]}!` : "Welcome, Runner!"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {r?.kycStatus === "verified" && (
            <div className="bg-green-400/20 border border-green-400/30 px-3 py-1.5 rounded-xl">
              <span className="text-green-400 text-xs font-bold">Today: {formatCurrency(0)}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-xs">{isOnline ? "Online" : "Offline"}</span>
            <button
              onClick={handleToggle}
              className="w-12 h-6 rounded-full transition-colors relative"
              style={{ background: isOnline ? "#22C55E" : "#374151" }}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isOnline ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-white/5">
        <h1 className="text-lg font-black text-white">Available Tasks</h1>
      </div>

      {r && r.kycStatus !== "verified" && (
        <div className={`mx-4 mt-4 rounded-2xl p-4 ${r.kycStatus === "rejected" ? "bg-red-500/20 border border-red-500/30" : "bg-yellow-500/20 border border-yellow-500/30"}`}>
          <p className={`text-sm font-bold ${r.kycStatus === "rejected" ? "text-red-400" : "text-yellow-400"}`}>
            {r.kycStatus === "rejected" ? "KYC Rejected" : "KYC Pending Verification"}
          </p>
          <p className="text-white/60 text-xs mt-1">
            {r.kycStatus === "rejected" ? `Reason: ${r.kycRejectionReason ?? "Please resubmit documents"}. ` : "Complete KYC to start accepting tasks. "}
            <button onClick={() => navigate("/runner/profile")} className="underline" style={{ color: GOLD }}>
              {r.kycStatus === "rejected" ? "Resubmit KYC" : "Complete KYC"}
            </button>
          </p>
        </div>
      )}

      <div className="px-4 pt-4 space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse" />
          ))
        ) : !tasks || (tasks as any[]).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search size={40} className="text-white/20 mb-4" />
            <h3 className="font-bold text-white text-lg">No tasks available</h3>
            <p className="text-white/50 text-sm mt-1">New tasks appear here automatically</p>
            {!isOnline && <p className="text-yellow-400 text-xs mt-2">Go Online to see tasks</p>}
          </div>
        ) : (
          (tasks as any[]).map((task: any, i: number) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-white/8 border border-white/10 rounded-2xl p-4"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white flex-shrink-0">
                  <CategoryIcon category={task.category} size={22} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white">{CATEGORY_NAMES[task.category]}</h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ color: GOLD, background: `${GOLD}20` }}>
                      {formatCurrency(Number(task.price ?? 0) * 0.7)} for you
                    </span>
                  </div>
                  {task.locationArea && (
                    <p className="text-white/50 text-xs mt-0.5 flex items-center gap-1">
                      <MapPin size={10} /> {task.locationArea}, {task.locationCity ?? "Ahmedabad"}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    {task.distanceBand && (
                      <span className="text-white/40 text-xs flex items-center gap-1">
                        <Clock size={9} /> {task.distanceBand} km
                      </span>
                    )}
                    {task.urgency === "urgent" && (
                      <span className="text-red-400 text-xs flex items-center gap-1 font-semibold">
                        <Zap size={9} /> Urgent
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-white/60 text-sm mb-3 line-clamp-2">{task.description}</p>
              {task.scheduledAt && (
                <p className="text-white/40 text-xs mb-3 flex items-center gap-1">
                  <Calendar size={11} />
                  {new Date(task.scheduledAt).toLocaleDateString("en-IN")} at {new Date(task.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
              <div className="flex gap-3">
                <button className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/60 text-sm font-medium hover:bg-white/5 transition-colors">
                  Skip
                </button>
                <button
                  onClick={() => handleAccept(task.id)}
                  disabled={accepting === task.id || r?.kycStatus !== "verified"}
                  className="flex-1 px-6 py-2.5 rounded-xl text-[#0A1628] text-sm font-bold flex items-center justify-center gap-1.5"
                  style={{ background: r?.kycStatus !== "verified" ? "#374151" : GOLD_GRAD }}
                >
                  <CheckCircle size={14} />
                  {accepting === task.id ? "Accepting..." : "Accept Task"}
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
      <RunnerBottomNav />
    </div>
  );
}
