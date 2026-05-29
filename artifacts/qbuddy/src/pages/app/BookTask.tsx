import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useCreateTask } from "@workspace/api-client-react";
import { CATEGORY_ICONS, CATEGORY_NAMES, CATEGORY_PRICES, formatCurrency } from "@/lib/utils";

const DISTANCE_CHARGES: Record<string, number> = { "0-2": 0, "2-5": 20, "5+": 50 };
const DISTANCE_LABELS: Record<string, string> = { "0-2": "0–2 km", "2-5": "2–5 km", "5+": "5+ km" };

export default function BookTask() {
  const [step, setStep] = useState(1);
  const [, navigate] = useLocation();
  const [params] = useState(() => new URLSearchParams(window.location.search));
  const [category, setCategory] = useState(params.get("category") ?? "hospital");
  const [description, setDescription] = useState("");
  const [seniorInvolved, setSeniorInvolved] = useState(false);
  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split("T")[0]);
  const [scheduledTime, setScheduledTime] = useState("10:00");
  const [locationName, setLocationName] = useState("");
  const [locationArea, setLocationArea] = useState("");
  const [distanceBand, setDistanceBand] = useState("0-2");
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [terms, setTerms] = useState(false);
  const [bookedTask, setBookedTask] = useState<any>(null);

  const createTask = useCreateTask();

  const basePrice = CATEGORY_PRICES[category] ?? 149;
  const distanceCharge = DISTANCE_CHARGES[distanceBand] ?? 0;
  const urgencyCharge = urgency === "urgent" ? 50 : 0;
  let subtotal = basePrice + distanceCharge + urgencyCharge;
  const discountAmount = couponApplied ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal - discountAmount;
  const runnerEarning = Math.round(total * 0.7);

  const handleApplyCoupon = () => {
    if (coupon.toUpperCase() === "QBUDDY10") {
      setCouponApplied(true);
      toast.success("Coupon applied! 10% off");
    } else {
      toast.error("Invalid coupon code");
    }
  };

  const handleBook = () => {
    if (!terms) { toast.error("Please accept terms"); return; }
    createTask.mutate({
      body: {
        category, description, urgency, locationName, locationArea, locationCity: "Ahmedabad",
        distanceBand, scheduledDate, scheduledTime, paymentMethod,
        couponCode: couponApplied ? "QBUDDY10" : undefined,
        seniorInvolved, specialInstructions,
      } as any,
    }, {
      onSuccess: (data) => {
        setBookedTask(data);
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#6C3FD4", "#FF6B35", "#9B6FF7"] });
      },
      onError: () => toast.error("Failed to book. Please try again."),
    });
  };

  const timeSlots = Array.from({ length: 24 }, (_, h) =>
    ["00", "30"].map((m) => `${String(h).padStart(2, "0")}:${m}`)
  ).flat();

  return (
    <div className="min-h-screen bg-[#F8F7FF]">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate("/app/home")} className="text-xl">←</button>
        <div className="flex-1">
          <h1 className="font-bold text-[#1A1A2E]">Book a Runner</h1>
          <div className="flex gap-1 mt-1">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? "bg-[#6C3FD4]" : "bg-gray-200"}`} />
            ))}
          </div>
        </div>
        <span className="text-sm text-gray-400">Step {step}/3</span>
      </div>

      <div className="px-4 py-5">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">{CATEGORY_ICONS[category]}</span>
                  <div>
                    <h2 className="font-bold text-[#1A1A2E] text-lg">{CATEGORY_NAMES[category]}</h2>
                    <button onClick={() => {}} className="text-xs text-[#6C3FD4] font-semibold">Change category</button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Task Description *</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={300}
                    rows={4}
                    placeholder="Describe what you need done in detail..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-[#6C3FD4]"
                  />
                  <p className="text-right text-xs text-gray-400 mt-1">{description.length}/300</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setSeniorInvolved(!seniorInvolved)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${seniorInvolved ? "bg-[#6C3FD4]" : "bg-gray-200"}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${seniorInvolved ? "translate-x-6" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Senior / disabled person involved?</span>
                </label>
                {seniorInvolved && (
                  <p className="mt-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                    Our runner will be extra patient and careful. No extra charge.
                  </p>
                )}
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <label className="text-sm font-medium text-gray-700 mb-3 block">Urgency</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { val: "normal", label: "Normal", sub: "No extra charge", icon: "🕐" },
                    { val: "urgent", label: "Urgent", sub: "+Rs 50 surcharge", icon: "⚡" },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => setUrgency(opt.val as any)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${urgency === opt.val ? "border-[#6C3FD4] bg-purple-50" : "border-gray-200"}`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <div className="text-sm font-bold mt-1">{opt.label}</div>
                      <div className="text-xs text-gray-500">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Special Instructions (optional)</label>
                <input
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Any specific requirements..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3FD4]"
                />
              </div>

              <button
                onClick={() => { if (!description) { toast.error("Please describe your task"); return; } setStep(2); }}
                className="w-full py-4 rounded-2xl text-white font-bold text-lg"
                style={{ background: "linear-gradient(135deg, #6C3FD4, #9B6FF7)" }}
              >
                Next: When &amp; Where →
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-[#1A1A2E] mb-4">When?</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Date</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3FD4]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Time</label>
                    <select
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3FD4]"
                    >
                      {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-[#1A1A2E] mb-4">Where?</h3>
                <div className="space-y-3">
                  <input
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="Hospital / office name"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3FD4]"
                  />
                  <input
                    value={locationArea}
                    onChange={(e) => setLocationArea(e.target.value)}
                    placeholder="Area / locality"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3FD4]"
                  />
                  <input value="Ahmedabad" readOnly className="w-full border border-gray-100 rounded-xl px-3 py-2 text-sm bg-gray-50 text-gray-500" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-[#1A1A2E] mb-3">Distance</h3>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(DISTANCE_LABELS).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setDistanceBand(val)}
                      className={`py-2 rounded-xl border-2 text-sm font-medium transition-all ${distanceBand === val ? "border-[#6C3FD4] bg-purple-50 text-[#6C3FD4]" : "border-gray-200 text-gray-600"}`}
                    >
                      {label}
                      <div className="text-xs text-gray-400">+Rs {DISTANCE_CHARGES[val]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Static map placeholder */}
              <div className="bg-gray-100 rounded-2xl h-36 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <div className="text-3xl mb-1">📍</div>
                  <div className="text-sm">Ahmedabad, Gujarat</div>
                  <div className="text-xs">23.0225, 72.5714</div>
                </div>
              </div>

              <button
                onClick={() => setStep(3)}
                className="w-full py-4 rounded-2xl text-white font-bold text-lg"
                style={{ background: "linear-gradient(135deg, #6C3FD4, #9B6FF7)" }}
              >
                Next: Review &amp; Pay →
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-[#1A1A2E] mb-4">Price Breakdown</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { label: `Base price (${CATEGORY_NAMES[category]})`, val: basePrice },
                    { label: `Distance (${DISTANCE_LABELS[distanceBand]})`, val: distanceCharge },
                    { label: `Urgency (${urgency === "urgent" ? "Urgent" : "Normal"})`, val: urgencyCharge },
                    ...(couponApplied ? [{ label: "Coupon (QBUDDY10)", val: -discountAmount }] : []),
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between text-gray-600">
                      <span>{row.label}</span>
                      <span className={row.val < 0 ? "text-green-600 font-medium" : ""}>{row.val < 0 ? "-" : ""}Rs {Math.abs(row.val)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-[#1A1A2E] text-base">
                    <span>Total</span>
                    <span className="text-[#6C3FD4]">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Runner earns</span>
                    <span>{formatCurrency(runnerEarning)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-[#1A1A2E] mb-3">Payment Method</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { val: "online", label: "Pay Now", icon: "💳", sub: "Razorpay" },
                    { val: "cash", label: "Pay on Completion", icon: "💵", sub: "Cash to runner" },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => setPaymentMethod(opt.val)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${paymentMethod === opt.val ? "border-[#6C3FD4] bg-purple-50" : "border-gray-200"}`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <div className="text-sm font-bold mt-1">{opt.label}</div>
                      <div className="text-xs text-gray-500">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-[#1A1A2E] mb-3">Coupon Code</h3>
                <div className="flex gap-2">
                  <input
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                    placeholder="QBUDDY10"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C3FD4]"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponApplied}
                    className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
                    style={{ background: couponApplied ? "#22C55E" : "linear-gradient(135deg, #6C3FD4, #9B6FF7)" }}
                  >
                    {couponApplied ? "Applied ✓" : "Apply"}
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 accent-[#6C3FD4]" />
                <span className="text-xs text-gray-500">I agree to QBuddy's Terms of Service and understand that the runner will complete this task on my behalf.</span>
              </label>

              <button
                onClick={handleBook}
                disabled={createTask.isPending}
                className="w-full py-4 rounded-2xl text-white font-bold text-lg"
                style={{ background: "linear-gradient(135deg, #FF6B35, #FF8C42)" }}
              >
                {createTask.isPending ? "Booking..." : "Confirm & Book 🚀"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Success modal */}
      <AnimatePresence>
        {bookedTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-end z-50"
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className="bg-white w-full rounded-t-3xl p-8 text-center"
            >
              <div className="text-5xl mb-3">🎉</div>
              <h2 className="text-2xl font-black text-[#1A1A2E] mb-2">Task Booked!</h2>
              <p className="text-gray-500 mb-4">Your runner will be assigned shortly.</p>
              <div className="bg-purple-50 rounded-2xl p-4 mb-5">
                <p className="text-sm text-gray-500 mb-2">Share this OTP with your runner to complete the task:</p>
                <div className="flex gap-2 justify-center">
                  {(bookedTask.otp ?? "------").split("").map((d: string, i: number) => (
                    <div key={i} className="w-10 h-12 bg-white border-2 border-[#6C3FD4] rounded-xl flex items-center justify-center text-xl font-black text-[#6C3FD4]">{d}</div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => navigate(`/app/tasks/${bookedTask.id}`)}
                className="w-full py-3 rounded-2xl text-white font-bold"
                style={{ background: "linear-gradient(135deg, #6C3FD4, #9B6FF7)" }}
              >
                Track your task
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
