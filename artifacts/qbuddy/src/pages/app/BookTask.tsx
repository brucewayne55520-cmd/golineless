import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Clock, Zap, MapPin, Sparkles, ArrowLeft, Shield, CheckCircle2, ChevronDown } from "lucide-react";
import { useCreateTask, useListAvailableRunners, usePricingPreview, type PricingResponse, type TaskInput, type PricingInput, type Task } from "@workspace/api-client-react";
import { CategoryIcon, CATEGORY_KEYS } from "@/components/CategoryIcon";
import { CATEGORY_NAMES, formatCurrency } from "@/lib/utils";
// [OFFLINE MODE] Online payment disabled for pilot — uncomment to re-enable Razorpay
// import { openRazorpayCheckout } from "@/lib/razorpay-checkout";
import { DARK, DARK_GRAD, BLUE, BLUE_GRAD, DARK_MUTED, DARK_MID, SURFACE_DIM } from "@/lib/theme";

const DISTANCE_CHARGES: Record<string, number> = { "0-2": 0, "2-5": 20, "5+": 50 };
const DISTANCE_LABELS: Record<string, string> = { "0-2": "0–2 km", "2-5": "2–5 km", "5+": "5+ km" };

const HUB_CATEGORIES: Record<string, string[]> = {
  healthcare: ["hospital","medicine"],
  documentation: ["document","govt_office"],
  banking: ["bank"],
  senior: ["senior_care","errand"],
  emergency: ["emergency"],
};

