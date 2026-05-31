import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { MapPin, Camera, KeyRound, Sparkles, Moon } from "lucide-react";
import { useListTasks, useUpdateTaskStatus, useVerifyTaskOtp, useGetRunnerMe } from "@workspace/api-client-react";
import { RunnerBottomNav } from "@/components/BottomNav";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CATEGORY_NAMES, formatCurrency } from "@/lib/utils";

const NAVY = "#0F2557";
const NAVY_GRAD = "linear-gradient(135deg, #0F2557, #1D3D7C)";
const GOLD = "#C9A84C";
const GOLD_GRAD = "linear-gradient(135deg, #C9A84C, #D4B870)";
const BG = "#080E1E";

export default function ActiveTask() {
  const [, navigate] = useLocation();
  const { data: runner } = useGetRunnerMe();
  const { data: tasks, isLoading } = useListTasks({ params: { role: "runner", status: "assigned,on_the_way,at_location,in_progress" } as any, query: { refetchInterval: 5000 } });
  const updateStatus = useUpdateTaskStatus();
  const verifyOtp = useVerifyTaskOtp();
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [completed, setCompleted] = useState(false);

  const task: any = tasks && (tasks as any[]).length > 0 ? (tasks as any[])[0] : null;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerActive && task?.status === "in_progress") {
      interval = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, task?.status]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const handleStatus = (status: string) => {
    if (!task) return;
    updateStatus.mutate({ id: String(task.id), data: { status } } as any, {
      onSuccess: () => {
        toast.success(status === "in_progress" ? "Task started!" : "Status updated!");
        if (status === "in_progress") setTimerActive(true);
      },
      onError: () => toast.error("Failed to update status"),
    });
  };

  const handleOtpChange = (val: string, idx: number) => {
    if (val.length > 1) return;
    const next = [...otpDigits]; next[idx] = val;
    setOtpDigits(next);
    if (val && idx < 5) document.getElementById(`otp-active-${idx + 1}`)?.focus();
  };

  const handleVerifyOtp = () => {
    const otp = otpDigits.join("");
    if (otp.length !== 6) { toast.error("Enter 6-digit OTP"); return; }
    verifyOtp.mutate({ id: String(task.id), data: { otp } } as any, {
      onSuccess: (data: any) => {
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

  if (!task) return (
    <div className="min-h-screen flex flex-col items-center justify-center pb-20" style={{ background: BG }}>
      <Moon size={48} className="text-white/20 mb-4" />
      <h3 className="text-white font-bold text-lg">No active task</h3>
      <p className="text-white/50 text-sm mt-1 mb-5">Go to Tasks tab to find new tasks</p>
      <button onClick={() => navigate("/runner/feed")} className="px-6 py-3 rounded-xl text-[#0A1628] font-semibold" style={{ background: GOLD_GRAD }}>
        Find Tasks
      </button>
      <RunnerBottomNav />
    </div>
  );

  return (
    <div className="min-h-screen pb-24" style={{ background: BG }}>
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

      <div className="mx-4 mt-4 bg-white/8 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
            <CategoryIcon category={task.category} size={22} />
          </div>
          <div>
            <h2 className="font-bold text-white">{CATEGORY_NAMES[task.category]}</h2>
            {task.locationName && (
              <p className="text-white/50 text-xs flex items-center gap-1">
                <MapPin size={10} /> {task.locationName}, {task.locationArea}
              </p>
            )}
          </div>
          <span className="ml-auto font-black text-lg" style={{ color: GOLD }}>{formatCurrency(task.runnerEarning ?? 0)}</span>
        </div>
        <p className="text-white/60 text-sm">{task.description}</p>
        {task.user && (
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: NAVY_GRAD }}>
              {task.user.name?.[0] ?? "U"}
            </div>
            <span className="text-white/60 text-xs">{task.user.name ?? "Customer"}</span>
          </div>
        )}
      </div>

      <div className="mx-4 mt-4 h-36 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
        <div className="text-center text-white/30">
          <MapPin size={28} className="mx-auto mb-1" />
          <div className="text-sm">{task.locationArea ?? "Ahmedabad"}</div>
        </div>
      </div>

      <div className="mx-4 mt-4 space-y-3">
        {(task.status === "assigned" || task.status === "on_the_way") && (
          <button
            onClick={() => handleStatus("at_location")}
            disabled={updateStatus.isPending}
            className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2"
            style={{ background: NAVY_GRAD }}
          >
            <MapPin size={18} /> I've Reached the Location
          </button>
        )}

        {task.status === "at_location" && (
          <button
            onClick={() => handleStatus("in_progress")}
            disabled={updateStatus.isPending}
            className="w-full py-4 rounded-2xl text-[#0A1628] font-bold text-base"
            style={{ background: GOLD_GRAD }}
          >
            Start Task Now
          </button>
        )}

        {task.status === "in_progress" && (
          <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Camera size={16} /> Upload Proof Photo
            </h3>
            <label className="block cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => { setUploadedPhoto(ev.target?.result as string); toast.success("Photo uploaded!"); };
                  reader.readAsDataURL(file);
                }}
              />
              <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${uploadedPhoto ? "border-green-500 bg-green-500/10" : "border-white/20 hover:border-white/40"}`}>
                {uploadedPhoto ? (
                  <div>
                    <img src={uploadedPhoto} alt="proof" className="w-24 h-24 object-cover rounded-xl mx-auto mb-2" />
                    <p className="text-green-400 text-sm font-semibold">✓ Photo uploaded</p>
                  </div>
                ) : (
                  <div>
                    <Camera size={28} className="text-white/30 mx-auto mb-2" />
                    <p className="text-white/50 text-sm">Tap to upload proof photo</p>
                  </div>
                )}
              </div>
            </label>
          </div>
        )}

        {task.status === "in_progress" && uploadedPhoto && (
          <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <KeyRound size={16} /> Enter OTP from Customer
            </h3>
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
