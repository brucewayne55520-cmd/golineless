import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { MapPin, Camera, KeyRound, Sparkles, Moon, Navigation, Clock, CheckCircle, Phone, MessageSquare, Timer, PauseCircle, PlayCircle, Banknote, AlertTriangle, type LucideIcon } from "lucide-react";
import { useGetActiveTask, useUpdateTaskStatus, useVerifyTaskOtp, useStartWaiting, usePauseWaiting, useEndWaiting, useUpdateQueueProgress, useUploadProofPhoto, TaskStatusUpdateStatus, ProofPhotoInputProofType } from "@workspace/api-client-react";
import { RunnerBottomNav } from "@/components/BottomNav";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CATEGORY_NAMES, formatCurrency } from "@/lib/utils";
import { NAVY, NAVY_GRAD, GOLD, GOLD_GRAD } from "@/lib/theme";

const BG = "#080E1E";

/** Haptic feedback helper — triggers device vibration on critical actions */
function haptic(pattern: number | number[] = 50) {
  try { navigator.vibrate?.(pattern); } catch { /* noop */ }
}

function getAuthHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("golineless_runner_token") || ""}` };
}



interface StepBadgeProps {
  label: string;
  done: boolean;
  current: boolean;
  icon: LucideIcon;
  index: number;
}

function StepBadge({ label, done, current, icon: Icon, index }: StepBadgeProps) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${current ? "bg-white/10 border border-white/20" : done ? "bg-green-500/10" : "bg-white/5"}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${done ? "bg-green-500 text-white" : current ? "" : "bg-white/10 text-white/40"}`}
        style={current && !done ? { background: GOLD_GRAD, color: "#0A1628" } : {}}>
        {done ? <CheckCircle size={16} /> : index + 1}
      </div>
      <span className={`text-sm font-semibold ${done ? "text-green-400" : current ? "text-white" : "text-white/40"}`}>
        {label}
      </span>
      {done && <CheckCircle size={14} className="ml-auto text-green-400" />}
    </div>
  );
}

