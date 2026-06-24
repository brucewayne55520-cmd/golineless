import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle2, Star, ClipboardList, TrendingUp, Clock, XCircle, Wallet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useGetRunnerEarnings, useGetRunnerDailyEarnings, useListTasks } from "@workspace/api-client-react";
import type { Task } from "@workspace/api-client-react";
import { RunnerBottomNav } from "@/components/BottomNav";
import { CATEGORY_NAMES, formatCurrency } from "@/lib/utils";
import { GOLD, GOLD_GRAD, NAVY_GRAD } from "@/lib/theme";
import { EmptyState } from "@/components/EmptyState";

const BG = "#080E1E";

export default function RunnerEarnings() {
  const { data: earnings } = useGetRunnerEarnings();
  const { data: daily } = useGetRunnerDailyEarnings();
  const { data: tasks } = useListTasks({ role: "runner", status: "completed" } );
  const [payouts, setPayouts] = useState<{ payouts: { id: number; amount: number; taskCount: number; status: string; reference: string | null; notes: string | null; settledAt: string | null; createdAt: string }[]; totalPaidOut: number; settledCount: number; cancelledCount: number } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("golineless_runner_token") || "";
    fetch("/api/runners/me/payouts", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(setPayouts)
      .catch(() => {});
  }, []);

  const [requestingPayout, setRequestingPayout] = useState(false);

  const handleRequestPayout = async () => {
    const token = localStorage.getItem("golineless_runner_token") || "";
    setRequestingPayout(true);
    try {
      const res = await fetch("/api/runners/me/payout-request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to request payout"); return; }
      toast.success(data.message);
      // Refetch payouts
      fetch("/api/runners/me/payouts", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(setPayouts)
        .catch(() => {});
    } catch { toast.error("Network error"); }
    setRequestingPayout(false);
  };

  const e = earnings!;
  const dailyData = (daily ?? [])!;
  const completedTasks = (tasks ?? [])!;

  return (
    <div className="min-h-screen pb-24" style={{ background: BG }}>
      <div className="px-4 pt-5 pb-4 border-b border-white/10">
        <h1 className="text-xl font-black text-white">Earnings</h1>
        <p className="text-white/40 text-xs mt-0.5">Your runner dashboard</p>
      </div>

      <div className="mx-4 mt-4 rounded-2xl p-6 text-[#0A1628] relative overflow-hidden" style={{ background: GOLD_GRAD }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20" style={{ background: "radial-gradient(circle, white, transparent)", transform: "translate(20%, -20%)" }} />
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={14} />
          <p className="text-[#0A1628]/70 text-xs font-semibold">This Week</p>
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-4xl font-black mb-4">
          {e ? formatCurrency(e.thisWeek ?? 0) : "Rs 0"}
        </motion.div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Today", val: e?.today ?? 0 },
            { label: "Month", val: e?.thisMonth ?? 0 },
            { label: "Lifetime", val: e?.lifetime ?? 0 },
          ].map((s) => (
            <div key={s.label} className="text-center bg-white/20 rounded-xl p-2">
              <div className="text-[#0A1628] font-bold text-sm">{formatCurrency(s.val)}</div>
              <div className="text-[#0A1628]/60 text-xs">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-4 mt-3">
        <button
          onClick={handleRequestPayout}
          disabled={requestingPayout || !e?.today}
          className="w-full py-3.5 rounded-xl text-white font-bold disabled:opacity-50"
          style={{ background: NAVY_GRAD }}
        >
          {requestingPayout ? "Requesting..." : "Request Payout"}
        </button>
        {payouts && (
          <p className="text-white/40 text-[10px] text-center mt-2">
            Pending: {formatCurrency(payouts.totalPaidOut)} paid out · {payouts.settledCount} settled
          </p>
        )}
      </div>

      {/* Payout History */}
      {payouts && payouts.payouts.length > 0 && (
        <div className="mx-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold">Payout History</h3>
            <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-1">
              <Wallet size={11} className="text-green-400" />
              <span className="text-green-400 text-[10px] font-bold">Paid: {formatCurrency(payouts.totalPaidOut)}</span>
            </div>
          </div>
          <div className="space-y-2">
            {payouts.payouts.map(p => (
              <div key={p.id} className="bg-white/8 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {p.status === "settled" ? (
                    <CheckCircle2 size={14} className="text-green-400" />
                  ) : p.status === "cancelled" ? (
                    <XCircle size={14} className="text-red-400" />
                  ) : (
                    <Clock size={14} className="text-amber-400" />
                  )}
                  <div>
                    <p className="text-white font-medium text-sm">
                      {p.status === "settled" ? "Payout Received" : p.status === "cancelled" ? "Payout Cancelled" : "Payout Pending"}
                    </p>
                    <p className="text-white/40 text-[10px]">
                      {p.taskCount} task{p.taskCount !== 1 ? "s" : ""} · {p.settledAt ? new Date(p.settledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Pending"}
                      {p.reference && <span className="text-white/30"> · Ref: {p.reference}</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-bold text-sm ${p.status === "settled" ? "text-green-400" : p.status === "cancelled" ? "text-red-400" : "text-amber-400"}`}>
                    {formatCurrency(p.amount)}
                  </span>
                  <p className="text-white/30 text-[9px]">
                    {p.status === "settled" ? "✓ Received" : p.status === "cancelled" ? "✗ Reversed" : "⏳"}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {payouts.payouts.length > 5 && (
            <p className="text-white/30 text-[10px] text-center mt-2">Showing recent {Math.min(payouts.payouts.length, 10)} settlements</p>
          )}
        </div>
      )}

      {dailyData.length > 0 && (
        <div className="mx-4 mt-4 bg-white/8 border border-white/10 rounded-2xl p-4">
          <h3 className="text-white font-bold mb-4">Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={dailyData}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} />
              <Tooltip
                contentStyle={{ background: "#0F2557", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "white", fontSize: 12 }}
                formatter={(v: number) => [`Rs ${v}`, "Earned"]}
              />
              <Bar dataKey="amount" fill={GOLD} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {e && (
        <div className="mx-4 mt-4 grid grid-cols-3 gap-3">
          {[
            { Icon: CheckCircle2, label: "Task Earnings", val: e.lifetime ? Math.round(Number(e.lifetime) * 0.9) : 0, color: "#22C55E" },
            { Icon: Star, label: "Waiting Earnings", val: e.lifetime ? Math.round(Number(e.lifetime) * 0.1) : 0, color: GOLD },
            { Icon: TrendingUp, label: "Bonus", val: 0, color: "#60A5FA" },
          ].map((s, i) => (
            <div key={s.label} className="bg-white/8 border border-white/10 rounded-2xl p-3 text-center">
              <s.Icon size={18} className="mx-auto mb-1" style={{ color: s.color }} />
              <div className="text-white font-black text-base">{formatCurrency(s.val)}</div>
              <div className="text-white/40 text-[10px]">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {e && (
        <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
          {[
            { Icon: CheckCircle2, label: "Tasks Done", val: e.totalTasks ?? 0, color: "#22C55E" },
            { Icon: Star, label: "Avg Rating", val: e.avgRating ? Number(e.avgRating).toFixed(1) : "N/A", color: GOLD },
          ].map((s) => (
            <div key={s.label} className="bg-white/8 border border-white/10 rounded-2xl p-4 text-center">
              <s.Icon size={22} className="mx-auto mb-1" style={{ color: s.color }} />
              <div className="text-white font-black text-xl">{s.val}</div>
              <div className="text-white/40 text-xs">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mx-4 mt-4">
        <h3 className="text-white font-bold mb-3">Task History</h3>
        {completedTasks.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No completed tasks yet"
            variant="dark"
            className="py-8"
          />
        ) : (
          <div className="space-y-2">
            {completedTasks.slice(0, 10).map((task: Task) => (
              <div key={task.id} className="bg-white/8 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium text-sm">{CATEGORY_NAMES[task.category] ?? task.category}</p>
                  <p className="text-white/40 text-xs">{task.completedAt ? new Date(task.completedAt).toLocaleDateString("en-IN") : ""}</p>
                </div>
                <span className="font-bold" style={{ color: GOLD }}>{formatCurrency(task.runnerEarning ?? 0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <RunnerBottomNav />
    </div>
  );
}
