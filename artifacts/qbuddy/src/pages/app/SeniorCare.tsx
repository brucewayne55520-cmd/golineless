import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { HeartHandshake, CheckCircle2, ShieldCheck, MapPin, Star } from "lucide-react";
import { useListSubscriptionPlans, useCreateSubscription } from "@workspace/api-client-react";
import { UserBottomNav } from "@/components/BottomNav";
import { formatCurrency } from "@/lib/utils";

const NAVY = "#0F2557";
const NAVY_GRAD = "linear-gradient(135deg, #0F2557, #1D3D7C)";
const GOLD = "#C9A84C";
const GOLD_GRAD = "linear-gradient(135deg, #C9A84C, #D4B870)";

const trustBadges = [
  { Icon: ShieldCheck, text: "KYC Verified Runners" },
  { Icon: MapPin, text: "GPS Tracked" },
  { Icon: CheckCircle2, text: "Photo Proof" },
  { Icon: HeartHandshake, text: "Cancel Anytime" },
];

const testimonials = [
  { name: "Rajesh (Son in USA)", text: "Go LineLess takes care of my parents in Ahmedabad like I'm there. Worth every rupee!" },
  { name: "Priya (NRI, UK)", text: "My mother's hospital visits and medicine pickups are all handled. So grateful!" },
  { name: "Suresh (Dubai)", text: "The runner is like family now. My parents trust her completely." },
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
    <div className="min-h-screen pb-24" style={{ background: "#F8F9FC" }}>
      <div className="rounded-b-3xl p-6 text-white relative overflow-hidden" style={{ background: NAVY_GRAD }}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10" style={{ background: `radial-gradient(circle, ${GOLD}, transparent)`, transform: "translate(30%, -30%)" }} />
        <div className="text-center relative z-10">
          <HeartHandshake size={44} className="mx-auto mb-3" style={{ color: GOLD }} />
          <h1 className="text-2xl font-black mb-2">Senior Care Plans</h1>
          <p className="text-white/80 text-sm">Peace of mind for your parents</p>
          <p className="text-white/60 text-xs mt-1">Trusted by NRI families in USA, UK, UAE, Middle East</p>
        </div>
      </div>

      <div className="px-4 mt-5">
        <div className="bg-white rounded-2xl p-1.5 flex shadow-sm border border-gray-100">
          {(["monthly", "yearly"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${billing === b ? "text-white" : "text-gray-500"}`}
              style={billing === b ? { background: NAVY_GRAD } : {}}
            >
              {b === "monthly" ? "Monthly" : "Yearly (2 months free!)"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-5 space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)
        ) : !plans || plans.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-medium">No plans available yet</p>
            <p className="text-xs mt-1">We're setting up our senior care plans. Check back soon!</p>
          </div>
        ) : (
          (plans as any[]).map((plan: any, i: number) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-white rounded-2xl p-5 shadow-sm ${plan.isPopular ? "border-2" : "border border-gray-100"}`}
              style={plan.isPopular ? { borderColor: GOLD } : {}}
            >
              {plan.isPopular && (
                <div className="text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-3" style={{ background: GOLD_GRAD }}>
                  MOST POPULAR
                </div>
              )}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-[#0A1628] text-lg">{plan.name}</h3>
                  {plan.badge && <span className="text-xs font-medium" style={{ color: NAVY }}>{plan.badge}</span>}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black" style={{ color: NAVY }}>
                    {formatCurrency(billing === "monthly" ? plan.priceMonthly : plan.priceYearly)}
                  </div>
                  <div className="text-xs text-gray-400">/{billing === "monthly" ? "month" : "year"}</div>
                </div>
              </div>
              {plan.tasksPerMonth && (
                <p className="text-sm text-gray-600 mt-2">{plan.tasksPerMonth} tasks/month</p>
              )}
              {plan.features?.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {plan.features.map((f: string) => (
                    <li key={f} className="text-xs text-gray-600 flex items-center gap-2">
                      <span className="font-bold" style={{ color: GOLD }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={createSub.isPending}
                className="w-full mt-4 py-3 rounded-xl font-bold text-sm text-white"
                style={{ background: plan.isPopular ? GOLD_GRAD : NAVY_GRAD }}
              >
                Subscribe Now
              </button>
            </motion.div>
          ))
        )}
      </div>

      <div className="px-4 mt-6">
        <h3 className="font-bold text-[#0A1628] mb-3">Why families trust us</h3>
        <div className="grid grid-cols-2 gap-3">
          {trustBadges.map((b) => (
            <div key={b.text} className="bg-white rounded-xl p-3 flex items-center gap-2 shadow-sm border border-gray-100">
              <b.Icon size={18} style={{ color: NAVY }} />
              <span className="text-xs font-medium text-gray-700">{b.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 mt-6">
        <h3 className="font-bold text-[#0A1628] mb-3">What NRI families say</h3>
        <div className="space-y-3">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex gap-1 mb-2">
                {[1,2,3,4,5].map(s => <Star key={s} size={12} className="fill-yellow-400 text-yellow-400" />)}
              </div>
              <p className="text-xs text-gray-600 italic">"{t.text}"</p>
              <p className="text-xs font-semibold text-gray-500 mt-2">— {t.name}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 mt-6 mb-4">
        <div className="rounded-2xl p-4 text-xs text-gray-500 border border-gray-200 bg-white">
          <p className="font-semibold text-gray-700 mb-1">Important Disclaimer</p>
          Go LineLess assists with queue, pickup, submission and support tasks. We do not guarantee approvals, government outcomes, medical decisions or bank decisions.
        </div>
      </div>

      <UserBottomNav />
    </div>
  );
}
