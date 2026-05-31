import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { MapPin, Bell, PersonStanding, Zap, Shield, Smartphone, CheckCircle2, HeartHandshake, Camera, KeyRound, Star } from "lucide-react";
import { useListTasks, useListNotifications } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserBottomNav } from "@/components/BottomNav";
import { CategoryIcon, CATEGORY_KEYS } from "@/components/CategoryIcon";
import { CATEGORY_NAMES, CATEGORY_HINDI, CATEGORY_PRICES, STATUS_COLORS, STATUS_LABELS, formatCurrency } from "@/lib/utils";

const NAVY = "#0F2557";
const NAVY_GRAD = "linear-gradient(135deg, #0F2557, #1D3D7C)";
const GOLD = "#C9A84C";
const GOLD_GRAD = "linear-gradient(135deg, #C9A84C, #D4B870)";

const LIFE_SITUATIONS: Record<string, string> = {
  hospital: "Hospital Help",
  bank: "Banking Help",
  government: "Govt. Help",
  medicine: "Medicine",
  senior: "Senior Care",
  errands: "Errands",
  documentation: "Documents",
  emergency: "Emergency",
};

function getGreeting(name?: string) {
  const hour = new Date().getHours();
  const prefix = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return name ? `${prefix}, ${name.split(" ")[0]}` : prefix;
}

