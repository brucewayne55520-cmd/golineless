import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { MapPin, Bell, PersonStanding, Shield, Smartphone, CheckCircle2, HeartHandshake, Camera, KeyRound, Star, Wallet, CreditCard } from "lucide-react";
import { useListTasks, useListNotifications } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserBottomNav } from "@/components/BottomNav";
import { CategoryIcon } from "@/components/CategoryIcon";
import { StatusBadge } from "@/components/StatusBadge";
import { PaymentBadge } from "@/components/PaymentBadge";
import { PayButton } from "@/components/PayButton";
import { CATEGORY_NAMES, formatCurrency } from "@/lib/utils";
import { BLUE, BLUE_GRAD, DARK_GRAD } from "@/lib/theme";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

const SERVICE_HUBS: Record<string, { name: string; desc: string; icon: string; categories: string[]; color: string }> = {
  healthcare: { name: "Healthcare Assistance", desc: "Hospital visits, OPD, reports, pharmacy, medicine", icon: "🏥", categories: ["hospital","medicine"], color: "#0EA5E9" },
  documentation: { name: "Documentation Help", desc: "Form filling, attestation, document pickup/submission", icon: "📄", categories: ["document","govt_office"], color: "#8B5CF6" },
  banking: { name: "Banking Assistance", desc: "Account work, cheque deposits, bank visits", icon: "🏦", categories: ["bank"], color: "#10B981" },
  senior: { name: "Senior Care", desc: "Companion, escort, errands, subscription plans", icon: "💙", categories: ["senior_care","errand"], color: "#F43F5E" },
  emergency: { name: "Emergency Assistance", desc: "Urgent help, immediate response", icon: "⚡", categories: ["emergency"], color: "#EF4444" },
};

const HUB_KEYS = Object.keys(SERVICE_HUBS);

function getGreeting(name?: string | null) {
  const hour = new Date().getHours();
  const prefix = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return name ? `${prefix}, ${name.split(" ")[0]}` : prefix;
}

