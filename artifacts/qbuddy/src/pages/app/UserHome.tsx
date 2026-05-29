import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useListTasks, useListNotifications } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserBottomNav } from "@/components/BottomNav";
import { CATEGORY_ICONS, CATEGORY_NAMES, CATEGORY_HINDI, CATEGORY_PRICES, STATUS_COLORS, STATUS_LABELS, formatCurrency } from "@/lib/utils";

const categories = Object.keys(CATEGORY_ICONS);

export default function UserHome() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { data: tasks, isLoading } = useListTasks({ params: { limit: "3" } });
  const { data: notifs } = useListNotifications();
  const unreadCount = notifs?.filter((n: any) => !n.isRead).length ?? 0;

  return (
    <div className="min-h-screen bg-[#F8F7FF] pb-20">
      {/* Top bar */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#6C3FD4] rounded-full flex items-center justify-center">
            <span className="text-white font-black text-sm">Q</span>
          </div>
          <span className="font-black text-[#1A1A2E] text-lg">QBuddy</span>
        </div>
        <div className="flex items-center gap-1 text-gray-400">
          <span className="text-sm">📍</span>
          <span className="text-xs font-medium text-gray-600">Ahmedabad, Gujarat</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => {}} className="relative">
            <span className="text-xl">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">{unreadCount}</span>
            )}
          </button>
          <div className="w-8 h-8 bg-[#6C3FD4] rounded-full flex items-center justify-center text-white text-xs font-bold">
            {user?.name?.[0] ?? "U"}
          </div>
        </div>
      </div>

      {/* Greeting card */}
      <div className="px-4 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 text-white"
          style={{ background: "linear-gradient(135deg, #6C3FD4, #9B6FF7)" }}
        >
          <p className="text-white/70 text-sm mb-0.5">Namaste, {user?.name?.split(" ")[0] ?? "Friend"} 👋</p>
          <h2 className="text-xl font-bold mb-3">Kya kaam karwana hai aaj?</h2>
          <button
            onClick={() => navigate("/app/book")}
            className="px-5 py-2 rounded-xl text-[#6C3FD4] font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #FF6B35, #FF8C42)", color: "white" }}
          >
            Book a Runner
          </button>
        </motion.div>
      </div>

      {/* Stats strip */}
      <div className="px-4 mt-4">
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {["🏃 23 runners active", "⚡ Avg 8 min response", "⭐ 4.8 rated service"].map((stat) => (
            <div key={stat} className="flex-shrink-0 bg-white rounded-xl px-3 py-2 text-xs font-medium text-gray-600 border border-gray-100 shadow-sm">
              {stat}
            </div>
          ))}
        </div>
      </div>

      {/* Service grid */}
      <div className="px-4 mt-5">
        <h3 className="font-bold text-[#1A1A2E] mb-3">What do you need?</h3>
        <div className="grid grid-cols-4 gap-2">
          {categories.map((cat, i) => (
            <motion.button
              key={cat}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/app/book?category=${cat}`)}
              className="bg-white rounded-2xl p-3 flex flex-col items-center gap-1 shadow-sm border border-gray-50 hover:shadow-md hover:border-purple-100 transition-all active:scale-95"
            >
              <span className="text-2xl">{CATEGORY_ICONS[cat]}</span>
              <span className="text-[9px] font-semibold text-[#1A1A2E] text-center leading-tight">{CATEGORY_NAMES[cat]}</span>
              <span className="text-[8px] text-gray-400">{CATEGORY_HINDI[cat]}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="px-4 mt-6">
        <h3 className="font-bold text-[#1A1A2E] mb-3">How it works</h3>
        <div className="flex gap-3">
          {[
            { icon: "📱", text: "Book in 60s" },
            { icon: "🏃", text: "Runner assigned" },
            { icon: "✅", text: "Task done!" },
          ].map((s, i) => (
            <div key={s.text} className="flex-1 bg-white rounded-xl p-3 text-center shadow-sm border border-gray-50">
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-[10px] font-semibold text-gray-600">{s.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent tasks */}
      {isLoading ? (
        <div className="px-4 mt-6 space-y-2">
          {[1, 2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : tasks && tasks.length > 0 ? (
        <div className="px-4 mt-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-[#1A1A2E]">Recent Tasks</h3>
            <button onClick={() => navigate("/app/tasks")} className="text-xs text-[#6C3FD4] font-semibold">See all</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {(tasks as any[]).slice(0, 3).map((task: any) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => navigate(`/app/tasks/${task.id}`)}
                className="flex-shrink-0 w-52 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{CATEGORY_ICONS[task.category] ?? "📦"}</span>
                  <div>
                    <div className="text-sm font-semibold text-[#1A1A2E]">{CATEGORY_NAMES[task.category]}</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[task.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {STATUS_LABELS[task.status] ?? task.status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>
                <p className="text-xs font-bold text-[#6C3FD4] mt-1">{formatCurrency(task.price)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Senior Care CTA */}
      <div className="px-4 mt-6 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 text-white"
          style={{ background: "linear-gradient(135deg, #FF6B35, #FF8C42)" }}
        >
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">Senior Care Plans</h3>
              <p className="text-white/80 text-xs mt-1">Peace of mind for your parents</p>
            </div>
            <span className="text-4xl">👴</span>
          </div>
          <button
            onClick={() => navigate("/app/senior")}
            className="mt-3 px-4 py-2 bg-white rounded-xl text-[#FF6B35] font-bold text-sm"
          >
            View Plans
          </button>
        </motion.div>
      </div>

      <UserBottomNav />
    </div>
  );
}