export default function UserHome() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { data: tasks, isLoading } = useListTasks({ params: { limit: "3" } });
  const { data: notifs } = useListNotifications();
  const unreadCount = notifs?.filter((n: any) => !n.isRead).length ?? 0;

  const trustStrip = [
    { Icon: Shield, text: "KYC Verified" },
    { Icon: Camera, text: "Photo Proof" },
    { Icon: KeyRound, text: "OTP Secured" },
    { Icon: MapPin, text: "GPS Tracked" },
  ];

  const howItWorks = [
    { Icon: Smartphone, label: "Book in 60s", sub: "Select & describe" },
    { Icon: PersonStanding, label: "Runner assigned", sub: "KYC verified local" },
    { Icon: CheckCircle2, label: "Task done", sub: "With proof & OTP" },
  ];

  return (
    <div className="min-h-screen pb-20" style={{ background: "#F8F9FC" }}>
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <img src="/logo.jpg" alt="Go LineLess" className="h-8 w-auto" />
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1">
          <MapPin size={11} style={{ color: NAVY }} />
          <span className="text-xs font-semibold text-gray-600">Ahmedabad, GJ</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => {}} className="relative">
            <Bell size={20} className="text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">{unreadCount}</span>
            )}
          </button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shadow-sm" style={{ background: NAVY_GRAD }}>
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
        </div>
      </div>

      {/* Hero card */}
      <div className="px-4 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl p-5 text-white shadow-lg relative overflow-hidden"
          style={{ background: NAVY_GRAD }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10" style={{ background: `radial-gradient(circle, ${GOLD}, transparent)`, transform: "translate(30%,-30%)" }} />
          <p className="text-white/60 text-sm font-medium mb-1">{getGreeting(user?.name)}</p>
          <h2 className="text-2xl font-black mb-1 leading-tight">Life without<br/>waiting.</h2>
          <p className="text-white/60 text-xs mb-4">What do you need help with today?</p>
          <button
            onClick={() => navigate("/app/book")}
            className="px-5 py-2.5 rounded-xl font-bold text-sm shadow-md"
            style={{ background: GOLD_GRAD, color: "#0A1628" }}
          >
            Request Assistance
          </button>
        </motion.div>
      </div>

      {/* Trust micro-strip */}
      <div className="px-4 mt-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {trustStrip.map((s) => (
            <div key={s.text} className="flex-shrink-0 bg-white rounded-full px-3 py-1.5 flex items-center gap-1.5 border border-gray-100 shadow-sm">
              <s.Icon size={11} style={{ color: GOLD }} />
              <span className="text-[11px] font-semibold text-gray-600">{s.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category grid */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-[#0A1628] text-base">How can we help?</h3>
          <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Ahmedabad Pilot</span>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {CATEGORY_KEYS.map((cat, i) => (
            <motion.button
              key={cat}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 200 }}
              onClick={() => navigate(`/app/book?category=${cat}`)}
              className="bg-white rounded-2xl p-3 flex flex-col items-center gap-1.5 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all active:scale-95"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #EEF2FA, #D9E3F5)", color: NAVY }}>
                <CategoryIcon category={cat} size={20} />
              </div>
              <span className="text-[9px] font-bold text-[#0A1628] text-center leading-tight">{LIFE_SITUATIONS[cat] ?? CATEGORY_NAMES[cat]}</span>
              <span className="text-[8px] text-gray-400">from {formatCurrency(CATEGORY_PRICES[cat] ?? 149)}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="px-4 mt-6">
        <h3 className="font-black text-[#0A1628] text-base mb-3">How it works</h3>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-start gap-0">
            {howItWorks.map((s, i) => (
              <div key={s.label} className="flex-1 flex flex-col items-center text-center relative">
                {i < howItWorks.length - 1 && (
                  <div className="absolute top-4 left-[calc(50%+20px)] right-[-calc(50%-20px)] h-px bg-gray-200" />
                )}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2 z-10" style={{ background: "linear-gradient(135deg, #EEF2FA, #D9E3F5)", color: NAVY }}>
                  <s.Icon size={17} />
                </div>
                <div className="text-[10px] font-bold text-[#0A1628]">{s.label}</div>
                <div className="text-[9px] text-gray-400 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent tasks */}
      {isLoading ? (
        <div className="px-4 mt-6 space-y-2">
          {[1, 2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : tasks && (tasks as any[]).length > 0 ? (
        <div className="px-4 mt-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-black text-[#0A1628] text-base">Recent Requests</h3>
            <button onClick={() => navigate("/app/tasks")} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ color: NAVY, background: "#EEF2FA" }}>See all</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {(tasks as any[]).slice(0, 3).map((task: any) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => navigate(`/app/tasks/${task.id}`)}
                className="flex-shrink-0 w-52 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#EEF2FA", color: NAVY }}>
                    <CategoryIcon category={task.category} size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#0A1628] leading-tight">{CATEGORY_NAMES[task.category]}</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[task.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {STATUS_LABELS[task.status] ?? task.status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{task.description}</p>
                <p className="text-xs font-black mt-2" style={{ color: GOLD }}>{formatCurrency(task.price)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Senior care promo */}
      <div className="px-4 mt-6 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl p-5 shadow-lg relative overflow-hidden"
          style={{ background: GOLD_GRAD }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20" style={{ background: "radial-gradient(circle, white, transparent)", transform: "translate(20%,-20%)" }} />
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Star size={12} fill="#0A1628" className="text-[#0A1628]" />
                <span className="text-[10px] font-bold text-[#0A1628]/70 uppercase tracking-wider">For NRI Families</span>
              </div>
              <h3 className="font-black text-lg text-[#0A1628] leading-tight">Senior Care Plans</h3>
              <p className="text-[#0A1628]/70 text-xs mt-1">Peace of mind for your parents<br/>back home.</p>
            </div>
            <HeartHandshake size={40} className="text-[#0A1628]/40 flex-shrink-0" />
          </div>
          <button
            onClick={() => navigate("/app/senior")}
            className="mt-4 px-4 py-2.5 bg-white rounded-xl font-bold text-sm shadow-sm hover:shadow-md transition-all"
            style={{ color: NAVY }}
          >
            View Plans →
          </button>
        </motion.div>
      </div>

      {/* Pilot badge */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-center gap-2 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-semibold text-gray-600">Pilot launch active · Ahmedabad, Gujarat</span>
        </div>
      </div>

      <UserBottomNav />
    </div>
  );
}
