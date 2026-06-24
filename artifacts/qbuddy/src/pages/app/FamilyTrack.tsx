import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MapPin, Clock, CheckCircle2, Camera, Navigation, Shield, Wifi } from "lucide-react";
import { useFamilyTrackByToken, type FamilyTrackResponseTask, type FamilyTrackResponseRunner } from "@workspace/api-client-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { StatusBadge } from "@/components/StatusBadge";
import { PayButton } from "@/components/PayButton";
import { CATEGORY_NAMES, STATUS_LABELS, calculateQueueGap, estimateWaitTime, calculateQueueProgress } from "@/lib/utils";
import { NAVY, GOLD } from "@/lib/theme";

interface Props { token: string; }

const STATUS_ORDER = ["pending", "assigned", "on_the_way", "at_location", "in_progress", "completed"];

export default function FamilyTrack({ token }: Props) {
  const { data, isLoading, isError, error } = useFamilyTrackByToken(token, { query: { queryKey: ["familyTrack", token], refetchInterval: 10000 } });
  const socketRef = useRef<ReturnType<typeof import("socket.io-client").io> | null>(null);

  // Fix #95: Connect to Socket.IO for real-time runner location + status updates
  useEffect(() => {
    if (!data?.task?.id) return;
    const taskId = data.task.id;
    let mounted = true;

    (async () => {
      try {
        const { io } = await import("socket.io-client");
        const socket = io({ path: "/api/socket.io", transports: ["websocket", "polling"] });
        socketRef.current = socket;

        socket.on("connect", () => {
          if (!mounted) return;
          socket.emit("join_task", { taskId });
        });


      } catch (err) {
        // Socket.IO not available — fallback to polling only
      }
    })();

    return () => {
      mounted = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [data?.task?.id]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8F9FC" }}>
      <div className="text-center">
        <div className="w-10 h-10 border-4 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
        <p className="text-gray-400">Loading task status...</p>
      </div>
    </div>
  );

  if (isError) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#F8F9FC" }}>
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100 max-w-sm">
        <Shield size={40} className="text-gray-300 mx-auto mb-3" />
        <h2 className="font-black text-[#0A1628] mb-1">Tracking Not Found</h2>
        <p className="text-gray-400 text-sm">This tracking link is invalid or the task has been removed.</p>
      </div>
    </div>
  );

  if (!data) return null;
  const task = (data.task ?? {}) as FamilyTrackResponseTask & { paymentStatus?: string; paymentMethod?: string };
  const runner = data.runner ?? null;
  const taskStatus = task.status ?? "";
  const taskCategory = task.category ?? "";
  const statusIdx = STATUS_ORDER.indexOf(taskStatus);
  const photos: string[] = task.proofPhotos || [];

  return (
    <div className="min-h-screen pb-8" style={{ background: "#F8F9FC" }}>
      {/* Header */}
      <div className="bg-white px-5 py-4 border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #EEF2FA, #D9E3F5)", color: NAVY }}>
            <CategoryIcon category={taskCategory} size={22} />
          </div>
          <div>
            <h1 className="font-black text-[#0A1628]">{data.clientName}'s Task</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-semibold text-gray-400">Family Tracking · {CATEGORY_NAMES[taskCategory]}</span>
              <StatusBadge status={taskStatus} />
              {task.paymentStatus !== "paid" && !["completed","cancelled"].includes(taskStatus) && (
                <PayButton taskId={task.id as number} variant="gold" paymentMethod={task.paymentMethod as string} />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Read-only status strip */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusIdx >= 4 ? "#22C55E" : GOLD }} />
          <span className="text-sm font-semibold text-gray-700">
            {taskStatus === "completed" ? "Task completed successfully ✓" :
             taskStatus === "cancelled" ? "Task was cancelled" :
             "Task is in progress"}
          </span>
        </div>

        {/* Phase 7: Trust Score & Comrade Details Card */}
        {runner && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-[#0A1628] mb-3 text-sm flex items-center gap-1"><Shield size={14} /> Comrade Details</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: `linear-gradient(135deg, ${NAVY}, #1D3D7C)` }}>
                {runner.name?.[0] ?? "C"}
              </div>
              <div className="flex-1">
                <p className="font-bold text-[#0A1628] text-base">{runner.name ?? "Comrade"}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {runner.rating && <span className="text-xs flex items-center gap-1"><span className="text-yellow-400">★</span> {Number(runner.rating).toFixed(1)}</span>}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium $                  {(runner.trustBadge === "elite" || (runner.trustScore ?? 0) >= 80) ? "bg-green-50 text-green-700" :
                    (runner.trustScore ?? 0) >= 60 ? "bg-amber-50 text-amber-700" : "bg-gray-50 text-gray-500"
                  }`}>
                    Trust {runner.trustScore ?? "—"}
                  </span>
                </div>
                {(runner.tasksCompleted ?? 0) > 0 && (                    <p className="text-[10px] text-gray-400 mt-0.5">{runner.tasksCompleted ?? 0} tasks completed</p>
                )}
              </div>
            </div>
            {/* Trust score bar */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-gray-500">Trust Score</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(runner.trustScore ?? 0, 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: (runner.trustScore ?? 0) >= 80 ? "#22C55E" : (runner.trustScore ?? 0) >= 60 ? GOLD : "#EF4444" }}
                />
              </div>
              <span className="text-xs font-black" style={{ color: (runner.trustScore ?? 0) >= 80 ? "#22C55E" : GOLD }}>{runner.trustScore ?? 0}</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-[#0A1628] mb-3 text-sm">Progress Timeline</h3>
          <div className="space-y-0">
            {["pending", "assigned", "on_the_way", "in_progress", "completed"].map((s, i) => {
              const done = STATUS_ORDER.indexOf(s) <= statusIdx;
              const current = s === taskStatus;
              return (
                <div key={s} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "" : "bg-gray-100"}`}
                      style={done ? { background: NAVY } : {}}>
                      {done ? <CheckCircle2 size={12} className="text-white" /> : <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                    </div>
                    {i < 4 && <div className={`w-0.5 h-5 ${done ? "" : "bg-gray-100"}`} style={done ? { background: NAVY } : {}} />}
                  </div>
                  <span className={`text-xs pb-3 ${current ? "font-bold" : done ? "text-gray-700" : "text-gray-400"}`}
                    style={current ? { color: NAVY } : {}}>
                    {STATUS_LABELS[s] ?? s}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Location info */}
        {(task.locationName || task.fromArea) && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-[#0A1628] mb-2 text-sm flex items-center gap-1"><MapPin size={14} /> Location</h3>
            <p className="text-sm text-gray-600">{task.locationName}{task.locationArea ? `, ${task.locationArea}` : ""}</p>
            {task.fromArea && <p className="text-xs text-gray-400 mt-1">{task.fromArea} → {task.toArea || task.locationArea}</p>}
          </div>
        )}

        {/* Waiting timer info */}
        {(task.totalWaitingMinutes ?? 0) > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-[#0A1628] mb-1 text-sm flex items-center gap-1"><Clock size={14} /> Waiting Time</h3>
            <p className="text-lg font-black" style={{ color: GOLD }}>{task.totalWaitingMinutes} min</p>
            <p className="text-xs text-gray-400">Total waiting at location</p>
          </div>
        )}

        {/* Phase 4: Queue Intelligence Card */}
        {task.tokenNumber && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-[#0A1628] mb-2 text-sm flex items-center gap-1"><Navigation size={14} /> Queue Status</h3>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400">Token</p>
                <p className="text-lg font-black text-[#0A1628]">{task.tokenNumber}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400">Current</p>
                <p className="text-lg font-black" style={{ color: GOLD }}>{task.currentToken || "—"}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400">Counter</p>
                <p className="text-lg font-black text-[#0A1628]">{task.counterNumber || "—"}</p>
              </div>
            </div>
            {(() => {
              const gap = calculateQueueGap(task.tokenNumber, task.currentToken);
              const wait = estimateWaitTime(gap);
              const progress = calculateQueueProgress(task.tokenNumber, task.currentToken);
              return (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className="text-[9px] text-gray-400">Tokens Ahead</p>
                      <p className="text-sm font-black" style={{ color: NAVY }}>{gap != null ? gap : "—"}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className="text-[9px] text-gray-400">Est. Wait</p>
                      <p className="text-sm font-black" style={{ color: GOLD }}>{wait != null ? `${wait} min` : "—"}</p>
                    </div>
                  </div>
                  {progress != null && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-gray-400">Queue Progress</span>
                        <span className="text-xs font-bold" style={{ color: NAVY }}>{progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${GOLD}, #D4B870)` }} />
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Proof photos (read-only) */}
        {photos.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-[#0A1628] mb-3 text-sm flex items-center gap-1"><Camera size={14} /> Proof Photos</h3>
            <div className="grid grid-cols-2 gap-2">
              {photos.map((photoStr: string, i: number) => {
                let proof: Record<string, string>;
                try { proof = JSON.parse(photoStr); } catch { return null; }
                if (!proof?.imageUrl) return null;
                return (
                  <div key={i} className="rounded-xl overflow-hidden border border-gray-100">
                    <img src={proof.imageUrl} alt={proof.proofType || "Proof"} className="w-full h-24 object-cover" />
                    <div className="p-2 bg-white">
                      <p className="text-[9px] font-semibold text-gray-500 capitalize">{proof.proofType?.replace(/_/g, " ") || "Proof"}</p>
                      <p className="text-[8px] text-gray-400">{proof.timestamp ? new Date(proof.timestamp).toLocaleString("en-IN") : ""}</p>
                      {proof.address && <p className="text-[8px] text-gray-400 truncate">{proof.address}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Read-only badge */}
        <div className="flex items-center justify-center gap-2 py-3 text-gray-400 text-xs">
          <Shield size={12} />
          <span>Read-only family tracking · Go LineLess</span>
        </div>
      </div>
    </div>
  );
}
