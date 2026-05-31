import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Clock, Zap, MapPin, CreditCard, Banknote, Sparkles, ArrowLeft, Shield, CheckCircle2, ChevronDown } from "lucide-react";
import { useCreateTask } from "@workspace/api-client-react";
import { CategoryIcon, CATEGORY_KEYS } from "@/components/CategoryIcon";
import { CATEGORY_NAMES, CATEGORY_PRICES, formatCurrency } from "@/lib/utils";

const NAVY = "#0F2557";
const NAVY_GRAD = "linear-gradient(135deg, #0F2557, #1D3D7C)";
const GOLD = "#C9A84C";
const GOLD_GRAD = "linear-gradient(135deg, #C9A84C, #D4B870)";

const DISTANCE_CHARGES: Record<string, number> = { "0-2": 0, "2-5": 20, "5+": 50 };
const DISTANCE_LABELS: Record<string, string> = { "0-2": "0–2 km", "2-5": "2–5 km", "5+": "5+ km" };

const LIFE_SITUATIONS: Record<string, { label: string; desc: string }> = {
  hospital: { label: "Healthcare Help", desc: "Hospital visits, OPD, reports, pharmacy" },
  bank: { label: "Banking Help", desc: "Bank visits, account work, cheque deposits" },
  government: { label: "Government Work", desc: "RTO, municipality, ration card, any office" },
  medicine: { label: "Medicine Pickup", desc: "Pharmacy runs, prescription collection" },
  senior: { label: "Senior Support", desc: "Companion, escort, errand for elderly" },
  errands: { label: "Errands & Pickup", desc: "Shopping, courier, delivery, purchases" },
  documentation: { label: "Documentation", desc: "Stamp, attestation, form submission" },
  emergency: { label: "Emergency Assistance", desc: "Urgent help, immediate assistance" },
};

const STEP_LABELS = ["What & When", "Where", "Review & Pay"];

