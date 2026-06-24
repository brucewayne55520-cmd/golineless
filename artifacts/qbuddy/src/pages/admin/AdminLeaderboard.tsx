import { useState } from "react";
import { motion } from "framer-motion";
import { useGetLeaderboard } from "@workspace/api-client-react";
import AdminSidebar from "@/components/AdminSidebar";
import { Medal } from "lucide-react";
import { NAVY, GOLD } from "@/lib/theme";

const BADGE_COLORS: Record<string, string> = {
  elite: "text-yellow-500", reliable: "text-green-500", improving: "text-blue-500", at_risk: "text-red-500",
};

export default function AdminLeaderboard() {
  const [period, setPeriod] = useState("lifetime");
  const { data, isLoading } = useGetLeaderboard({ period, limit: 50 }, { query: { queryKey: ["leaderboard", period] } });

  return (
    <div className="flex min-h-screen" style={{ background: "#F0F2F8" }}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-black text-[#0A1628]">Comrade Leaderboard</h1>
            <p className="text-gray-400 text-xs mt-0.5">{data?.total ?? 0} verified comrades</p>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-1">
            {["lifetime", "weekly", "monthly"].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${period === p ? "text-white" : "text-gray-400 hover:text-gray-700"}`}
                style={period === p ? { background: NAVY } : {}}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse shadow-sm border border-gray-100" />)}</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {(data?.comrades ?? []).map((c: Required<import("@workspace/api-client-react").LeaderboardComradesItem>, i: number) => {
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50"
                  >
                    {/* Rank */}
                    <div className="w-8 text-center">
                      {i < 3 ? (
                        <span className="text-lg">{medals[i]}</span>
                      ) : (
                        <span className="text-sm font-bold text-gray-300">#{i + 1}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ background: i < 3 ? `linear-gradient(135deg, ${GOLD}, #D4B870)` : `linear-gradient(135deg, ${NAVY}, #1D3D7C)` }}>
                      {c.name?.[0] ?? "C"}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#0A1628] text-sm truncate">{c.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                        <span className={`flex items-center gap-0.5 ${BADGE_COLORS[c.trustBadge] || "text-gray-400"}`}>
                          <Medal size={10} /> {c.trustBadge?.replace("_", " ")}
                        </span>
                        <span>•</span>
                        <span>{c.tasksCompleted} completed</span>
                        <span>•</span>
                        <span>{c.completionRate}% rate</span>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-xs font-bold" style={{ color: GOLD }}>{c.trustScore}</p>
                        <p className="text-[9px] text-gray-400">Trust</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-700">{c.avgRating}</p>
                        <p className="text-[9px] text-gray-400">Rating</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-700">{c.responseTime ? `${Math.round(c.responseTime)}s` : "—"}</p>
                        <p className="text-[9px] text-gray-400">Response</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
