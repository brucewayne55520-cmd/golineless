import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { HeartHandshake, CheckCircle2, ShieldCheck, MapPin, Star, Globe, Phone, Clock, Sparkles } from "lucide-react";
import { useListSubscriptionPlans } from "@workspace/api-client-react";
import { UserBottomNav } from "@/components/BottomNav";
import { formatCurrency } from "@/lib/utils";
import { DARK, DARK_GRAD, BLUE, BLUE_GRAD, SURFACE_DIM } from "@/lib/theme";
import { EmptyState } from "@/components/EmptyState";


const trustBadges = [
  { Icon: ShieldCheck, title: "KYC Verified Runners", desc: "Aadhaar + selfie verified" },
  { Icon: MapPin, title: "GPS Tracked", desc: "Every visit, every time" },
  { Icon: CheckCircle2, title: "Photo Proof", desc: "Task evidence sent to you" },
  { Icon: Phone, title: "Family Updates", desc: "You're always in the loop" },
  { Icon: Clock, title: "Flexible Scheduling", desc: "Book when needed" },
  { Icon: Globe, title: "NRI-Friendly", desc: "Manage from anywhere" },
];

const testimonials = [
  {
    name: "Rajesh Mehta",
    location: "Son in San Francisco, USA",
    text: "My parents are 75 and 72. Go LineLess runners handle their hospital visits, medicine pickups, and bank work every week. I feel like I'm still there with them.",
    rating: 5,
  },
  {
    name: "Priya Patel",
    location: "Daughter in London, UK",
    text: "My mother's monthly doctor visits were my biggest worry. Now I get photo proof and a call update after every visit. Absolute peace of mind.",
    rating: 5,
  },
  {
    name: "Suresh Sharma",
    location: "Son in Dubai, UAE",
    text: "The runner has become like family to my parents. They trust her completely. Worth every rupee — I only wish this service existed earlier.",
    rating: 5,
  },
];

const nriCountries = ["🇺🇸 USA", "🇬🇧 UK", "🇦🇪 UAE", "🇨🇦 Canada", "🇦🇺 Australia", "🇸🇬 Singapore"];