export default function UserHome() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { data: tasks, isLoading } = useListTasks({ limit: 3 });
  const { data: notifs, isLoading: notifsLoading } = useListNotifications();
  const unreadCount = notifs?.filter((n: Required<import("@workspace/api-client-react").Notification>) => !n.isRead).length ?? 0;

  const trustStrip = [
    { Icon: Shield, text: "KYC Verified" },
    { Icon: Camera, text: "Photo Proof" },
    { Icon: KeyRound, text: "OTP Secured" },
    { Icon: MapPin, text: "GPS Tracked" },
  ];

  const howItWorks = [
    { Icon: Smartphone, label: "Book in 60s", sub: "Select & describe" },
    { Icon: PersonStanding, label: "Comrade assigned", sub: "KYC verified local" },
    { Icon: CheckCircle2, label: "Task done", sub: "With proof & OTP" },
  ];

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <img src="/logo.jpg" alt="Go LineLess" className="h-8 w-auto" />
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1">
          <MapPin size={11} className="text-blue-500" />
          <span className="text-xs font-semibold text-gray-600">Ahmedabad, GJ</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => {}} className="relative">
            <Bell size={20} className="text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">{unreadCount}</span>
            )}
          </button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shadow-sm bg-blue-600">
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
          style={{ background: DARK_GRAD }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10" style={{ background: `radial-gradient(circle, ${BLUE}, transparent)`, transform: "translate(30%,-30%)" }} />
          <p className="text-white/60 text-sm font-medium mb-1">{getGreeting(user?.name)}</p>
          <h2 className="text-2xl font-black mb-1 leading-tight">Life without<br/>waiting.</h2>
          <p className="text-white/60 text-xs mb-4">What do you need help with today?</p>
          <button
            onClick={() => navigate("/app/book")}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md hover:bg-blue-700 transition-all"
          >
            Request Assistance
          </button>
        </motion.div>
      </div>

      {/* Notifications section */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-gray-900 text-base">Notifications</h3>
          {(notifs?.length ?? 0) > 0 && (
            <span className="text-[10px] text-gray-400">{unreadCount} unread</span>
          )}
        </div>
        {notifsLoading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <LoadingSkeleton variant="notification" count={3} />
          </div>
        ) : notifs && notifs.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {notifs.slice(0, 5).map((n: Required<import("@workspace/api-client-react").Notification>, i: number) => (
              <div
                key={n.id}
                className={`px-4 py-3 flex items-start gap-3 ${i > 0 ? "border-t border-gray-50" : ""} ${!n.isRead ? "bg-blue-50/50" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    n.type === "kyc_approved" ? "bg-green-100 text-green-600" :
                    n.type === "task_completed" ? "bg-blue-100 text-blue-600" :
                    n.type === "payment_received" ? "bg-amber-100 text-amber-600" :
                    "bg-gray-100 text-gray-500"
                  }`}
                >
                  {n.type === "kyc_approved" ? "✓" : n.type === "task_completed" ? "📋" : n.type === "payment_received" ? "₹" : "ℹ"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs ${!n.isRead ? "font-bold text-gray-900" : "text-gray-600"}`}>{n.title}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{n.message}</p>
                  <p className="text-[9px] text-gray-300 mt-0.5">
                    {new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {!n.isRead && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                )}
              </div>
            ))}
          </div>
        ) : null}
        <button
          onClick={() => navigate("/app/profile")}
          className="w-full mt-2 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
        >
          View All Notifications
        </button>
      </div>

      {/* Trust micro-strip */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-gray-900 text-base">How can we help?</h3>
          <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Ahmedabad Pilot</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {HUB_KEYS.map((hubKey, i) => {
            const hub = SERVICE_HUBS[hubKey];
            return (
              <motion.button
                key={hubKey}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, type: "spring", stiffness: 200 }}
                onClick={() => navigate(`/app/book?hub=${hubKey}`)}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-[0.98] text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: `${hub.color}12` }}>
                    {hub.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-extrabold text-sm text-gray-900">{hub.name}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">{hub.desc}</p>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {hub.categories.map(c => (
                    <span key={c} className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${hub.color}10`, color: hub.color }}>
                      {CATEGORY_NAMES[c]}
                    </span>
                  ))}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* How it works */}
      <div className="px-4 mt-6">
        <h3 className="font-extrabold text-gray-900 text-base mb-3">How it works</h3>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-start gap-0">
            {howItWorks.map((s, i) => (
              <div key={s.label} className="flex-1 flex flex-col items-center text-center relative">
                {i < howItWorks.length - 1 && (
                  <div className="absolute top-4 left-[calc(50%+20px)] right-[-calc(50%-20px)] h-px bg-gray-200" />
                )}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2 z-10 bg-blue-50 text-blue-600">
                  <s.Icon size={17} />
                </div>
                <div className="text-[10px] font-bold text-gray-900">{s.label}</div>
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
      ) : tasks && tasks.length > 0 ? (
        <div className="px-4 mt-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-extrabold text-gray-900 text-base">Recent Requests</h3>
            <button onClick={() => navigate("/app/tasks")} className="text-xs font-bold px-2 py-1 rounded-lg text-blue-600 bg-blue-50">See all</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {tasks.slice(0, 3).map((task: Required<import("@workspace/api-client-react").Task>) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => navigate(`/app/tasks/${task.id}`)}
                className="flex-shrink-0 w-52 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-50 text-blue-600">
                    <CategoryIcon category={task.category} size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 leading-tight">{CATEGORY_NAMES[task.category]}</div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <StatusBadge status={task.status ?? ""} />
                      <PaymentBadge paymentStatus={task.paymentStatus} taskStatus={task.status} paymentMethod={task.paymentMethod} />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{task.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs font-black text-blue-600">{formatCurrency(task.price)}</p>
                  {task.paymentStatus !== "paid" && !["completed","cancelled"].includes(task.status) && (
                    <PayButton taskId={task.id} variant="gold" paymentMethod={task.paymentMethod} />
                  )}
                </div>
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
          style={{ background: BLUE_GRAD }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20" style={{ background: "radial-gradient(circle, white, transparent)", transform: "translate(20%,-20%)" }} />
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Star size={12} fill="white" className="text-white" />
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">For NRI Families</span>
              </div>
              <h3 className="font-extrabold text-lg text-white leading-tight">Senior Care Plans</h3>
              <p className="text-white/70 text-xs mt-1">Peace of mind for your parents<br/>back home.</p>
            </div>
            <HeartHandshake size={40} className="text-white/40 flex-shrink-0" />
          </div>
          <button
            onClick={() => navigate("/app/senior")}
            className="mt-4 px-4 py-2.5 bg-white rounded-xl font-bold text-sm shadow-sm hover:shadow-md transition-all text-blue-600"
          >
            View Plans →
          </button>
        </motion.div>
      </div>

      {/* Payment History */}
      {tasks && tasks.length > 0 && (
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-gray-900 text-base">Payment History</h3>
            <button onClick={() => navigate("/app/tasks")} className="text-xs font-bold px-2 py-1 rounded-lg text-blue-600 bg-blue-50">See all</button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {tasks.filter((t: Required<import("@workspace/api-client-react").Task>) => t.paymentStatus === "paid" || t.status === "completed").slice(0, 3).map((task: Required<import("@workspace/api-client-react").Task>, i: number) => (
              <div
                key={task.id}
                onClick={() => navigate(`/app/tasks/${task.id}`)}
                className={`px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${i > 0 ? "border-t border-gray-50" : ""}`}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: task.paymentStatus === "paid" ? "#F0FDF4" : "#EEF2FA" }}>
                  {task.paymentStatus === "paid" ? (
                    <CheckCircle2 size={18} className="text-green-600" />
                  ) : (
                    <Wallet size={18} className="text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-900 truncate">{CATEGORY_NAMES[task.category]}</p>
                    <p className="text-sm font-black ml-2" style={{ color: task.paymentStatus === "paid" ? "#16A34A" : BLUE }}>
                      {formatCurrency(task.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${task.paymentStatus === "paid" ? "bg-green-100 text-green-700" : task.paymentStatus === "pending" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                      {task.paymentStatus === "paid" ? "Paid" : task.paymentStatus === "pending" ? "Pending" : "Unpaid"}
                    </span>
                    {task.paymentMethod && (
                      <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                        <CreditCard size={9} /> {task.paymentMethod === "cash" ? "Cash" : task.paymentMethod === "online" ? "Online" : task.paymentMethod}
                      </span>
                    )}
                    <span className="text-[9px] text-gray-300">
                      {task.completedAt ? new Date(task.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {tasks.filter((t: Required<import("@workspace/api-client-react").Task>) => t.paymentStatus === "paid" || t.status === "completed").length === 0 && (
              <div className="px-4 py-6 text-center">
                <Wallet size={24} className="text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No payments yet</p>
              </div>
            )}
          </div>
        </div>
      )}

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
