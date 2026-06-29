import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, MessageSquare, ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import { RunnerBottomNav } from "@/components/BottomNav";
import { customFetch } from "@workspace/api-client-react";
import { BLUE, BLUE_GRAD, DARK } from "@/lib/theme";
import { EmptyState } from "@/components/EmptyState";

const BG = "#080E1E";

interface Review {
  id: number;
  taskId: number;
  userId: number;
  rating: number;
  review: string | null;
  createdAt: string;
  userName: string;
}

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          fill={s <= rating ? BLUE : "transparent"}
          style={{ color: s <= rating ? BLUE : "rgba(255,255,255,0.15)" }}
        />
      ))}
    </div>
  );
}

export default function RunnerReviewsPage() {
  const [, navigate] = useLocation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);

  useEffect(() => {
    customFetch<Review[]>("/api/runners/me/reviews?limit=50")
      .then(setReviews)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filterRating !== null
    ? reviews.filter((r) => r.rating === filterRating)
    : reviews;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const ratingDistribution = [5, 4, 3, 2, 1].map((r) => ({
    rating: r,
    count: reviews.filter((rev) => rev.rating === r).length,
    pct: reviews.length > 0 ? Math.round((reviews.filter((rev) => rev.rating === r).length / reviews.length) * 100) : 0,
  }));

  return (
    <div className="min-h-screen pb-24" style={{ background: BG }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/runner/profile")} className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
            <ChevronLeft size={18} className="text-white/60" />
          </button>
          <div>
            <h1 className="text-xl font-black text-white">Reviews</h1>
            <p className="text-white/40 text-xs">What clients say about you</p>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      {reviews.length > 0 && (
        <div className="mx-4 mt-4 rounded-2xl p-5 relative overflow-hidden" style={{ background: BLUE_GRAD }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20" style={{ background: "radial-gradient(circle, white, transparent)", transform: "translate(20%, -20%)" }} />
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-4xl font-black text-gray-900">{avgRating}</div>
              <StarRating rating={Math.round(Number(avgRating))} size={14} />
              <p className="text-gray-900/60 text-[10px] mt-0.5">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex-1 space-y-1">
              {ratingDistribution.map((d) => (
                <div key={d.rating} className="flex items-center gap-2">
                  <span className="text-gray-900/60 text-[10px] w-3 text-right">{d.rating}</span>
                  <Star size={10} fill={BLUE} style={{ color: BLUE }} />
                  <div className="flex-1 h-1.5 bg-gray-900/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gray-900/40 transition-all" style={{ width: `${d.pct}%` }} />
                  </div>
                  <span className="text-gray-900/50 text-[9px] w-6 text-right">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter chips */}
      {reviews.length > 0 && (
        <div className="mx-4 mt-3 flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterRating(null)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all whitespace-nowrap ${
              filterRating === null
                ? "text-gray-900 border-transparent"
                : "text-white/60 border-white/10 bg-white/5"
            }`}
            style={filterRating === null ? { background: BLUE_GRAD } : {}}
          >
            All ({reviews.length})
          </button>
          {[5, 4, 3, 2, 1].map((r) => {
            const count = reviews.filter((rev) => rev.rating === r).length;
            if (count === 0) return null;
            return (
              <button
                key={r}
                onClick={() => setFilterRating(filterRating === r ? null : r)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all whitespace-nowrap flex items-center gap-1 ${
                  filterRating === r
                    ? "text-gray-900 border-transparent"
                    : "text-white/60 border-white/10 bg-white/5"
                }`}
                style={filterRating === r ? { background: BLUE_GRAD } : {}}
              >
                {r}★ ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Reviews List */}
      <div className="mx-4 mt-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/5 rounded-2xl p-4 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-white/10" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-24 bg-white/10 rounded" />
                    <div className="h-2 w-16 bg-white/10 rounded" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 w-full bg-white/10 rounded" />
                  <div className="h-2 w-3/4 bg-white/10 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title={filterRating !== null ? `No ${filterRating}-star reviews` : "No reviews yet"}
            variant="dark"
            className="py-12"
          />
        ) : (
          filtered.map((review, idx) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white/8 border border-white/10 rounded-2xl p-4"
            >
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: BLUE_GRAD, color: DARK }}>
                  {review.userName?.[0] ?? "C"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{review.userName}</p>
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} size={11} />
                    <span className="text-white/30 text-[10px]">#{review.taskId}</span>
                  </div>
                </div>
                <span className="text-white/30 text-[10px] flex-shrink-0">
                  {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </div>
              {review.review && (
                <p className="text-white/70 text-sm leading-relaxed">{review.review}</p>
              )}
            </motion.div>
          ))
        )}
      </div>

      <RunnerBottomNav />
    </div>
  );
}