export default function SeniorCare() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const { data: plans, isLoading } = useListSubscriptionPlans();

  // [OFFLINE MODE] Subscription activation — requires admin approval during pilot
  const handleSubscribe = (_planId: string) => {
    toast.info("Subscription requests require admin approval during our pilot phase. Please contact support@golineless.in or ask your admin to activate.", { duration: 8000 });
  };

  return (
    <div className="min-h-screen pb-24 bg-gray-50">
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: DARK_GRAD }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: `radial-gradient(circle, ${BLUE}, transparent)`, transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-5" style={{ background: `radial-gradient(circle, white, transparent)`, transform: "translate(-30%, 30%)" }} />
        <div className="relative z-10 px-5 pt-8 pb-6 text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
            style={{ background: BLUE_GRAD }}
          >
            <HeartHandshake size={30} className="text-white" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-black text-white mb-2 leading-tight"
          >
            Care for your parents,<br />from anywhere in the world.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/70 text-sm leading-relaxed mb-4"
          >
            Preferred by NRI families across {nriCountries.length} countries.<br />
            Your parents deserve the best support.
          </motion.p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {nriCountries.map(c => (
              <span key={c} className="text-xs font-medium text-white/70 bg-white/10 border border-white/20 px-2.5 py-1 rounded-full">{c}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Emotional copy strip */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} style={{ color: BLUE }} />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Why families choose us</span>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          When you're thousands of miles away, you need more than just a service — you need someone you <em>trust</em> to be there for your parents. Our verified runners become a reliable presence in their lives.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="px-4 mt-5">
        <div className="bg-white rounded-2xl p-1.5 flex shadow-sm border border-gray-100">
          {(["monthly", "yearly"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all relative ${billing === b ? "text-white shadow-sm" : "text-gray-500"}`}
              style={billing === b ? { background: DARK_GRAD } : {}}
            >
              {b === "monthly" ? "Monthly" : "Yearly"}
              {b === "yearly" && (
                <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: billing === "yearly" ? `${BLUE}40` : SURFACE_DIM, color: billing === "yearly" ? BLUE : "#9CA3AF" }}>
                  Save 2 months
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plans */}
      <div className="px-4 mt-5 space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />)          ) : !plans || plans.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <EmptyState
                icon={HeartHandshake}
                title="Plans coming soon"
                description="We're finalizing our senior care packages. Check back in a few days!"
              />
            </div>
        ) : (            (plans ?? []).map((plan: Required<import("@workspace/api-client-react").SubscriptionPlan>, i: number) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-white rounded-2xl overflow-hidden shadow-sm ${plan.isPopular ? "border-2 shadow-md" : "border border-gray-100"}`}
              style={plan.isPopular ? { borderColor: BLUE } : {}}
            >
              {plan.isPopular && (
                <div className="py-2 text-center text-gray-900 text-xs font-black tracking-wider" style={{ background: BLUE_GRAD }}>
                  ★ MOST CHOSEN BY NRI FAMILIES
                </div>
              )}
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-black text-gray-900 text-lg">{plan.name}</h3>
                    {plan.badge && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block" style={{ background: "#EEF2FA", color: DARK }}>{plan.badge}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black" style={{ color: DARK }}>
                      {formatCurrency(billing === "monthly" ? plan.priceMonthly : plan.priceYearly)}
                    </div>
                    <div className="text-xs text-gray-400">/{billing === "monthly" ? "month" : "year"}</div>
                    {billing === "yearly" && plan.priceMonthly && (
                      <div className="text-[10px] font-semibold mt-0.5" style={{ color: BLUE }}>
                        Save {formatCurrency(plan.priceMonthly * 12 - plan.priceYearly)}
                      </div>
                    )}
                  </div>
                </div>
                {plan.tasksPerMonth && (
                  <div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl" style={{ background: "#EEF2FA" }}>
                    <CheckCircle2 size={14} style={{ color: DARK }} />
                    <p className="text-sm font-bold" style={{ color: DARK }}>{plan.tasksPerMonth} assisted visits / month</p>
                  </div>
                )}
                {plan.features?.length > 0 && (
                  <ul className="space-y-2 mb-4">
                    {plan.features.map((f: string) => (
                      <li key={f} className="text-xs text-gray-600 flex items-start gap-2">
                        <span className="font-black flex-shrink-0 mt-0.5" style={{ color: BLUE }}>✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  className="w-full py-3.5 rounded-xl font-black text-sm shadow-sm hover:shadow-md transition-all"
                  style={plan.isPopular
                    ? { background: BLUE_GRAD, color: DARK }
                    : { background: DARK_GRAD, color: "white" }}
                >
                  {"Get Started →"}
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Trust grid */}
      <div className="px-4 mt-8">
        <h3 className="font-black text-gray-900 text-base mb-4">Built for your peace of mind</h3>
        <div className="grid grid-cols-2 gap-3">
          {trustBadges.map((b) => (
            <div key={b.title} className="bg-white rounded-xl p-3.5 flex items-start gap-2.5 shadow-sm border border-gray-100">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#EEF2FA" }}>
                <b.Icon size={16} style={{ color: DARK }} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">{b.title}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div className="px-4 mt-8">
        <h3 className="font-black text-gray-900 text-base mb-4">What NRI families say</h3>
        <div className="space-y-3">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex gap-1 mb-3">
                {[1,2,3,4,5].map(s => <Star key={s} size={12} className="fill-yellow-400 text-yellow-400" />)}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed italic">"{t.text}"</p>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black" style={{ background: DARK_GRAD }}>
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">{t.name}</p>
                  <p className="text-[10px] text-gray-400">{t.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="px-4 mt-6 mb-4">
        <div className="rounded-2xl p-4 border border-amber-200 bg-amber-50">
          <p className="text-xs font-bold text-amber-800 mb-1">Important Note</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Go LineLess assists with queue management, pickup, submission and support tasks. We do not guarantee government approvals, medical decisions or bank outcomes.
          </p>
        </div>
      </div>

      <UserBottomNav />
    </div>
  );
}