export default function BookTask() {
  const [step, setStep] = useState(1);
  const [, navigate] = useLocation();
  const [params] = useState(() => new URLSearchParams(window.location.search));
  const [category, setCategory] = useState(params.get("category") ?? "hospital");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
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
  const platformFee = 20;
  let subtotal = basePrice + distanceCharge + urgencyCharge + platformFee;
  const discountAmount = couponApplied ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal - discountAmount;
  const runnerEarning = Math.round((total - platformFee) * 0.7);

  const handleApplyCoupon = () => {
    if (coupon.toUpperCase() === "QBUDDY10" || coupon.toUpperCase() === "GOLINELESS10") {
      setCouponApplied(true);
      toast.success("Coupon applied — 10% off!");
    } else {
      toast.error("Invalid coupon code");
    }
  };

  const handleBook = () => {
    if (!terms) { toast.error("Please accept the terms to continue"); return; }
    createTask.mutate({
      data: {
        category, description, urgency, locationName, locationArea, locationCity: "Ahmedabad",
        distanceBand, scheduledDate, scheduledTime, paymentMethod,
        couponCode: couponApplied ? "QBUDDY10" : undefined,
        seniorInvolved, specialInstructions,
      } as any,
    }, {
      onSuccess: (data) => {
        setBookedTask(data);
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: [NAVY, GOLD, "#1D3D7C"] });
      },
      onError: () => toast.error("Booking failed. Please try again."),
    });
  };

  const timeSlots = Array.from({ length: 24 }, (_, h) =>
    ["00", "30"].map((m) => `${String(h).padStart(2, "0")}:${m}`)
  ).flat();

  const inputClass = "w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent transition-all bg-white";
  const sit = LIFE_SITUATIONS[category] ?? { label: CATEGORY_NAMES[category], desc: "" };

  return (
    <div className="min-h-screen" style={{ background: "#F8F9FC" }}>
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate("/app/home")} className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1">
            <h1 className="font-black text-[#0A1628] text-base">Request Assistance</h1>
            <p className="text-xs text-gray-400">{STEP_LABELS[step - 1]}</p>
          </div>
          <span className="text-xs font-bold px-2 py-1 rounded-lg text-gray-500 bg-gray-50 border border-gray-100">{step}/3</span>
        </div>
        {/* Progress bar */}
        <div className="flex gap-1.5">
          {[1, 2, 3].map(s => (
            <div key={s} className="h-1.5 flex-1 rounded-full transition-all duration-500"
              style={s <= step ? { background: GOLD_GRAD } : { background: "#E5E7EB" }} />
          ))}
        </div>
      </div>

      <div className="px-4 py-5">
        <AnimatePresence mode="wait">
          {/* ── Step 1: What & When ── */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">

              {/* Category picker */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setShowCategoryPicker(v => !v)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #EEF2FA, #D9E3F5)", color: NAVY }}>
                    <CategoryIcon category={category} size={26} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Selected service</p>
                    <h2 className="font-black text-[#0A1628] text-base">{sit.label}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{sit.desc}</p>
                  </div>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${showCategoryPicker ? "rotate-180" : ""}`} />
                </button>
                {showCategoryPicker && (
                  <div className="border-t border-gray-100 p-3 grid grid-cols-2 gap-2">
                    {CATEGORY_KEYS.map(cat => {
                      const s = LIFE_SITUATIONS[cat] ?? { label: CATEGORY_NAMES[cat], desc: "" };
                      return (
                        <button
                          key={cat}
                          onClick={() => { setCategory(cat); setShowCategoryPicker(false); }}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl text-left border-2 transition-all`}
                          style={category === cat ? { borderColor: NAVY, background: "#EEF2FA" } : { borderColor: "#F3F4F6" }}
                        >
                          <div style={{ color: category === cat ? NAVY : "#9CA3AF" }}>
                            <CategoryIcon category={cat} size={18} />
                          </div>
                          <span className="text-xs font-semibold" style={{ color: category === cat ? NAVY : "#374151" }}>{s.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <label className="text-sm font-bold text-gray-700 mb-2 block">Tell us what you need help with</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={300}
                  rows={4}
                  placeholder="Describe your task in detail. E.g. 'Need someone to collect blood reports from Civil Hospital and bring them home by 2pm.'"
                  className={`${inputClass} resize-none`}
                  style={{ "--tw-ring-color": NAVY } as any}
                />
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-gray-400">Be as specific as possible</span>
                  <span className="text-xs text-gray-400">{description.length}/300</span>
                </div>
              </div>

              {/* Urgency */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <label className="text-sm font-bold text-gray-700 mb-3 block">How soon do you need help?</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { val: "normal", label: "Scheduled", sub: "Within a few hours · no extra charge", Icon: Clock },
                    { val: "urgent", label: "Urgent", sub: "ASAP · +Rs 50 priority fee", Icon: Zap },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => setUrgency(opt.val as any)}
                      className="p-4 rounded-xl border-2 text-left transition-all"
                      style={urgency === opt.val ? { borderColor: NAVY, background: "#EEF2FA" } : { borderColor: "#E5E7EB" }}
                    >
                      <opt.Icon size={18} style={{ color: urgency === opt.val ? NAVY : "#9CA3AF" }} />
                      <div className="text-sm font-bold mt-1.5" style={{ color: urgency === opt.val ? NAVY : "#374151" }}>{opt.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5 leading-tight">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Senior toggle */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    onClick={() => setSeniorInvolved(!seniorInvolved)}
                    className="w-12 h-6 rounded-full transition-colors relative flex-shrink-0"
                    style={{ background: seniorInvolved ? NAVY : "#E5E7EB" }}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${seniorInvolved ? "translate-x-6" : "translate-x-0.5"}`} />
                  </button>
                  <div>
                    <span className="text-sm font-semibold text-gray-700">Senior or differently-abled person involved?</span>
                    <p className="text-xs text-gray-400 mt-0.5">Runner will be extra patient — at no extra charge</p>
                  </div>
                </label>
                {seniorInvolved && (
                  <div className="mt-3 flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-2 rounded-xl">
                    <Shield size={14} />
                    <p className="text-xs font-medium">Our runner is trained for senior assistance</p>
                  </div>
                )}
              </div>

              {/* Special instructions */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <label className="text-sm font-bold text-gray-700 mb-2 block">Any special instructions? <span className="font-normal text-gray-400">(optional)</span></label>
                <input
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="E.g. Gate code, specific contact name, bring ID..."
                  className={inputClass}
                />
              </div>

              <button
                onClick={() => { if (!description.trim()) { toast.error("Please describe what you need help with"); return; } setStep(2); }}
                className="w-full py-4 rounded-2xl font-black text-base shadow-md hover:shadow-lg transition-all"
                style={{ background: GOLD_GRAD, color: "#0A1628" }}
              >
                Next: When &amp; Where →
              </button>
            </motion.div>
          )}

          {/* ── Step 2: When & Where ── */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-black text-[#0A1628] mb-4">When do you need the runner?</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Date</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Arrival time</label>
                    <select
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className={inputClass}
                    >
                      {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-black text-[#0A1628] mb-4">Where should the runner go?</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Place name</label>
                    <input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="E.g. Civil Hospital, Sector 21 Gandhinagar..." className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Area / Locality</label>
                    <input value={locationArea} onChange={(e) => setLocationArea(e.target.value)} placeholder="E.g. Navrangpura, Bopal, Satellite..." className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">City</label>
                    <input value="Ahmedabad" readOnly className="w-full border border-gray-100 rounded-xl px-3.5 py-3 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-black text-[#0A1628] mb-1">Approx. distance from you</h3>
                <p className="text-xs text-gray-400 mb-3">Used to calculate travel charges</p>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(DISTANCE_LABELS).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setDistanceBand(val)}
                      className="py-3 rounded-xl border-2 text-sm font-bold transition-all"
                      style={distanceBand === val
                        ? { borderColor: NAVY, background: "#EEF2FA", color: NAVY }
                        : { borderColor: "#E5E7EB", color: "#6B7280" }}
                    >
                      {label}
                      <div className="text-xs font-normal mt-0.5" style={{ color: distanceBand === val ? NAVY : "#9CA3AF" }}>
                        {DISTANCE_CHARGES[val] === 0 ? "Free" : `+Rs ${DISTANCE_CHARGES[val]}`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl h-32 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <MapPin size={24} className="mx-auto mb-1" style={{ color: NAVY + "60" }} />
                  <div className="text-sm font-medium text-gray-500">Ahmedabad, Gujarat</div>
                  <div className="text-xs text-gray-400">Service area · Pilot zone</div>
                </div>
              </div>

              <button
                onClick={() => setStep(3)}
                className="w-full py-4 rounded-2xl font-black text-base shadow-md hover:shadow-lg transition-all"
                style={{ background: GOLD_GRAD, color: "#0A1628" }}
              >
                Next: Review &amp; Pay →
              </button>
            </motion.div>
          )}

          {/* ── Step 3: Review & Pay ── */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">

              {/* Summary */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#EEF2FA", color: NAVY }}>
                    <CategoryIcon category={category} size={22} />
                  </div>
                  <div>
                    <h3 className="font-black text-[#0A1628]">{LIFE_SITUATIONS[category]?.label ?? CATEGORY_NAMES[category]}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{scheduledDate} · {scheduledTime} · {locationArea || "Ahmedabad"}</p>
                  </div>
                </div>
                <h3 className="font-bold text-[#0A1628] mb-3">Price Breakdown</h3>
                <div className="space-y-2.5 text-sm">
                  {[
                    { label: `Base service fee`, val: basePrice },
                    { label: `Distance (${DISTANCE_LABELS[distanceBand]})`, val: distanceCharge },
                    { label: `${urgency === "urgent" ? "Urgent priority fee" : "Standard scheduling"}`, val: urgencyCharge },
                    { label: "Platform fee", val: platformFee },
                    ...(couponApplied ? [{ label: "Coupon discount (10%)", val: -discountAmount }] : []),
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between">
                      <span className="text-gray-500">{row.label}</span>
                      <span className={`font-medium ${row.val < 0 ? "text-green-600" : "text-gray-700"}`}>
                        {row.val < 0 ? "−" : ""}Rs {Math.abs(row.val)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-gray-100 pt-3 flex justify-between font-black text-[#0A1628] text-lg">
                    <span>Total</span>
                    <span style={{ color: NAVY }}>{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Runner earns (70%)</span>
                    <span className="font-semibold">{formatCurrency(runnerEarning)}</span>
                  </div>
                </div>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { Icon: Shield, label: "KYC Verified\nRunner" },
                  { Icon: CheckCircle2, label: "OTP\nCompletion" },
                  { Icon: Clock, label: "Live\nTracking" },
                ].map((b) => (
                  <div key={b.label} className="bg-white rounded-xl p-3 text-center border border-gray-100 shadow-sm">
                    <b.Icon size={16} className="mx-auto mb-1" style={{ color: GOLD }} />
                    <p className="text-[9px] font-semibold text-gray-500 leading-tight whitespace-pre-line">{b.label}</p>
                  </div>
                ))}
              </div>

              {/* Payment */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-[#0A1628] mb-3">Payment Method</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { val: "online", label: "Pay Now", Icon: CreditCard, sub: "UPI / Cards / Net banking" },
                    { val: "cash", label: "Pay on Completion", Icon: Banknote, sub: "Cash to runner" },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => setPaymentMethod(opt.val)}
                      className="p-3.5 rounded-xl border-2 text-left transition-all"
                      style={paymentMethod === opt.val
                        ? { borderColor: NAVY, background: "#EEF2FA" }
                        : { borderColor: "#E5E7EB" }}
                    >
                      <opt.Icon size={18} style={{ color: paymentMethod === opt.val ? NAVY : "#9CA3AF" }} />
                      <div className="text-sm font-bold mt-1.5" style={{ color: paymentMethod === opt.val ? NAVY : "#374151" }}>{opt.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Coupon */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-[#0A1628] mb-3">Have a coupon?</h3>
                <div className="flex gap-2">
                  <input
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                    placeholder="GOLINELESS10"
                    disabled={couponApplied}
                    className={`flex-1 ${inputClass}`}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponApplied}
                    className="px-4 py-3 rounded-xl text-white text-sm font-bold"
                    style={{ background: couponApplied ? "#22C55E" : NAVY_GRAD }}
                  >
                    {couponApplied ? "✓ Applied" : "Apply"}
                  </button>
                </div>
              </div>

              {/* Terms */}
              <label className="flex items-start gap-3 cursor-pointer bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 flex-shrink-0" style={{ accentColor: NAVY }} />
                <span className="text-xs text-gray-500 leading-relaxed">
                  I agree to Go LineLess's Terms of Service. I understand that the runner assists with queue, pickup, submission and support tasks. <strong className="text-gray-700">Go LineLess does not guarantee government approvals, medical decisions or bank outcomes.</strong>
                </span>
              </label>

              <button
                onClick={handleBook}
                disabled={createTask.isPending}
                className="w-full py-4 rounded-2xl text-white font-black text-base shadow-md hover:shadow-lg transition-all"
                style={{ background: NAVY_GRAD }}
              >
                {createTask.isPending ? "Confirming..." : `Confirm & Book · ${formatCurrency(total)}`}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Success modal */}
      <AnimatePresence>
        {bookedTask && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 flex items-end z-50 backdrop-blur-sm">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 25 }} className="bg-white w-full rounded-t-3xl p-8 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: GOLD_GRAD }}
              >
                <Sparkles size={32} className="text-white" />
              </motion.div>
              <h2 className="text-2xl font-black text-[#0A1628] mb-1">Request Confirmed!</h2>
              <p className="text-gray-500 text-sm mb-6">Your runner will be assigned shortly. Share this OTP when the task is complete.</p>
              <div className="rounded-2xl p-5 mb-5" style={{ background: "#EEF2FA" }}>
                <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Your completion OTP</p>
                <div className="flex gap-2 justify-center">
                  {(bookedTask.otp ?? "------").split("").map((d: string, i: number) => (
                    <div key={i} className="w-11 h-14 bg-white border-2 rounded-xl flex items-center justify-center text-xl font-black shadow-sm"
                      style={{ borderColor: NAVY, color: NAVY }}>{d}</div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-3">Share this only when the task is successfully completed</p>
              </div>
              <button
                onClick={() => navigate(`/app/tasks/${bookedTask.id}`)}
                className="w-full py-3.5 rounded-2xl text-white font-bold shadow-md"
                style={{ background: NAVY_GRAD }}
              >
                Track your runner →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