export default function ActiveTask() {
  const [, navigate] = useLocation();
  const { data: taskData, isLoading } = useGetActiveTask({ query: { queryKey: ["activeTask"], refetchInterval: 30000 } });
  const task = taskData!;

  const updateStatus = useUpdateTaskStatus({ request: { headers: getAuthHeaders() } });
  const verifyOtp = useVerifyTaskOtp();
  const startWaiting = useStartWaiting({ request: { headers: getAuthHeaders() } });
  const pauseWaiting = usePauseWaiting({ request: { headers: getAuthHeaders() } });
  const endWaiting = useEndWaiting({ request: { headers: getAuthHeaders() } });
  const updateQueueProgress = useUpdateQueueProgress({ request: { headers: getAuthHeaders() } });
  const uploadProofPhoto = useUploadProofPhoto({ request: { headers: getAuthHeaders() } });

  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [uploadedPhotos, setUploadedPhotos] = useState<Record<string, string>>({});
  const [elapsed, setElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [waitingActive, setWaitingActive] = useState(false);
  const [waitingElapsed, setWaitingElapsed] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [cashConfirmed, setCashConfirmed] = useState(false);
  const [cashConfirming, setCashConfirming] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [queueToken, setQueueToken] = useState("");
  const [queueCounter, setQueueCounter] = useState("");
  const [queueNotes, setQueueNotes] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socketRef = useRef<any>(null);

  // L12 + L3: Connect socket for waiting/queue events with error boundary and reconnection
  useEffect(() => {
    if (!task?.id) return;
    try {
      const init = async () => {
        const { io } = await import("socket.io-client");
        const sock = io(window.location.origin, {
          path: "/api/socket.io",
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 10,
        });
        sock.on("connect_error", () => { /* L12: swallow socket errors */ });
        sock.emit("join_task", { taskId: task.id });
        socketRef.current = sock;
      };
      init();
    } catch { /* L12: Socket init error boundary */ }
    return () => { socketRef.current?.disconnect(); };
  }, [task?.id]);

  // B4 FIX: Initialize waitingElapsed from server's waitingStartedAt on mount
  useEffect(() => {
    if (task?.status === "waiting_started" && task.waitingStartedAt && !waitingActive) {
      const serverElapsed = Math.max(0, Math.floor((Date.now() - new Date(task.waitingStartedAt).getTime()) / 1000));
      setWaitingElapsed(serverElapsed);
      setWaitingActive(true);
    }
  }, [task?.status, task?.waitingStartedAt]);

  // Determine current step
  useEffect(() => {
    if (!task) return;
    if (task.status === "assigned") setCurrentStepIndex(0);
    else if (task.status === "on_the_way") setCurrentStepIndex(1);
    else if (task.status === "reached_pickup") setCurrentStepIndex(2);
    else if (task.status === "reached_task_location") setCurrentStepIndex(task.pickupRequired ? 3 : 2);
    else if (task.status === "waiting_started") setCurrentStepIndex(task.pickupRequired ? 4 : 3);
    else if (task.status === "in_progress") setCurrentStepIndex(task.pickupRequired ? 4 : 3);
    else if (task.otpVerified) setCurrentStepIndex(5);
  }, [task]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerActive && task?.status === "in_progress") {
      interval = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, task?.status]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (waitingActive) {
      interval = setInterval(() => setWaitingElapsed(e => e + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [waitingActive]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const handleStatusUpdate = (status: TaskStatusUpdateStatus) => {
    if (!task) return;
    haptic(30);
    updateStatus.mutate({ id: task.id!, data: { status } }, {
      onSuccess: () => {
        const msgs: Record<string, string> = {
          on_the_way: "Marked as On the Way!",
          reached_pickup: "Reached pickup location!",
          reached_task_location: "Reached task location!",
          in_progress: "Task started!",
        };
        toast.success(msgs[status] || "Status updated!");
        if (status === "in_progress") setTimerActive(true);
      },
      onError: () => toast.error("Failed to update status"),
    });
  };

  // L8: Photo upload progress state
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const handlePhotoUpload = async (proofType: ProofPhotoInputProofType) => {
    if (!task) return;
    let lat: number | null = null;
    let lng: number | null = null;
    let address: string | null = null;

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
      address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (e) {
      toast.error("Could not get location. GPS may be unavailable.");
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target?.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        let imageUrl = ev.target?.result as string;

        try {
          const { applyWatermark } = await import("@/lib/utils");
          imageUrl = await applyWatermark(imageUrl, {
            taskId: task.id, proofType, lat, lng, address,
            timestamp: new Date().toISOString(),
          });
        } catch (e) {
          toast.error("Failed to apply watermark to photo");
        }

        setUploadedPhotos(prev => ({ ...prev, [proofType]: imageUrl }));

        // L8: Show upload progress indicator
        setUploadProgress(0);
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => prev != null ? Math.min(prev + 15, 90) : null);
        }, 200);

        uploadProofPhoto.mutate({
          id: task.id!,
          data: { imageUrl, proofType, lat: lat ?? undefined, lng: lng ?? undefined, address: address ?? undefined },
        }, {
          onSuccess: () => { clearInterval(progressInterval); setUploadProgress(100); setTimeout(() => setUploadProgress(null), 500); toast.success("Proof photo uploaded!"); },
          onError: () => { clearInterval(progressInterval); setUploadProgress(null); toast.error("Failed to upload proof photo"); },
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleOtpChange = (val: string, idx: number) => {
    if (val.length > 1) return;
    const next = [...otpDigits]; next[idx] = val;
    setOtpDigits(next);
    if (val && idx < 5) document.getElementById(`otp-active-${idx + 1}`)?.focus();
  };

  // L11: Cash payment confirmation dialog
  const handleConfirmCash = async () => {
    if (!task || cashConfirmed || cashConfirming) return;
    if (!window.confirm(`Confirm you received Rs ${task.price ?? 0} cash from the client? This cannot be undone.`)) return;
    setCashConfirming(true);
    try {
      const token = localStorage.getItem("golineless_runner_token") || "";
      const res = await fetch(`/api/tasks/${task.id}/confirm-cash`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setCashConfirmed(true);
        toast.success(data.message || "Cash payment confirmed!");
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ["#22C55E", "#16A34A"] });
      } else {
        toast.error(data.error || "Failed to confirm cash payment");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setCashConfirming(false);
    }
  };

  const handleVerifyOtp = () => {
    const otp = otpDigits.join("");
    if (otp.length !== 6) { toast.error("Enter 6-digit OTP"); return; }
    // M14 FIX: Confirmation dialog before OTP submission
    if (!window.confirm("Verify OTP? This will complete the task and mark it as done.")) return;
    haptic([50, 30, 50]);
    verifyOtp.mutate({ id: task.id, data: { otp } }, {
      onSuccess: (data: { runnerEarning?: number }) => {
        haptic([100, 50, 100]);
        setCompleted(true);
        setTimerActive(false);
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 }, colors: [NAVY, GOLD, "#1D3D7C", "#22C55E"] });
        toast.success(`Task Complete! You earned ${formatCurrency(data.runnerEarning ?? task.runnerEarning)}`);
      },
      onError: () => toast.error("Invalid OTP"),
    });
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
        <p className="text-white/50">Loading active task...</p>
      </div>
    </div>
  );

  // L8: Upload progress overlay
  const uploadProgressUI = uploadProgress != null && (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white/10 border border-white/20 rounded-2xl p-6 text-center w-64">
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
        <p className="text-white text-sm font-bold mb-2">Uploading photo...</p>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%`, background: GOLD_GRAD }} />
        </div>
        <p className="text-white/40 text-[10px] mt-1">{uploadProgress}%</p>
      </div>
    </div>
  );

  if (!task) return (
    <div className="min-h-screen flex flex-col items-center justify-center pb-20" style={{ background: BG }}>
      <Moon size={48} className="text-white/20 mb-4" />
      <h3 className="text-white font-bold text-lg">No active task</h3>
      <p className="text-white/50 text-sm mt-1 mb-5">Go to Tasks tab to find new dispatch tasks</p>
      <button onClick={() => navigate("/runner/feed")} className="px-6 py-3 rounded-xl text-[#0A1628] font-semibold" style={{ background: GOLD_GRAD }}>
        Find Tasks
      </button>
      <RunnerBottomNav />
    </div>
  );

  return (
    <div className="min-h-screen pb-24" style={{ background: BG }}>
      {uploadProgressUI}
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white">Active Task</h1>
            <p className="text-white/50 text-xs">Task #{task.id}</p>
          </div>
          {timerActive && (
            <div className="px-3 py-1.5 rounded-xl" style={{ background: GOLD_GRAD }}>
              <span className="text-[#0A1628] font-black text-lg font-mono">{formatTime(elapsed)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Task summary card */}
      <div className="mx-4 mt-4 bg-white/8 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
            <CategoryIcon category={task.category} size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-white">{CATEGORY_NAMES[task.category]}</h2>
            {task.locationName && (
              <p className="text-white/50 text-xs flex items-center gap-1">
                <MapPin size={10} /> {task.locationName}, {task.locationArea}
              </p>
            )}
          </div>
          <span className="font-black text-lg flex-shrink-0" style={{ color: GOLD }}>{formatCurrency(task.runnerEarning ?? 0)}</span>
        </div>

        {/* Dispatch info badges */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {task.fromArea && task.toArea && (
            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
              {task.fromArea} → {task.toArea}
            </span>
          )}
          {task.pickupRequired && (
            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
              📦 Pickup: {task.pickupArea || "Required"}
            </span>
          )}
          {task.estimatedDurationMinutes && (
            <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
              ⏱ ~{task.estimatedDurationMinutes} min
            </span>
          )}
        </div>

        <p className="text-white/60 text-sm mt-2">{task.description}</p>

        {/* Client info */}
        {task.user && (
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: NAVY_GRAD }}>
              {task.user.name?.[0] ?? "C"}
            </div>
            <span className="text-white/60 text-xs">{task.user.name ?? "Client"}</span>
            {task.user?.phone && (
              <div className="ml-auto flex gap-1.5">
                <a href={`tel:${task.user.phone}`} className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Phone size={10} className="text-green-400" />
                </a>
                <a href={`https://wa.me/${task.user.phone?.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                  <MessageSquare size={10} className="text-green-400" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Location info */}
      <div className="mx-4 mt-4 bg-white/8 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <MapPin size={14} className="text-white/50" />
          <h3 className="text-white font-semibold text-sm">Location Details</h3>
        </div>
        <div className="space-y-1 text-xs text-white/50">
          <p><span className="text-white/30">Task:</span> {task.locationName || "—"} ({task.locationArea || "—"})</p>
          {task.pickupRequired && (
            <p><span className="text-white/30">Pickup:</span> {task.pickupAddress || "—"} ({task.pickupArea || "—"})</p>
          )}
          {task.fromArea && <p><span className="text-white/30">From:</span> {task.fromArea} <span className="text-white/30">→ To:</span> {task.toArea || task.locationArea}</p>}
          {task.specialInstructions && (
            <p><span className="text-white/30">Instructions:</span> {task.specialInstructions}</p>
          )}
        </div>
      </div>

      {/* Step-based workflow */}
      <div className="mx-4 mt-4 space-y-2">
        {/* Step 1: Accept (always done once we see the task) */}
        <StepBadge label="Accepted Task" done={true} current={false} icon={CheckCircle} index={0} />

        {/* Step 2: Start Travel */}
        {(task.status === "assigned") && (
          <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Navigation size={16} className="text-white" />
              <h3 className="text-white font-semibold text-sm">Start Travel</h3>
            </div>
            <p className="text-white/50 text-xs mb-3">Head towards the task location to begin</p>
            {/* M1 FIX: Navigate to maps */}
            {(task.locationLat || task.taskLat) && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${task.taskLat || task.locationLat},${task.taskLng || task.locationLng}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl border border-white/20 text-white/80 text-xs font-semibold flex items-center justify-center gap-2 mb-2 hover:bg-white/5 transition-colors"
              >
                <Navigation size={12} /> Open in Maps
              </a>
            )}
            <button
              onClick={() => handleStatusUpdate("on_the_way")}
              disabled={updateStatus.isPending}
              className="w-full py-3.5 rounded-xl text-white font-bold flex items-center justify-center gap-2"
              style={{ background: NAVY_GRAD }}
            >
              <Navigation size={16} /> I'm on my way!
            </button>
          </div>
        )}

        {/* Step 3: Reached Pickup (if pickup required) */}
        {task.pickupRequired && (task.status === "on_the_way" || task.status === "reached_pickup") && (
          <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={16} className="text-amber-400" />
              <h3 className="text-white font-semibold text-sm">Reached Pickup? {uploadedPhotos["reached_pickup"] && "✓"}</h3>
            </div>
            <p className="text-white/50 text-xs mb-3">Confirm you've reached the pickup location and upload proof</p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePhotoUpload("reached_pickup")}
                className="flex-1 py-3 rounded-xl border border-amber-500/30 text-amber-400 font-semibold text-sm flex items-center justify-center gap-2"
              >
                <Camera size={14} /> {uploadedPhotos["reached_pickup"] ? "Re-upload" : "Upload Proof"}
              </button>
              {uploadedPhotos["reached_pickup"] && (
                <button
                  onClick={() => handleStatusUpdate("reached_task_location")}
                  disabled={updateStatus.isPending}
                  className="flex-1 py-3 rounded-xl text-white font-bold text-sm"
                  style={{ background: NAVY_GRAD }}
                >
                  Proceed →
                </button>
              )}
            </div>
            {uploadedPhotos["reached_pickup"] && (
              <img src={uploadedPhotos["reached_pickup"]} alt="Pickup proof" className="mt-3 w-full h-28 object-cover rounded-xl" />
            )}
          </div>
        )}

        {/* Step 4: Reached Task Location */}
        {(task.status === "reached_task_location" || (task.pickupRequired && task.status === "reached_pickup")) && (
          <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={16} className="text-green-400" />
              <h3 className="text-white font-semibold text-sm">Reached Task Location {uploadedPhotos["reached_task_location"] && "✓"}</h3>
            </div>
            <p className="text-white/50 text-xs mb-3">Confirm you're at the task location</p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePhotoUpload("reached_task_location")}
                className="flex-1 py-3 rounded-xl border border-green-500/30 text-green-400 font-semibold text-sm flex items-center justify-center gap-2"
              >
                <Camera size={14} /> Upload Location Proof
              </button>
              {uploadedPhotos["reached_task_location"] && (
                <button
                  onClick={() => handleStatusUpdate("in_progress")}
                  disabled={updateStatus.isPending}
                  className="flex-1 py-3 rounded-xl text-[#0A1628] font-bold text-sm"
                  style={{ background: GOLD_GRAD }}
                >
                  Start Task →
                </button>
              )}
            </div>
            {uploadedPhotos["reached_task_location"] && (
              <img src={uploadedPhotos["reached_task_location"]} alt="Location proof" className="mt-3 w-full h-28 object-cover rounded-xl" />
            )}
          </div>
        )}

        {/* Waiting Timer Section */}
        {(task.status === "at_location" || task.status === "in_progress" || task.status === "waiting_started") && (
          <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Timer size={16} className="text-white/50" />
              <h3 className="text-white font-semibold text-sm">Waiting Timer</h3>
            </div>
            {task.status !== "waiting_started" && !waitingActive && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    startWaiting.mutate({ id: task.id }, {
                      onSuccess: () => {
                        setWaitingActive(true);
                        setWaitingElapsed(0);
                        socketRef.current?.emit("waiting_timer_start", { taskId: task.id });
                        toast.success("Waiting timer started");
                      },
                      onError: () => toast.error("Failed to start timer"),
                    });
                  }}
                  disabled={startWaiting.isPending}
                  className="flex-1 py-3 rounded-xl border border-white/20 text-white/80 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
                >
                  <PlayCircle size={14} /> Start Waiting
                </button>
              </div>
            )}
            {(task.status === "waiting_started" || waitingActive) && (
              <div>
                <div className="text-center py-4">
                  <div className="text-3xl font-black font-mono" style={{ color: GOLD }}>
                    {String(Math.floor(waitingElapsed / 60)).padStart(2, "0")}:{String(waitingElapsed % 60).padStart(2, "0")}
                  </div>
                  <p className="text-white/40 text-xs mt-1">Waiting time</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      pauseWaiting.mutate({ id: task.id }, {
                        onSuccess: () => {
                          setWaitingActive(false);
                          socketRef.current?.emit("waiting_timer_pause", { taskId: task.id, totalMinutes: Math.round(waitingElapsed / 60) });
                          toast.success("Waiting paused");
                        },
                        onError: () => toast.error("Failed to pause"),
                      });
                    }}
                    disabled={pauseWaiting.isPending}
                    className="flex-1 py-3 rounded-xl border border-amber-500/40 text-amber-400 font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    <PauseCircle size={14} /> Pause Waiting
                  </button>
                  <button
                    onClick={() => {
                      endWaiting.mutate({ id: task.id }, {
                        onSuccess: () => {
                          setWaitingActive(false);
                          socketRef.current?.emit("waiting_timer_pause", { taskId: task.id, totalMinutes: Math.round(waitingElapsed / 60) });
                          toast.success("Waiting ended");
                        },
                        onError: () => toast.error("Failed to end"),
                      });
                    }}
                    disabled={endWaiting.isPending}
                    className="flex-1 py-3 rounded-xl bg-green-500/20 text-green-400 font-semibold text-sm"
                  >
                    End Waiting ✓
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Queue Intelligence Section */}
        {(task.status === "at_location" || task.status === "in_progress" || task.status === "waiting_started") && (
          <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={16} className="text-white/50" />
              <h3 className="text-white font-semibold text-sm">Queue Intelligence</h3>
            </div>
            {task.tokenNumber && (
              <div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="text-white/40 text-[9px] uppercase">Your Token</p>
                    <p className="text-white font-black text-lg">{task.tokenNumber}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="text-white/40 text-[9px] uppercase">Current</p>
                    <p className="font-black text-lg" style={{ color: GOLD }}>{task.currentToken || "—"}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="text-white/40 text-[9px] uppercase">Counter</p>
                    <p className="text-white font-black text-lg">{task.counterNumber || "—"}</p>
                  </div>
                </div>
                {(() => {
                  const gap = task.queueGap != null ? task.queueGap :
                    (task.currentToken && task.tokenNumber ? Math.max(0, parseInt(task.tokenNumber) - parseInt(task.currentToken)) : null);
                  const wait = task.estimatedWaitMinutes != null ? task.estimatedWaitMinutes :
                    (gap != null && !isNaN(gap) ? Math.round(gap * 1.5) : null);
                  const progress = task.queueProgressPercent != null ? task.queueProgressPercent :
                    (task.tokenNumber && task.currentToken && parseInt(task.tokenNumber) > 0
                      ? Math.max(0, Math.min(100, Math.round((parseInt(task.currentToken) / parseInt(task.tokenNumber)) * 100)))
                      : null);
                  return (
                    <div className="grid grid-cols-3 gap-1 mb-3">
                      <div className="text-center bg-white/5 rounded-lg p-1.5">
                        <p className="text-white/30 text-[8px]">Gap</p>
                        <p className="text-white font-bold text-xs">{gap != null ? gap : "—"}</p>
                      </div>
                      <div className="text-center bg-white/5 rounded-lg p-1.5">
                        <p className="text-white/30 text-[8px]">Wait</p>
                        <p className="font-bold text-xs" style={{ color: GOLD }}>{wait != null ? `${wait}m` : "—"}</p>
                      </div>
                      <div className="text-center bg-white/5 rounded-lg p-1.5">
                        <p className="text-white/30 text-[8px]">Progress</p>
                        <p className="text-white font-bold text-xs">{progress != null ? `${progress}%` : "—"}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Update form */}
            <div className="space-y-2 mb-2">
              <div className="flex gap-2">
                <input
                  value={queueToken}
                  onChange={e => setQueueToken(e.target.value)}
                  placeholder="Current token #"
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none"
                />
                <input
                  value={queueCounter}
                  onChange={e => setQueueCounter(e.target.value)}
                  placeholder="Counter #"
                  className="w-24 bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none"
                />
              </div>
              <textarea
                value={queueNotes}
                onChange={e => setQueueNotes(e.target.value)}
                placeholder="Queue notes (optional)"
                rows={2}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none resize-none"
              />
            </div>
            <button
              onClick={() => {
                updateQueueProgress.mutate({
                  id: task.id,
                  data: { currentToken: queueToken, counterNumber: queueCounter, queueNotes },
                }, {
                  onSuccess: () => {
                    socketRef.current?.emit("queue_progress_update", { taskId: task.id, currentToken: queueToken, counterNumber: queueCounter });
                    toast.success("Queue status updated!");
                    setQueueToken("");
                    setQueueCounter("");
                    setQueueNotes("");
                  },
                  onError: () => toast.error("Failed to update"),
                });
              }}
              disabled={(!queueToken && !queueCounter) || updateQueueProgress.isPending}
              className="w-full py-3 rounded-xl text-[#0A1628] font-bold text-sm"
              style={{ background: !queueToken && !queueCounter ? "#374151" : GOLD_GRAD }}
            >
              Update Queue Status
            </button>
          </div>
        )}

        {/* Step 5: Start Working */}
        {(task.status === "at_location" || task.status === "in_progress" || task.status === "waiting_started") && (
          <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-blue-400" />
              <h3 className="text-white font-semibold text-sm">Task in Progress</h3>
            </div>
            <p className="text-white/50 text-xs mb-4">Upload progress photos while you work</p>

            {/* Progress proof upload */}
            <label className="block cursor-pointer mb-3">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async (ev) => {
                    let imageUrl = ev.target?.result as string;
                    try {
                      const { applyWatermark } = await import("@/lib/utils");
                      imageUrl = await applyWatermark(imageUrl, {
                        taskId: task.id, proofType: "in_progress",
                        timestamp: new Date().toISOString(),
                      });
                    } catch (e) {
                      toast.error("Failed to apply watermark to photo");
                    }
                    setUploadedPhotos(prev => ({ ...prev, ["in_progress"]: imageUrl }));
                    uploadProofPhoto.mutate({
                      id: task.id,
                      data: { imageUrl, proofType: "in_progress" },
                    }, {
                      onSuccess: () => toast.success("Progress photo uploaded!"),
                      onError: () => toast.error("Upload failed"),
                    });
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${uploadedPhotos["in_progress"] ? "border-green-500 bg-green-500/10" : "border-white/20 hover:border-white/40"}`}>
                {uploadedPhotos["in_progress"] ? (
                  <div>
                    <img src={uploadedPhotos["in_progress"]} alt="progress" className="w-20 h-20 object-cover rounded-xl mx-auto mb-1" />
                    <p className="text-green-400 text-xs font-semibold">✓ Progress Photo</p>
                  </div>
                ) : (
                  <div>
                    <Camera size={24} className="text-white/30 mx-auto mb-1" />
                    <p className="text-white/50 text-xs">Tap to upload progress photo</p>
                  </div>
                )}
              </div>
            </label>

            <p className="text-white/40 text-xs mb-2">When task is done, take a completion photo and enter OTP</p>
            <button
              onClick={() => handlePhotoUpload("completed")}
              className="w-full py-3 rounded-xl border border-green-500/30 text-green-400 font-semibold text-sm mb-2"
            >
              <Camera size={14} className="inline mr-1" /> Upload Completion Photo
            </button>
          </div>
        )}

        {/* Step 5.5: Cash Payment Confirmation (offline mode) */}
        {task.status === "in_progress" && task.paymentMethod === "cash" && (
          <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Banknote size={16} className="text-green-400" />
              <h3 className="text-white font-semibold text-sm">Cash Payment</h3>
            </div>
            <p className="text-white/50 text-xs mb-3">Confirm you received Rs {task.price ?? 0} cash from the client</p>
            {cashConfirmed ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/20 border border-green-500/30">
                <CheckCircle size={18} className="text-green-400" />
                <div>
                  <p className="text-green-400 font-bold text-sm">Cash Confirmed ✓</p>
                  <p className="text-green-400/60 text-[10px]">Rs {task.price ?? 0} payment marked as received</p>
                </div>
              </div>
            ) : (
              <button
                onClick={handleConfirmCash}
                disabled={cashConfirming}
                className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}
              >
                <Banknote size={16} className="text-white" />
                {cashConfirming ? "Confirming..." : `Confirm Cash Received · Rs ${task.price ?? 0}`}
              </button>
            )}
          </div>
        )}

        {/* Step 6: Complete & Get OTP */}
        {task.status === "in_progress" && (
          <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <KeyRound size={16} /> Enter OTP from Client
            </h3>
            <p className="text-white/40 text-xs mb-3">Ask the client for the 6-digit OTP to complete the task</p>
            <div className="flex gap-2 justify-center mb-4">
              {otpDigits.map((d, i) => (
                <input
                  key={i}
                  id={`otp-active-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleOtpChange(e.target.value, i)}
                  onKeyDown={(e) => { if (e.key === "Backspace" && !d && i > 0) document.getElementById(`otp-active-${i - 1}`)?.focus(); }}
                  className="w-11 h-14 bg-white/10 border-2 border-white/20 rounded-xl text-center text-2xl font-black focus:outline-none transition-colors"
                  style={{ color: GOLD, borderColor: d ? GOLD : "" }}
                />
              ))}
            </div>
            <button
              onClick={handleVerifyOtp}
              disabled={verifyOtp.isPending || completed}
              className="w-full py-3.5 rounded-xl text-white font-bold"
              style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}
            >
              {verifyOtp.isPending ? "Verifying..." : completed ? "Task Complete! ✓" : "Complete Task"}
            </button>
          </div>
        )}

        {/* M3 FIX: Emergency/SOS button for senior care or emergency tasks */}
        {(task.seniorInvolved || (task.urgency as string) === "emergency") && (
          <div className="bg-white/8 border border-red-500/15 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-red-400" />
              <h3 className="text-white font-semibold text-sm">Emergency</h3>
            </div>
            <p className="text-white/50 text-xs mb-3">{task.seniorInvolved ? "Senior care task — stay alert and follow safety protocols" : "Emergency task — prioritize safety"}</p>
            <div className="flex gap-2">
              <a
                href="tel:112"
                className="flex-1 py-2.5 rounded-xl border border-red-500/40 text-red-400 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-400/10 transition-colors"
              >
                <Phone size={14} /> Call 112
              </a>
              <a
                href="tel:108"
                className="flex-1 py-2.5 rounded-xl border border-amber-500/40 text-amber-400 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-amber-400/10 transition-colors"
              >
                <Phone size={14} /> Call 108
              </a>
            </div>
          </div>
        )}

        {/* H11 FIX: Allow cancellation from all active states */}
        {(task.status === "assigned" || task.status === "on_the_way" || task.status === "reached_pickup" || task.status === "reached_task_location" || task.status === "at_location") && (
          <div className="bg-white/8 border border-red-500/10 rounded-2xl p-4">
            <button
              onClick={async () => {
                if (!window.confirm("Are you sure you want to cancel this task? This may affect your trust score.")) return;
                try {
                  const token = localStorage.getItem("golineless_runner_token") || "";
                  const res = await fetch(`/api/tasks/${task.id}/cancel`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                  });
                  if (res.ok) {
                    toast.success("Task cancelled");
                    navigate("/runner/feed");
                  } else {
                    const data = await res.json();
                    toast.error(data.error || "Failed to cancel task");
                  }
                } catch { toast.error("Network error"); }
              }}
              className="w-full py-3 rounded-xl border border-red-400/30 text-red-400 font-semibold text-sm hover:bg-red-400/10 transition-colors"
            >
              Cancel Task
            </button>
          </div>
        )}

        {/* Completion celebration */}
        <AnimatePresence>
          {completed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-500/20 border border-green-500/30 rounded-2xl p-6 text-center"
            >
              <Sparkles size={40} className="text-green-400 mx-auto mb-3" />
              <h3 className="text-white font-black text-xl mb-1">Task Complete!</h3>
              <p className="font-bold text-2xl" style={{ color: GOLD }}>{formatCurrency(task.runnerEarning ?? 0)}</p>
              <p className="text-white/50 text-xs mt-1">Added to your earnings</p>
              <button onClick={() => navigate("/runner/feed")} className="mt-4 px-6 py-3 rounded-xl text-[#0A1628] font-semibold" style={{ background: GOLD_GRAD }}>
                Find Next Task
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <RunnerBottomNav />
    </div>
  );
}
