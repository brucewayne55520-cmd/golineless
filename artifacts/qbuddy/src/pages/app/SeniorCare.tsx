import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useListSubscriptionPlans, useCreateSubscription } from "@workspace/api-client-react";
import { UserBottomNav } from "@/components/BottomNav";
import { formatCurrency } from "@/lib/utils";

const trustBadges = [
  { icon: "✅", text: "KYC Verified Runners" },
  { icon: "📍", text: "GPS Tracked" },
  { icon: "🛡️", text: "Insured Tasks" },
  { icon: "❌", text: "Cancel Anytime" },
];

const testimonials = [
  { name: "Rajesh (Son in USA)", text: "QBuddy takes care of my parents in Ahmedabad like I'm there. Worth every rupee!" },
  { name: "Priya (NRI, UK)", text: "My mother's hospital visits and medicine pickups are all handled. So grateful!" },
  { name: "Suresh (Dubai)", text: "The runner Fatima is like family now. My parents trust her completely." },
];

export default function SeniorCare() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const { data: plans, isLoading } = useListSubscriptionPlans();
  const createSub = useCreateSubscription();

  const handleSubscribe = (planId: string) => {
    createSub.mutate({ data: { planId, billingCycle: billing } } as any, {
      onSuccess: () => toast.success("Subscription activated!"),
      onError: () => toast.error("Failed to subscribe"),
    });
  };

  return (
    <div className="min-h-screen bg-[#F8F7FF] pb-24">
      {/* Header */}
      <div className="rounded-b-3xl p-6 text-white" style={{ background: "linear-gradient(135deg, #6C3FD4, #9B6FF7)" }}>
        <div className="text-center">
          <div className="text-5xl mb-3">👴</div>
          <h1 className="text-2xl font-black mb-2">Senior Care Plans</h1>
          <p className="text-white/80 text-sm">Peace of mind for your parents</p>
          <p className="text-white/60 text-xs mt-1">Trusted by NRI families in USA, UK, UAE, Middle East</p>
        </div>
      </div>

      {/* Billing toggle */}
      <div className="px-4 mt-5">
        <div className="bg-white rounded-2xl p-1.5 flex shadow-sm">
          {(["monthly", "yearly"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${billing === b ? "bg-[#6C3FD4] text-white" : "text-gray-500"}`}
            >
              {b === "monthly" ? "Monthly" : "Yearly (2 months free!)"}
            </button>
          ))}
        </div>
      </div>

      {/* Plans */}
      <div className="px-4 mt-5 space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)
        ) : !plans || plans.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-4xl mb-2">📋</div>
            <p>No plans available</p>
          </div>
        ) : (
          (plans as any[]).map((plan: any, i: number) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-white rounded-2xl p-5 shadow-sm ${plan.isPopular ? "border-2 border-[#6C3FD4]" : "border border-gray-100"}`}
            >
              {plan.isPopular && (
                <div className="bg-[#6C3FD4] text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-3">
                  MOST POPULAR
                </div>
              )}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-[#1A1A2E] text-lg">{plan.name}</h3>
                  {plan.badge && <span className="text-xs text-[#6C3FD4] font-medium">{plan.badge}</span>}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-[#6C3FD4]">
                    {formatCurrency(billing === "monthly" ? plan.priceMonthly : plan.priceYearly)}
                  </div>
                  <div className="text-xs text-gray-400">/{billing === "monthly" ? "month" : "year"}</div>
                </div>
              </div>
              {plan.tasksPerMonth && (
                <p className="text-sm text-gray-600 mt-2">{plan.tasksPerMonth} tasks/month</p>
              )}
              {plan.features?.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {plan.features.map((f: string) => (
                    <li key={f} className="text-xs text-gray-600 flex items-center gap-2">
                      <span className="text-green-500 font-bold">✓</span> {f}
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={createSub.isPending}
                className="w-full mt-4 py-3 rounded-xl font-bold text-sm text-white"
                style={{ background: plan.isPopular ? "linear-gradient(135deg, #6C3FD4, #9B6FF7)" : "linear-gradient(135deg, #FF6B35, #FF8C42)" }}
              >
                Subscribe Now
              </button>
            </motion.div>
          ))
        )}
      </div>

      {/* Trust badges */}
      <div className="px-4 mt-6">
        <div className="grid grid-cols-2 gap-3">
          {trustBadges.map((b) => (
            <div key={b.text} className="bg-white rounded-xl p-3 flex items-center gap-2 shadow-sm">
              <span className="text-lg">{b.icon}</span>
              <span className="text-xs font-medium text-gray-700">{b.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div className="px-4 mt-6">
        <h3 className="font-bold text-[#1A1A2E] mb-3">What NRI families say</h3>
        <div className="space-y-3">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex gap-1 mb-2">{[1,2,3,4,5].map(s => <span key={s} className="text-yellow-400 text-sm">★</span>)}</div>
              <p className="text-xs text-gray-600 italic">"{t.text}"</p>
              <p className="text-xs font-semibold text-gray-500 mt-2">— {t.name}</p>
            </div>
          ))}
        </div>
      </div>

      <UserBottomNav />
    </div>
  );
}