const HUB_NAMES: Record<string, string> = {
  healthcare: "Healthcare Assistance",
  documentation: "Documentation Help",
  banking: "Banking Assistance",
  senior: "Senior Care",
  emergency: "Emergency",
};

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
  const initialCategory = (() => {
    const cat = params.get("category");
    if (cat && CATEGORY_KEYS.includes(cat)) return cat;
    const hub = params.get("hub");
    if (hub && HUB_CATEGORIES[hub]?.length) return HUB_CATEGORIES[hub][0];
    return "hospital";
  })();
  const [category, setCategory] = useState(initialCategory);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [description, setDescription] = useState("");
  const [seniorInvolved, setSeniorInvolved] = useState(false);
  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");
  const [priorityLevel, setPriorityLevel] = useState<"normal" | "high" | "vip">("normal");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split("T")[0]);
  const [scheduledTime, setScheduledTime] = useState("10:00");
  const [locationName, setLocationName] = useState("");
  const [locationArea, setLocationArea] = useState("");
  const [distanceBand, setDistanceBand] = useState("0-2");
  // New dispatch fields
  const [pickupRequired, setPickupRequired] = useState(false);
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupArea, setPickupArea] = useState("");
  const [fromArea, setFromArea] = useState("");
  const [toArea, setToArea] = useState("");
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState(30);
  // Phase 7: Queue Intelligence V2 — expected token
  const [expectedTokenNumber, setExpectedTokenNumber] = useState("");
  const availableRunnersQuery = useListAvailableRunners({ query: { queryKey: ["availableRunners"], refetchInterval: 30000 } });
  const nearbyComrades = (availableRunnersQuery.data ?? []).slice(0, 5).map((r: Required<import("@workspace/api-client-react").AvailableRunner>) => ({ ...r, distanceKm: null }));
  // [OFFLINE MODE] All tasks default to cash — change to "online" to re-enable Razorpay
  const paymentMethod = "cash";
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [terms, setTerms] = useState(false);
  const [bookedTask, setBookedTask] = useState<import("@workspace/api-client-react").Task | null>(null);

  const createTask = useCreateTask({
    request: {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("golineless_user_token") || ""}`,
      },
    },
  });

  // [OFFLINE MODE] Razorpay checkout state — uncomment to re-enable online payments
  // const [paymentOrderInfo, setPaymentOrderInfo] = useState<{orderId: string; amount: number; currency: string; keyId: string} | null>(null);
  // const [paymentResult, setPaymentResult] = useState<"processing" | "success" | "failed" | "dismissed" | null>(null);

  // Phase 7.2: Pricing Authority — use backend as single source of truth
  const [backendPrice, setBackendPrice] = useState<{
    price: number;
    originalPrice: number;
    discountAmount: number;
    breakdown: { basePrice: number; distanceCharge: number; urgencyCharge: number; priorityFee: number; runnerEarning: number; platformFee: number };
  } | null>(null);
  const pricingPreview = usePricingPreview();

  useEffect(() => {
    const timer = setTimeout(() => {
      pricingPreview.mutate({
        data: {
          category,
          distanceBand,
          urgency,
          priorityLevel,
          couponCode: couponApplied ? coupon : undefined,
        } as PricingInput,
      }, {          onSuccess: (data: PricingResponse) => setBackendPrice(data as unknown as NonNullable<typeof backendPrice>),
        onError: () => setBackendPrice(null),
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [category, distanceBand, urgency, priorityLevel, couponApplied, coupon]);

  // C5: ONLY use authoritative backend price. Backend already returns final price (after discount).
  const displayTotal = backendPrice != null ? backendPrice.price : null;
  const displayRunnerEarning = backendPrice?.breakdown?.runnerEarning ?? null;

  const handleApplyCoupon = () => {
    if (coupon.toUpperCase() === "GOLINELESS10") {
      setCouponApplied(true);
      toast.success("Coupon applied — 10% off!");
    } else {
      toast.error("Invalid coupon code");
    }
  };

  // [OFFLINE MODE] Online payment processing — uncomment to re-enable Razorpay checkout
  // const processPayment = async (paymentOrder?: { orderId: string; amount: number; currency: string; keyId: string }) => {
  //   const po = paymentOrder ?? paymentOrderInfo;
  //   if (!po) return;
  //   if (paymentOrder) setPaymentOrderInfo({ orderId: po.orderId, amount: po.amount, currency: po.currency, keyId: po.keyId });
  //   setPaymentResult("processing");
  //   try {
  //     const result = await openRazorpayCheckout({
  //       orderId: po.orderId,
  //       amount: po.amount,
  //       currency: po.currency || "INR",
  //       keyId: po.keyId,
  //       description: `${category} task`,
  //       phone: localStorage.getItem("golineless_user_phone") || undefined,
  //     });
  //     if (result.status === "success") {
  //       setPaymentResult("success");
  //       confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: [DARK, BLUE, DARK_MID] });
  //     } else if (result.status === "failed") {
  //       setPaymentResult("failed");
  //       toast.error(`Payment failed: ${result.error.description}`);
  //     } else {
  //       setPaymentResult("dismissed");
  //       if (!paymentOrder) toast.message("Payment window closed. You can retry or pay later when the task is completed.");
  //     }
  //   } catch (err) {
  //     setPaymentResult("failed");
  //     toast.error(err instanceof Error ? err.message : "Payment processing error. Please try again.");
  //   }
  // };

  const handleBook = () => {
    if (!terms) { toast.error("Please accept the terms to continue"); return; }
    // Haptic feedback on confirm (#96)
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
    createTask.mutate({
      data: {
        category, description, urgency, priorityLevel, locationName, locationArea, locationCity: "Ahmedabad",
        distanceBand, scheduledDate, scheduledTime, paymentMethod,
        couponCode: couponApplied ? coupon : undefined,
        seniorInvolved, specialInstructions,
        pickupRequired, pickupAddress, pickupArea,
        fromArea, toArea, estimatedDurationMinutes,
        expectedTokenNumber: expectedTokenNumber || undefined,
      } as TaskInput,
    }, {
      onSuccess: (data: Task & { paymentOrder?: { orderId: string; amount: number; currency: string; keyId: string } }) => {
        setBookedTask(data);
        // [OFFLINE MODE] Skip Razorpay checkout — tasks are cash-on-completion
        // Uncomment below to re-enable online payment flow:
        // const po = data.paymentOrder;
        // if (po?.orderId && po?.keyId) {
        //   processPayment(po);
        // } else {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: [DARK, BLUE, DARK_MID] });
        // }
      },
      onError: (err: unknown) => {
        // ApiError stores parsed JSON body in err.data
        const errAny = err as { data?: { detail?: string; error?: string }; message?: string };
        const detail = errAny?.data?.detail || errAny?.data?.error || "";
        const msg = detail ? `${detail}` : (errAny?.message || "Booking failed. Please try again.");
        toast.error(msg);
      },
    });
  };

  const timeSlots = Array.from({ length: 24 }, (_, h) =>
    ["00", "30"].map((m) => `${String(h).padStart(2, "0")}:${m}`)
  ).flat();

  const inputClass = "w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent transition-all bg-white";
  const sit = LIFE_SITUATIONS[category] ?? { label: CATEGORY_NAMES[category], desc: "" };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate("/app/home")} className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1">
            <h1 className="font-black text-gray-900 text-base">Request Assistance</h1>
            <p className="text-xs text-gray-400">{STEP_LABELS[step - 1]}</p>
          </div>
          <span className="text-xs font-bold px-2 py-1 rounded-lg text-gray-500 bg-gray-50 border border-gray-100">{step}/3</span>
        </div>
        {/* Progress bar */}
        <div className="flex gap-1.5">
          {[1, 2, 3].map(s => (
            <div key={s} className="h-1.5 flex-1 rounded-full transition-all duration-500"
              style={s <= step ? { background: BLUE_GRAD } : { background: "#E5E7EB" }} />
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
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #EEF2FA, #D9E3F5)", color: DARK }}>
                    <CategoryIcon category={category} size={26} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Selected service</p>
                    <h2 className="font-black text-gray-900 text-base">{sit.label}</h2>
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
                          style={category === cat ? { borderColor: DARK, background: "#EEF2FA" } : { borderColor: SURFACE_DIM }}
                        >
                          <div style={{ color: category === cat ? DARK : "#9CA3AF" }}>
                            <CategoryIcon category={cat} size={18} />
                          </div>
                          <span className="text-xs font-semibold" style={{ color: category === cat ? DARK : "#374151" }}>{s.label}</span>
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
                  style={{ "--tw-ring-color": DARK } as React.CSSProperties}
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
                      onClick={() => setUrgency(opt.val as "normal" | "urgent")}
                      className="p-4 rounded-xl border-2 text-left transition-all"
                      style={urgency === opt.val ? { borderColor: DARK, background: "#EEF2FA" } : { borderColor: "#E5E7EB" }}
                    >
                      <opt.Icon size={18} style={{ color: urgency === opt.val ? DARK : "#9CA3AF" }} />
                      <div className="text-sm font-bold mt-1.5" style={{ color: urgency === opt.val ? DARK : "#374151" }}>{opt.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5 leading-tight">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* H11: Priority Level selector */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <label className="text-sm font-bold text-gray-700 mb-3 block">Priority Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { val: "normal" as const, label: "Standard", sub: "No extra fee" },
                    { val: "high" as const, label: "High", sub: `+Rs ${backendPrice?.breakdown?.priorityFee ?? 30}` },
                    { val: "vip" as const, label: "VIP", sub: `+Rs ${backendPrice?.breakdown?.priorityFee ?? 60}` },
                  ]).map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => {
                        setPriorityLevel(opt.val);
                        if (opt.val === "vip") setUrgency("urgent");
                        else if (urgency === "urgent" && opt.val === "normal") setUrgency("normal");
                      }}
                      className="p-3 rounded-xl border-2 text-left transition-all"
                      style={priorityLevel === opt.val ? { borderColor: DARK, background: "#EEF2FA" } : { borderColor: "#E5E7EB" }}
                    >
                      <div className="text-sm font-bold" style={{ color: priorityLevel === opt.val ? DARK : "#374151" }}>{opt.label}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{opt.sub}</div>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-2">Priority level determines dispatch urgency and pricing</p>
              </div>

              {/* Senior toggle */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    onClick={() => setSeniorInvolved(!seniorInvolved)}
                    className="w-12 h-6 rounded-full transition-colors relative flex-shrink-0"
                    style={{ background: seniorInvolved ? DARK : "#E5E7EB" }}
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
                style={{ background: BLUE_GRAD, color: DARK }}
              >
                Next: When &amp; Where →
              </button>
            </motion.div>
          )}

          {/* ── Step 2: When & Where ── */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-black text-gray-900 mb-4">When do you need the runner?</h3>
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
                <h3 className="font-black text-gray-900 mb-4">Where should the runner go?</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Place name</label>
                    <input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="E.g. Civil Hospital, Sector 21 Gandhinagar..." className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Task Area / Locality</label>
                    <input value={locationArea} onChange={(e) => setLocationArea(e.target.value)} placeholder="E.g. Navrangpura, Bopal, Satellite..." className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">City</label>
                    <input value="Ahmedabad" readOnly className="w-full border border-gray-100 rounded-xl px-3.5 py-3 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
                  </div>
                </div>
              </div>

              {/* From/To Area */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-black text-gray-900 mb-1">From → To</h3>
                <p className="text-xs text-gray-400 mb-3">Help the Comrade know the route</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">From Area</label>
                    <input value={fromArea} onChange={(e) => setFromArea(e.target.value)} placeholder="E.g. Bopal, Satellite" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">To Area</label>
                    <input value={toArea} onChange={(e) => setToArea(e.target.value)} placeholder="E.g. SG Highway, Navrangpura" className={inputClass} />
                  </div>
                </div>
              </div>

              {/* Pickup Required */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    onClick={() => setPickupRequired(!pickupRequired)}
                    className="w-12 h-6 rounded-full transition-colors relative flex-shrink-0"
                    style={{ background: pickupRequired ? DARK : "#E5E7EB" }}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${pickupRequired ? "translate-x-6" : "translate-x-0.5"}`} />
                  </button>
                  <div>
                    <span className="text-sm font-semibold text-gray-700">Pickup required?</span>
                    <p className="text-xs text-gray-400 mt-0.5">Comrade should first go collect something from another location</p>
                  </div>
                </label>
                {pickupRequired && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Pickup Address</label>
                      <input value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} placeholder="Pickup location address..." className={inputClass} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Pickup Area</label>
                      <input value={pickupArea} onChange={(e) => setPickupArea(e.target.value)} placeholder="E.g. CG Road, Ashram Road..." className={inputClass} />
                    </div>
                  </div>
                )}
              </div>

              {/* Estimated Duration */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-black text-gray-900 mb-1">Estimated Duration</h3>
                <p className="text-xs text-gray-400 mb-3">How long do you think this task will take?</p>
                <div className="flex gap-2">
                  {[15, 30, 45, 60, 90, 120].map(mins => (
                    <button
                      key={mins}
                      onClick={() => setEstimatedDurationMinutes(mins)}
                      className={`py-2 px-3 rounded-xl border-2 text-xs font-bold transition-all`}
                      style={estimatedDurationMinutes === mins
                        ? { borderColor: DARK, background: "#EEF2FA", color: DARK }
                        : { borderColor: "#E5E7EB", color: DARK_MUTED }}
                    >
                      {mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-black text-gray-900 mb-1">Approx. distance from you</h3>
                <p className="text-xs text-gray-400 mb-3">Used to calculate travel charges</p>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(DISTANCE_LABELS).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setDistanceBand(val)}
                      className="py-3 rounded-xl border-2 text-sm font-bold transition-all"
                      style={distanceBand === val
                        ? { borderColor: DARK, background: "#EEF2FA", color: DARK }
                        : { borderColor: "#E5E7EB", color: DARK_MUTED }}
                    >
                      {label}
                      <div className="text-xs font-normal mt-0.5" style={{ color: distanceBand === val ? DARK : "#9CA3AF" }}>
                        {DISTANCE_CHARGES[val] === 0 ? "Free" : `+Rs ${DISTANCE_CHARGES[val]}`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl h-32 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <MapPin size={24} className="mx-auto mb-1" style={{ color: DARK + "60" }} />
                  <div className="text-sm font-medium text-gray-500">Ahmedabad, Gujarat</div>
                  <div className="text-xs text-gray-400">Service area · Pilot zone</div>
                </div>
              </div>

              <button
                onClick={() => {
                  // Fix #47: Validate location fields before proceeding
                  if (!locationName.trim() && !locationArea.trim()) {
                    toast.error("Please enter a location name or area so the Comrade knows where to go");
                    return;
                  }
                  // M14: Validate scheduled date is not in the past
                  const selectedDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
                  if (selectedDateTime < new Date()) {
                    toast.error("Please select a future date and time");
                    return;
                  }
                  // Haptic feedback (#96)
                  if (navigator.vibrate) navigator.vibrate(50);
                  setStep(3);
                }}
                className="w-full py-4 rounded-2xl font-black text-base shadow-md hover:shadow-lg transition-all"
                style={{ background: BLUE_GRAD, color: DARK }}
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
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#EEF2FA", color: DARK }}>
                    <CategoryIcon category={category} size={22} />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900">{LIFE_SITUATIONS[category]?.label ?? CATEGORY_NAMES[category]}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{scheduledDate} · {scheduledTime} · {locationArea || "Ahmedabad"}</p>
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 mb-3">Estimated Price</h3>
                <p className="text-[10px] text-gray-400 mb-3">Final price confirmed after booking · May vary based on urgency &amp; priority</p>
                {pricingPreview.isPending && (
                  <div className="text-center py-2">
                    <div className="inline-block w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${DARK}40`, borderTopColor: DARK }} />
                  </div>
                )}
                <div className="space-y-2.5 text-sm">
                  {backendPrice?.breakdown ? [
                    { label: `Base service fee`, val: backendPrice.breakdown.basePrice },
                    { label: `Distance (${DISTANCE_LABELS[distanceBand]})`, val: backendPrice.breakdown.distanceCharge },
                    { label: `${urgency === "urgent" ? "Urgent priority fee" : "Standard scheduling"}`, val: backendPrice.breakdown.urgencyCharge },
                    { label: "Priority fee", val: backendPrice.breakdown.priorityFee },
                    ...(backendPrice.discountAmount > 0 ? [{ label: "Coupon discount (10%)", val: -backendPrice.discountAmount }] : []),
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between">
                      <span className="text-gray-500">{row.label}</span>
                      <span className={`font-medium ${row.val < 0 ? "text-green-600" : "text-gray-700"}`}>
                        {row.val < 0 ? "−" : ""}Rs {Math.abs(row.val)}
                      </span>
                    </div>
                  )) : pricingPreview.isPending ? null : (
                    <p className="text-xs text-gray-400 text-center py-2">Loading price from server...</p>
                  )}
                  <div className="border-t border-gray-100 pt-3 flex justify-between font-black text-gray-900 text-lg">
                    <span>{displayTotal != null ? "Total" : ""}</span>
                    <span style={{ color: DARK }}>{displayTotal != null ? formatCurrency(displayTotal) : "—"}</span>
                  </div>
                  {displayRunnerEarning != null && (
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Runner earns (70%)</span>
                      <span className="font-semibold">{formatCurrency(displayRunnerEarning)}</span>
                    </div>
                  )}
                  {backendPrice && (
                    <p className="text-[9px] text-green-600 text-center mt-1">✓ Price confirmed by backend</p>
                  )}
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
                    <b.Icon size={16} className="mx-auto mb-1" style={{ color: BLUE }} />
                    <p className="text-[9px] font-semibold text-gray-500 leading-tight whitespace-pre-line">{b.label}</p>
                  </div>
                ))}
              </div>

              {/* [OFFLINE MODE] Payment — cash on completion, no online payment needed */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-3">Payment Method</h3>
                <div className="p-4 rounded-xl border-2 bg-green-50/50" style={{ borderColor: "#22C55E40" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}>
                      <CheckCircle2 size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: "#16A34A" }}>Pay Cash on Completion</p>
                      <p className="text-xs text-gray-400 mt-0.5">No online payment needed — pay your Comrade directly</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Phase 7: Expected Token Number for Queue Categories */}
              {["hospital","bank","govt_office"].includes(category) && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-1">Queue Information</h3>
                  <p className="text-xs text-gray-400 mb-3">If you already know your token number, enter it to help your Comrade track queue progress</p>
                  <input
                    value={expectedTokenNumber}
                    onChange={(e) => setExpectedTokenNumber(e.target.value)}
                    placeholder="Expected token number (e.g. 42)"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent transition-all bg-white"
                    inputMode="numeric"
                  />
                  {expectedTokenNumber && (
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Comrade will track queue and update progress automatically
                    </p>
                  )}
                </div>
              )}

              {/* Phase 7: Nearby Comrades Preview */}
              {nearbyComrades.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-1 text-sm flex items-center gap-1"><MapPin size={14} /> Nearby Available Comrades</h3>
                  <p className="text-xs text-gray-400 mb-3">These comrades are available near the task area</p>
                  <div className="space-y-2">
                    {(nearbyComrades ?? []).slice(0, 3).map((c: Required<import("@workspace/api-client-react").NearbyRunner>) => (
                      <div key={c.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: `linear-gradient(135deg, ${DARK}, #1E293B)` }}>
                          {c.name?.[0] ?? "C"}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900">{c.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            {c.rating && <span>★ {Number(c.rating).toFixed(1)}</span>}
                            <span>Trust {c.trustScore}</span>
                            {c.tasksCompleted > 0 && <span>{c.tasksCompleted} tasks</span>}
                            {c.distanceKm != null && <span>📍 {c.distanceKm} km</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coupon */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-3">Have a coupon?</h3>
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
                    style={{ background: couponApplied ? "#22C55E" : DARK_GRAD }}
                  >
                    {couponApplied ? "✓ Applied" : "Apply"}
                  </button>
                </div>
              </div>

              {/* Terms */}
              <label className="flex items-start gap-3 cursor-pointer bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 flex-shrink-0" style={{ accentColor: DARK }} />
                <span className="text-xs text-gray-500 leading-relaxed">
                  I agree to Go LineLess's Terms of Service. I understand that the runner assists with queue, pickup, submission and support tasks. <strong className="text-gray-700">Go LineLess does not guarantee government approvals, medical decisions or bank outcomes.</strong>
                </span>
              </label>

              <button
                onClick={handleBook}
                disabled={createTask.isPending || displayTotal == null}
                className="w-full py-4 rounded-2xl text-white font-black text-base shadow-md hover:shadow-lg transition-all"
                style={{ background: (createTask.isPending || displayTotal == null) ? DARK_MUTED : DARK_GRAD }}
              >
                {createTask.isPending ? "Confirming..." : displayTotal == null ? "Calculating price..." : `Confirm & Book · ${formatCurrency(displayTotal)}`}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* [OFFLINE MODE] Success modal — cash on completion, no Razorpay needed */}
      {/* To re-enable online payment modal, uncomment the original version below */}
      <AnimatePresence>
        {bookedTask && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 flex items-end z-50 backdrop-blur-sm">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 25 }} className="bg-white w-full rounded-t-3xl p-8 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: BLUE_GRAD }}
              >
                <Sparkles size={32} className="text-white" />
              </motion.div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">Request Confirmed!</h2>
              <p className="text-gray-500 text-sm mb-6">
                Your runner will be assigned shortly. You'll get the completion OTP from your runner when the task is done.
                <br /><br />
                <strong style={{ color: DARK }}>Pay your Comrade directly — cash on completion.</strong>
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate(`/app/tasks/${bookedTask.id}`)}
                  className="w-full py-3.5 rounded-2xl text-white font-bold shadow-md hover:shadow-lg transition-all"
                  style={{ background: DARK_GRAD }}
                >
                  Track your runner →
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
