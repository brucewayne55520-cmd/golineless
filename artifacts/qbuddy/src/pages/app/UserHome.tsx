import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { MapPin, Bell, PersonStanding, Zap, Star, Smartphone, CheckCircle2, HeartHandshake } from "lucide-react";
import { useListTasks, useListNotifications } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserBottomNav } from "@/components/BottomNav";
import { CategoryIcon, CATEGORY_KEYS } from "@/components/CategoryIcon";
import { CATEGORY_NAMES, CATEGORY_HINDI, CATEGORY_PRICES, STATUS_COLORS, STATUS_LABELS, formatCurrency } from "@/lib/utils";

const NAVY = "#0F2557";
const NAVY_GRAD = "linear-gradient(135deg, #0F2557, #1D3D7C)";
const GOLD = "#C9A84C";
const GOLD_GRAD = "linear-gradient(135deg, #C9A84C, #D4B870)";

export default function UserHome() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { data: tasks, isLoading } = useListTasks({ params: { limit: "3" } });
  const { data: notifs } = useListNotifications();
  const unreadCount = notifs?.filter((n: any) => !n.isRead).length ?? 0;

  const howItWorks = [
    { Icon: Smartphone, text: "Book in 60s" },
    { Icon: PersonStanding, text: "Runner assigned" },
    { Icon: CheckCircle2, text: "Task done!" },
  ];

  const statStrip = [
    { Icon: PersonStanding, text: "Runners active now" },
    { Icon: Zap, text: "Avg 8 min response" },
    { Icon: Star, text: "4.8 rated service" },
  ];

  return (
    <div className="min-h-screen pb-20" style={{ background: "#F8F9FC" }}>
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <img src="/logo.jpg" alt="Go LineLess" className="h-8 w-auto" />
        <div className="flex items-center gap-1 text-gray-500">
          <MapPin size={13} />
          <span className="text-xs font-medium text-gray-600">Ahmedabad, Gujarat</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => {}} className="relative">
            <Bell size={20} className="text-gray-500" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">{unreadCount}</span>
            )}
          </button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: NAVY_GRAD }}>
            {user?.name?.[0] ?? "U"}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 text-white shadow-lg"
          style={{ background: NAVY_GRAD }}
        >
          <p className="text-white/70 text-sm mb-0.5">Namaste, {user?.name?.split(" ")[0] ?? "Friend"}</p>
          <h2 className="text-xl font-bold mb-1">Life without waiting.</h2>
          <p className="text-white/60 text-xs mb-3">What do you need help with today?</p>
          <button
            onClick={() => navigate("/app/book")}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-[#0F2557]"
            style={{ background: GOLD_GRAD }}
          >
            Book a Runner
          </button>
        </motion.div>
      </div>

      <div className="px-4 mt-4">
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {statStrip.map((s) => (
            <div key={s.text} className="flex-shrink-0 bg-white rounded-xl px-3 py-2 flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-100 shadow-sm">
              <s.Icon size={12} style={{ color: NAVY }} />
              {s.text}
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 mt-5">
        <h3 className="font-bold text-[#0A1628] mb-3">What do you need?</h3>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORY_KEYS.map((cat, i) => (
            <motion.button
              key={cat}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/app/book?category=${cat}`)}
              className="bg-white rounded-2xl p-3 flex flex-col items-center gap-1 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all active:scale-95"
            >
              <div style={{ color: NAVY }}>
                <CategoryIcon category={cat} size={22} />
              </div>
              <span className="text-[9px] font-semibold text-[#0A1628] text-center leading-tight">{CATEGORY_NAMES[cat]}</span>
              <span className="text-[8px] text-gray-400">{CATEGORY_HINDI[cat]}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-6">
        <h3 className="font-bold text-[#0A1628] mb-3">How it works</h3>
        <div className="flex gap-3">
          {howItWorks.map((s, i) => (
            <div key={s.text} className="flex-1 bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
              <s.Icon size={18} className="mx-auto mb-1" style={{ color: NAVY }} />
              <div className="text-[10px] font-semibold text-gray-600">{s.text}</div>
            </div>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="px-4 mt-6 space-y-2">
          {[1, 2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : tasks && tasks.length > 0 ? (
        <div className="px-4 mt-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-[#0A1628]">Recent Tasks</h3>
            <button onClick={() => navigate("/app/tasks")} className="text-xs font-semibold" style={{ color: NAVY }}>See all</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {(tasks as any[]).slice(0, 3).map((task: any) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => navigate(`/app/tasks/${task.id}`)}
                className="flex-shrink-0 w-52 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div style={{ color: NAVY }}>
                    <CategoryIcon category={task.category} size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#0A1628]">{CATEGORY_NAMES[task.category]}</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[task.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {STATUS_LABELS[task.status] ?? task.status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>
                <p className="text-xs font-bold mt-1" style={{ color: GOLD }}>Rs {formatCurrency(task.price)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="px-4 mt-6 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 text-white shadow-lg"
          style={{ background: GOLD_GRAD }}
        >
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg text-[#0A1628]">Senior Care Plans</h3>
              <p className="text-[#0A1628]/70 text-xs mt-1">Peace of mind for your parents</p>
            </div>
            <HeartHandshake size={36} className="text-[#0A1628]/60" />
          </div>
          <button
            onClick={() => navigate("/app/senior")}
            className="mt-3 px-4 py-2 bg-white rounded-xl font-bold text-sm"
            style={{ color: NAVY }}
          >
            View Plans
          </button>
        </motion.div>
      </div>

      <UserBottomNav />
    </div>
  );
}
