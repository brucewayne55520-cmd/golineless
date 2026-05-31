import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle2, Star, ClipboardList, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useGetRunnerEarnings, useGetRunnerDailyEarnings, useListTasks } from "@workspace/api-client-react";
import { RunnerBottomNav } from "@/components/BottomNav";
import { CATEGORY_NAMES, formatCurrency } from "@/lib/utils";

const GOLD = "#C9A84C";
const GOLD_GRAD = "linear-gradient(135deg, #C9A84C, #D4B870)";
const NAVY_GRAD = "linear-gradient(135deg, #0F2557, #1D3D7C)";
const BG = "#080E1E";

export default function RunnerEarnings() {
  const { data: earnings } = useGetRunnerEarnings();
  const { data: daily } = useGetRunnerDailyEarnings();
  const { data: tasks } = useListTasks({ params: { role: "runner", status: "completed" } as any });

  const e = earnings as any;
  const dailyData = (daily as any[]) ?? [];
  const completedTasks = (tasks as any[]) ?? [];

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
          onClick={() => toast.info("Coming soon! Payouts every Monday.")}
          className="w-full py-3.5 rounded-xl text-white font-bold"
          style={{ background: NAVY_GRAD }}
        >
          Withdraw Earnings
        </button>
      </div>

      {dailyData.length > 0 && (
        <div className="mx-4 mt-4 bg-white/8 border border-white/10 rounded-2xl p-4">
          <h3 className="text-white font-bold mb-4">Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={dailyData}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} />
              <Tooltip
                contentStyle={{ background: "#0F2557", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "white", fontSize: 12 }}
                formatter={(v: any) => [`Rs ${v}`, "Earned"]}
              />
              <Bar dataKey="amount" fill={GOLD} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {e && (
        <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
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
          <div className="text-center py-8 text-white/40">
            <ClipboardList size={36} className="mx-auto mb-2 opacity-40" />
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
