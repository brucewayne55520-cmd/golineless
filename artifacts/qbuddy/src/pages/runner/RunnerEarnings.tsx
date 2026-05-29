import { motion } from "framer-motion";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useGetRunnerEarnings, useGetRunnerDailyEarnings, useListTasks } from "@workspace/api-client-react";
import { RunnerBottomNav } from "@/components/BottomNav";
import { CATEGORY_NAMES, formatCurrency } from "@/lib/utils";

export default function RunnerEarnings() {
  const { data: earnings } = useGetRunnerEarnings();
  const { data: daily } = useGetRunnerDailyEarnings();
  const { data: tasks } = useListTasks({ params: { role: "runner", status: "completed" } as any });

  const e = earnings as any;
  const dailyData = (daily as any[]) ?? [];
  const completedTasks = (tasks as any[]) ?? [];

  return (
    <div className="min-h-screen pb-24" style={{ background: "#0F0F1A" }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-white/10">
        <h1 className="text-xl font-black text-white">Earnings</h1>
      </div>

      {/* Weekly card */}
      <div className="mx-4 mt-4 rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, #6C3FD4, #9B6FF7)" }}>
        <p className="text-white/70 text-xs mb-1">This Week</p>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-4xl font-black mb-4"
        >
          {e ? formatCurrency(e.thisWeek ?? 0) : "Rs 0"}
        </motion.div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Today", val: e?.today ?? 0 },
            { label: "Month", val: e?.thisMonth ?? 0 },
            { label: "Lifetime", val: e?.lifetime ?? 0 },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-white font-bold">{formatCurrency(s.val)}</div>
              <div className="text-white/50 text-xs">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Withdraw button */}
      <div className="mx-4 mt-3">
        <button
          onClick={() => toast.info("Coming soon! Payouts every Monday.")}
          className="w-full py-3.5 rounded-xl text-white font-bold"
          style={{ background: "linear-gradient(135deg, #FF6B35, #FF8C42)" }}
        >
          Withdraw Earnings
        </button>
      </div>

      {/* 7-day chart */}
      {dailyData.length > 0 && (
        <div className="mx-4 mt-4 bg-white/8 border border-white/10 rounded-2xl p-4">
          <h3 className="text-white font-bold mb-4">Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={dailyData}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} tickFormatter={(v) => `${v}`} />
              <Tooltip
                contentStyle={{ background: "#1A1A2E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "white", fontSize: 12 }}
                formatter={(v: any) => [`Rs ${v}`, "Earned"]}
              />
              <Bar dataKey="amount" fill="#FF6B35" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Lifetime stats */}
      {e && (
        <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
          {[
            { icon: "✅", label: "Tasks Done", val: e.totalTasks ?? 0 },
            { icon: "⭐", label: "Avg Rating", val: e.avgRating ? Number(e.avgRating).toFixed(1) : "N/A" },
          ].map((s) => (
            <div key={s.label} className="bg-white/8 border border-white/10 rounded-2xl p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-white font-black text-xl">{s.val}</div>
              <div className="text-white/40 text-xs">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Task history */}
      <div className="mx-4 mt-4">
        <h3 className="text-white font-bold mb-3">Task History</h3>
        {completedTasks.length === 0 ? (
          <div className="text-center py-8 text-white/40">
            <div className="text-4xl mb-2">📋</div>
            <p>No completed tasks yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {completedTasks.slice(0, 10).map((task: any) => (
              <div key={task.id} className="bg-white/8 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium text-sm">{CATEGORY_NAMES[task.category] ?? task.category}</p>
                  <p className="text-white/40 text-xs">{task.completedAt ? new Date(task.completedAt).toLocaleDateString("en-IN") : ""}</p>
                </div>
                <span className="text-[#FF6B35] font-bold">{formatCurrency(task.runnerEarning ?? 0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <RunnerBottomNav />
    </div>
  );
}
