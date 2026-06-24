import { motion } from "framer-motion";
import AdminSidebar from "@/components/AdminSidebar";
import { useListQualityReviews, useGetQualityStats } from "@workspace/api-client-react";
import { Star, TrendingUp, Clock, BarChart3 } from "lucide-react";
import { NAVY } from "@/lib/theme";

export default function AdminQuality() {
  const { data: reviews, isLoading: loadingReviews } = useListQualityReviews();
  const { data: stats } = useGetQualityStats();

  const loading = loadingReviews;

  return (
    <div className="flex min-h-screen" style={{ background: "#F0F2F8" }}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <h1 className="text-xl font-black text-[#0A1628] mb-5">Task Quality System</h1>

        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-5">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <TrendingUp size={18} className="mx-auto mb-1" style={{ color: NAVY }} />
              <p className="text-2xl font-black" style={{ color: NAVY }}>{stats.avgScore}</p>
              <p className="text-[10px] text-gray-400">Avg Quality Score</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <Star size={18} className="mx-auto mb-1 text-amber-500" />
              <p className="text-2xl font-black text-amber-500">{stats.avgRating}</p>
              <p className="text-[10px] text-gray-400">Avg Rating</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <BarChart3 size={18} className="mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-black text-blue-600">{stats.total}</p>
              <p className="text-[10px] text-gray-400">Total Reviews</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <Clock size={18} className="mx-auto mb-1 text-purple-500" />
              <div className="flex justify-center gap-1 text-xs mt-1">
                <span className="text-emerald-600 font-bold">E:{stats.gradeDist?.excellent || 0}</span>
                <span className="text-blue-600 font-bold">G:{stats.gradeDist?.good || 0}</span>
                <span className="text-amber-600 font-bold">A:{stats.gradeDist?.average || 0}</span>
                <span className="text-red-600 font-bold">P:{stats.gradeDist?.poor || 0}</span>
              </div>
              <p className="text-[10px] text-gray-400">SLA Grades</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-[#0A1628]">Quality Reviews</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : !reviews || reviews.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p className="font-medium">No quality reviews yet</p>
              <p className="text-xs mt-1">Reviews appear after completed tasks</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {(Array.isArray(reviews) ? reviews : []).map((r: import("@workspace/api-client-react").QualityReview) => (
                <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">Task #{r.taskId}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.slaGrade === "excellent" ? "bg-green-100 text-green-700" : r.slaGrade === "good" ? "bg-blue-100 text-blue-700" : r.slaGrade === "average" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{r.slaGrade}</span>
                      <span className="text-xs font-bold" style={{ color: (r.taskQualityScore ?? 0) >= 80 ? "#059669" : (r.taskQualityScore ?? 0) >= 50 ? "#D97706" : "#DC2626" }}>{r.taskQualityScore}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1">
                      {r.customerRating && <span>Rating: {"★".repeat(r.customerRating)}{"☆".repeat(5 - r.customerRating)}</span>}
                      {r.customerFeedback && <span className="truncate max-w-xs">"{r.customerFeedback}"</span>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
