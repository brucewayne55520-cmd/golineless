import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone, PersonStanding, CheckCircle2, Star, MapPin, HeartHandshake,
  ShieldCheck, Camera, KeyRound, CreditCard, ChevronDown, ChevronUp,
  Clock, Zap, PhoneCall
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { CategoryIcon, CATEGORY_KEYS } from "@/components/CategoryIcon";
import { CATEGORY_NAMES, CATEGORY_PRICES, CATEGORY_HINDI } from "@/lib/utils";
import { NAVY, NAVY_GRAD, GOLD, GOLD_GRAD, TEAL } from "@/lib/theme";

function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{ background: NAVY_GRAD }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 14 }}
        className="flex flex-col items-center"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-4 shadow-2xl mb-5"
        >
          <img src="/logo.jpg" alt="Go LineLess" className="h-20 w-auto" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-white/70 text-sm tracking-[0.2em] uppercase font-medium"
        >
          Life Without Waiting
        </motion.p>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1.0, duration: 0.8 }}
          className="h-0.5 w-32 mt-3 rounded-full"
          style={{ background: GOLD_GRAD }}
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="text-white/40 text-xs mt-3 font-medium"
        >
          India's offline assistance network
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

const steps = [
  { Icon: Smartphone, title: "Book in 60 seconds", desc: "Select category, describe your task, set date & time" },
  { Icon: PersonStanding, title: "Comrade assigned instantly", desc: "KYC-verified local Comrade picks up your task" },
  { Icon: CheckCircle2, title: "Track live. Task done.", desc: "Photo proof + OTP completion — no guesswork" },
];

const trustFeatures = [
  { Icon: ShieldCheck, title: "KYC Verified Comrades", desc: "Every Comrade passes Aadhaar & selfie verification before going live" },
  { Icon: MapPin, title: "Live GPS Tracking", desc: "See your Comrade on the map in real time" },
  { Icon: Camera, title: "Photo Proof", desc: "Comrades upload visual proof on task completion" },
  { Icon: KeyRound, title: "OTP Completion", desc: "6-digit OTP ensures only you can mark a task done" },
  { Icon: CreditCard, title: "Secure Payments", desc: "Pay cash on completion — simple and transparent" },
  { Icon: HeartHandshake, title: "Senior Care Support", desc: "Specialist Comrades trained to assist elderly with patience" },
];

const testimonials = [
  { name: "Priya", city: "Ahmedabad", text: "Saved me hours at the passport office. The runner was incredibly professional — exactly what I needed.", rating: 5 },
  { name: "Ankit", city: "USA → Ahmedabad", text: "My parents are in Ahmedabad, I'm in the US. Go LineLess handles all their errands. Absolute peace of mind.", rating: 5 },
  { name: "Sunita", city: "Ahmedabad", text: "Used it for bank work multiple times now. Always on time, always reliable.", rating: 5 },
];

const faqs = [
  { q: "How does Go LineLess work?", a: "You book a task in under 60 seconds, a verified runner is assigned, they complete the task, upload photo proof, and you confirm with a 6-digit OTP. Simple." },
  { q: "Are the Comrades trustworthy?", a: "Every Comrade undergoes Aadhaar verification, selfie check, and background screening before they can accept tasks. You also see their rating and reviews." },
  { q: "What if the Comrade cannot complete the task?", a: "Go LineLess assists with queue, pickup, submission and support tasks. We do not guarantee government approvals, medical decisions, or bank decisions. If a task cannot be completed, you are refunded." },
  { q: "Is Go LineLess available outside Ahmedabad?", a: "We're currently in a pilot launch phase in Ahmedabad and actively expanding. Sign up to get notified when we reach your city." },
  { q: "Can I schedule a task for later?", a: "Yes. Pick any future date and time when booking. Great for early morning hospital queues or same-day bank visits." },
  { q: "How much does it cost?", a: "Pricing starts from Rs 89 for errands and goes up by category, distance band, and urgency. You see the full breakdown before confirming." },
];

export default function Landing() {
  const [showSplash, setShowSplash] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [, navigate] = useLocation();
  const { token, role } = useAuth();

  useEffect(() => {
    if (!showSplash) {
      if (token && role === "user") navigate("/app/home");
      if (token && role === "runner") navigate("/runner/feed");
    }
  }, [showSplash, token, role, navigate]);

  return (
    <>
      <AnimatePresence>
        {showSplash && <Splash onDone={() => setShowSplash(false)} />}
      </AnimatePresence>

      {!showSplash && (
        <div className="min-h-screen" style={{ background: "#FAF7F2" }}>
          {/* ═══ NAVBAR ═══ */}
          <nav className="sticky top-0 z-40 border-b border-[#0A1628]/[0.06]" style={{ background: "rgba(250, 247, 242, 0.85)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
            <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
              <img src="/logo.jpg" alt="Go LineLess" className="h-9 w-auto" />
              <div className="hidden md:flex gap-6 text-[13px] font-medium text-[#0A1628]/50">
                <a href="#how" className="hover:text-[#0A1628] transition-colors duration-150">How it Works</a>
                <a href="#services" className="hover:text-[#0A1628] transition-colors duration-150">Services</a>
                <a href="#trust" className="hover:text-[#0A1628] transition-colors duration-150">Trust & Safety</a>
                <a href="#senior" className="hover:text-[#0A1628] transition-colors duration-150">Senior Care</a>
                <a href="#pricing" className="hover:text-[#0A1628] transition-colors duration-150">Pricing</a>
              </div>
              <button
                onClick={() => navigate("/login")}
                className="px-5 py-2.5 rounded-xl text-[#0A1628] text-sm font-bold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: GOLD_GRAD }}
              >
                Book a Runner
              </button>
            </div>
          </nav>

          {/* ═══ HERO ═══ */}
          <section className="relative overflow-hidden pt-20 pb-24 px-6" style={{ background: "linear-gradient(135deg, #F0EDE6 0%, #FAF7F2 50%, #F5F0E8 100%)" }}>
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-14 items-center">
              <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#0A1628]/[0.08] rounded-full text-xs font-semibold text-[#0A1628] mb-5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Pilot Launching in Ahmedabad
                </span>
                <h1 className="text-5xl md:text-6xl font-extrabold text-[#0A1628] leading-[1.05] mb-3 tracking-tight">
                  Life without
                  <br />
                  <span className="gl-text-gradient-gold">waiting.</span>
                </h1>
                <p className="text-[#0A1628]/50 text-lg mb-8 leading-relaxed max-w-md">
                  Book verified human assistants for hospital queues, reports, medicine pickup, bank visits, documentation, senior care and real-world errands — with live tracking, photo proof and OTP completion.
                </p>
                <div className="flex gap-4 flex-wrap">
                  <button
                    onClick={() => navigate("/login")}
                    className="px-8 py-4 rounded-2xl text-[#0A1628] font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: GOLD_GRAD }}
                  >
                    Book a Comrade
                  </button>
                  <button
                    onClick={() => navigate("/runner/login")}
                    className="px-8 py-4 rounded-2xl font-bold text-lg border-2 hover:bg-[#0A1628]/[0.03] transition-all duration-200"
                    style={{ borderColor: NAVY, color: NAVY }}
                  >
                    Become a Comrade
                  </button>
                </div>
                <p className="mt-5 text-xs text-[#0A1628]/30 max-w-sm">
                  Go LineLess assists with queue, pickup, submission and support tasks. We do not guarantee government approvals, medical decisions or bank outcomes.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="hidden md:flex items-center justify-center"
              >
                <div className="relative">
                  <div className="w-72 h-72 rounded-full opacity-[0.07] absolute inset-0" style={{ background: `radial-gradient(circle, ${NAVY}, transparent)` }} />
                  <div className="relative bg-white rounded-3xl p-8 shadow-2xl border border-[#0A1628]/[0.06] w-72">
                    <img src="/logo.jpg" alt="Go LineLess" className="w-full h-auto mb-4" />
                    <div className="space-y-2">
                      {[
                        { label: "Runner assigned", color: "#16A34A" },
                        { label: "On the way · 8 min", color: GOLD },
                        { label: "OTP: 4 8 2 9 1 7", color: NAVY },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2 bg-[#FAF7F2] rounded-xl px-3 py-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                          <span className="text-xs font-semibold text-[#0A1628]/70">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* ═══ HOW IT WORKS ═══ */}
          <section id="how" className="py-20 px-6 bg-white">
            <div className="max-w-4xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
                <p className="text-xs font-bold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>Simple Process</p>
                <h2 className="text-3xl font-extrabold text-[#0A1628] mb-3 tracking-tight">How it works</h2>
                <p className="text-[#0A1628]/40">Three steps. No fuss. Task done.</p>
              </motion.div>
              <div className="grid md:grid-cols-3 gap-8">
                {steps.map((step, i) => (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                    className="text-center bg-white rounded-2xl p-8 border border-[#0A1628]/[0.05] hover:shadow-xl transition-shadow duration-300"
                    style={{ boxShadow: "0 1px 3px rgba(10, 22, 40, 0.04)" }}
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #F0EDE6, #E8E3DA)" }}>
                      <step.Icon size={28} style={{ color: NAVY }} />
                    </div>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-3 text-[#0A1628]" style={{ background: GOLD_GRAD }}>
                      {i + 1}
                    </div>
                    <h3 className="font-bold text-[#0A1628] mb-2">{step.title}</h3>
                    <p className="text-[#0A1628]/45 text-sm">{step.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ SERVICES ═══ */}
          <section id="services" className="py-20 px-6" style={{ background: "linear-gradient(180deg, #FAF7F2 0%, #F0EDE6 100%)" }}>
            <div className="max-w-4xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
                <p className="text-xs font-bold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>What We Do</p>
                <h2 className="text-3xl font-extrabold text-[#0A1628] mb-3 tracking-tight">Our Services</h2>
                <p className="text-[#0A1628]/40">Whatever the real-world task, we have a verified runner for it</p>
              </motion.div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {CATEGORY_KEYS.map((cat, i) => (
                  <motion.div
                    key={cat}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                    onClick={() => navigate(`/login?category=${cat}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/login?category=${cat}`); }}
                    aria-label={`Book a ${CATEGORY_NAMES[cat]} task — from Rs ${CATEGORY_PRICES[cat]}`}
                    className="cursor-pointer bg-white hover:shadow-xl rounded-2xl p-5 text-center transition-all duration-200 hover:-translate-y-1 border border-[#0A1628]/[0.05]"
                    style={{ boxShadow: "0 1px 3px rgba(10, 22, 40, 0.04)" }}
                  >
                    <div className="flex justify-center mb-3" style={{ color: NAVY }}>
                      <CategoryIcon category={cat} size={36} />
                    </div>
                    <div className="font-semibold text-[#0A1628] text-sm">{CATEGORY_NAMES[cat]}</div>
                    <div className="text-[#0A1628]/35 mt-0.5">{CATEGORY_HINDI[cat]}</div>
                    <div className="text-xs font-bold mt-2" style={{ color: GOLD }}>from Rs {CATEGORY_PRICES[cat]}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ TRUST & SAFETY ═══ */}
          <section id="trust" className="py-20 px-6 bg-white">
            <div className="max-w-5xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
                <p className="text-xs font-bold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>Built for Trust</p>
                <h2 className="text-3xl font-extrabold text-[#0A1628] mb-3 tracking-tight">Trust & Safety</h2>
                <p className="text-[#0A1628]/40">Built for families, elders, and people who deserve real-world reliability</p>
              </motion.div>
              <div className="grid md:grid-cols-3 gap-6">
                {trustFeatures.map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="bg-white rounded-2xl p-6 border border-[#0A1628]/[0.05] hover:shadow-lg transition-all duration-200"
                    style={{ boxShadow: "0 1px 3px rgba(10, 22, 40, 0.03)" }}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg, #F0EDE6, #E8E3DA)" }}>
                      <item.Icon size={22} style={{ color: NAVY }} />
                    </div>
                    <h3 className="font-bold text-[#0A1628] mb-1">{item.title}</h3>
                    <p className="text-[#0A1628]/45 text-sm">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ SENIOR CARE ═══ */}
          <section id="senior" className="py-20 px-6" style={{ background: "linear-gradient(180deg, #FAF7F2 0%, #F0EDE6 100%)" }}>
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-3xl p-10 md:p-14 text-white relative overflow-hidden"
                style={{ background: NAVY_GRAD, boxShadow: "0 25px 50px -12px rgba(10, 22, 40, 0.3)" }}
              >
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: `radial-gradient(circle, ${GOLD}, transparent)`, transform: "translate(30%, -30%)" }} />
                <div className="relative z-10 text-center">
                  <HeartHandshake size={48} className="mx-auto mb-5 opacity-90" style={{ color: GOLD }} />
                  <h2 className="text-3xl font-extrabold mb-3 tracking-tight">Senior Care Plans</h2>
                  <p className="text-white/60 mb-1">Premium subscription plans for elderly assistance.</p>
                  <p className="text-white/35 text-sm mb-8">Preferred by NRI families in USA, UK, UAE & beyond</p>
                  <div className="grid md:grid-cols-3 gap-4 mb-8">
                    {[
                      { plan: "Basic Care", features: ["4 tasks/month", "Hospital companion", "Medicine pickup"] },
                      { plan: "Plus Care", features: ["8 tasks/month", "Bank & document help", "Family updates"] },
                      { plan: "Premium Care", features: ["Unlimited tasks", "Priority runner", "24/7 support"] },
                    ].map((p) => (
                      <div key={p.plan} className="bg-white/[0.08] border border-white/[0.12] rounded-2xl p-5 text-left backdrop-blur-sm">
                        <h4 className="font-bold text-white mb-3">{p.plan}</h4>
                        <ul className="space-y-1.5">
                          {p.features.map(f => (
                            <li key={f} className="text-white/50 text-xs flex items-center gap-2">
                              <span style={{ color: GOLD }}>✓</span> {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => navigate("/login")}
                    className="px-8 py-3.5 rounded-2xl font-bold text-[#0A1628] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                    style={{ background: GOLD_GRAD }}
                  >
                    View Senior Plans
                  </button>
                </div>
              </motion.div>
            </div>
          </section>

          {/* ═══ PRICING ═══ */}
          <section id="pricing" className="py-20 px-6 bg-white">
            <div className="max-w-3xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
                <p className="text-xs font-bold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>No Surprises</p>
                <h2 className="text-3xl font-extrabold text-[#0A1628] mb-3 tracking-tight">Transparent Pricing</h2>
                <p className="text-[#0A1628]/40">No hidden fees. Full price breakdown before you confirm.</p>
              </motion.div>
              <div className="bg-white rounded-2xl border border-[#0A1628]/[0.06] overflow-hidden" style={{ boxShadow: "0 4px 6px -1px rgba(10, 22, 40, 0.06)" }}>
                <div className="px-6 py-4 border-b border-[#0A1628]/[0.06] text-[13px] font-semibold text-[#0A1628]/40 grid grid-cols-3">
                  <span>Service</span><span className="text-center">Base Price</span><span className="text-right">Starting from</span>
                </div>
                {CATEGORY_KEYS.map((cat) => (
                  <div key={cat} className="px-6 py-3.5 grid grid-cols-3 border-b border-[#0A1628]/[0.03] last:border-0 hover:bg-[#FAF7F2] transition-colors duration-150">
                    <div className="flex items-center gap-2 text-sm font-medium text-[#0A1628]">
                      <span style={{ color: NAVY }}><CategoryIcon category={cat} size={16} /></span>
                      {CATEGORY_NAMES[cat]}
                    </div>
                    <div className="text-center text-sm text-[#0A1628]/40">+ distance + urgency</div>
                    <div className="text-right text-sm font-bold" style={{ color: GOLD }}>Rs {CATEGORY_PRICES[cat]}</div>
                  </div>
                ))}
                <div className="px-6 py-4 bg-[#FAF7F2] text-xs text-[#0A1628]/35">
                  Distance surcharge: +Rs 0 (0–2 km) · +Rs 20 (2–5 km) · +Rs 50 (5+ km) · Urgent +Rs 50
                </div>
              </div>
            </div>
          </section>

          {/* ═══ BECOME A RUNNER ═══ */}
          <section className="py-20 px-6" style={{ background: "linear-gradient(180deg, #FAF7F2 0%, #F0EDE6 100%)" }}>
            <div className="max-w-4xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
                <p className="text-xs font-bold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>Join Our Team</p>
                <h2 className="text-3xl font-extrabold text-[#0A1628] mb-3 tracking-tight">Earn competitive earnings</h2>
                <p className="text-[#0A1628]/40 mb-8 max-w-md mx-auto">Be your own boss. Set your hours. Go LineLess Comrades earn competitive earnings — with meaningful work that helps real people.</p>
                <div className="grid md:grid-cols-3 gap-4 mb-10 max-w-2xl mx-auto">
                  {[
                    { Icon: Clock, title: "Flexible Hours", desc: "Go online when you want" },
                    { Icon: Zap, title: "Instant Tasks", desc: "Tasks appear in real time" },
                    { Icon: PhoneCall, title: "Runner Support", desc: "We're always here for you" },
                  ].map((item) => (
                    <div key={item.title} className="bg-white rounded-2xl p-5 border border-[#0A1628]/[0.05]" style={{ boxShadow: "0 1px 3px rgba(10, 22, 40, 0.04)" }}>
                      <item.Icon size={22} className="mb-2" style={{ color: NAVY }} />
                      <h4 className="font-bold text-[#0A1628] text-sm">{item.title}</h4>
                      <p className="text-[#0A1628]/40 text-xs mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate("/runner/login")}
                  className="px-8 py-4 rounded-2xl text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: NAVY_GRAD }}
                >
                  Join as a Comrade
                </button>
              </motion.div>
            </div>
          </section>

          {/* ═══ TESTIMONIALS ═══ */}
          <section className="py-20 px-6 bg-white">
            <div className="max-w-4xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
                <p className="text-xs font-bold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>Real Feedback</p>
                <h2 className="text-3xl font-extrabold text-[#0A1628] tracking-tight">What pilot users say</h2>
              </motion.div>
              <div className="grid md:grid-cols-3 gap-6">
                {testimonials.map((t, i) => (
                  <motion.div
                    key={t.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="bg-white rounded-2xl p-6 border border-[#0A1628]/[0.05]"
                    style={{ boxShadow: "0 1px 3px rgba(10, 22, 40, 0.04)" }}
                  >
                    <div className="flex gap-1 mb-3">
                      {Array.from({ length: t.rating }).map((_, j) => (
                        <Star key={j} size={16} className="text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <p className="text-[#0A1628]/60 text-sm mb-4 leading-relaxed">"{t.text}"</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: NAVY_GRAD }}>
                        {t.name[0]}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#0A1628]">{t.name}</div>
                        <div className="text-xs text-[#0A1628]/35">{t.city}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ FAQ ═══ */}
          <section className="py-20 px-6" style={{ background: "linear-gradient(180deg, #FAF7F2 0%, #F0EDE6 100%)" }}>
            <div className="max-w-3xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
                <p className="text-xs font-bold tracking-[0.2em] uppercase mb-3" style={{ color: GOLD }}>Got Questions?</p>
                <h2 className="text-3xl font-extrabold text-[#0A1628] mb-3 tracking-tight">Frequently Asked Questions</h2>
              </motion.div>
              <div className="space-y-3">
                {faqs.map((faq, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07 }}
                    className="bg-white rounded-2xl border border-[#0A1628]/[0.05] overflow-hidden"
                    style={{ boxShadow: "0 1px 2px rgba(10, 22, 40, 0.03)" }}
                  >
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      aria-expanded={openFaq === i}
                      className="w-full flex items-center justify-between px-6 py-4 text-left"
                    >
                      <span className="font-semibold text-[#0A1628] text-sm">{faq.q}</span>
                      {openFaq === i ? <ChevronUp size={16} className="text-[#0A1628]/30 flex-shrink-0" /> : <ChevronDown size={16} className="text-[#0A1628]/30 flex-shrink-0" />}
                    </button>
                    <AnimatePresence>
                      {openFaq === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-4 text-sm text-[#0A1628]/50 border-t border-[#0A1628]/[0.04]">{faq.a}</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ FOOTER ═══ */}
          <footer className="py-16 px-6" style={{ background: NAVY_GRAD }}>
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row gap-10 justify-between mb-10">
                <div>
                  <div className="bg-white rounded-xl p-3 inline-block mb-4 shadow-lg">
                    <img src="/logo.jpg" alt="Go LineLess" className="h-10 w-auto" />
                  </div>
                  <p className="text-white/50 text-sm">Life Without Waiting</p>
                  <p className="text-white/30 text-xs mt-1">India's offline assistance network</p>
                  <p className="text-white/20 text-xs mt-2">GoLineLess.com · GoLineLess.in</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
                  <div>
                    <h4 className="font-semibold text-white mb-3">Services</h4>
                    <ul className="space-y-2 text-white/40 text-[13px]">
                      <li>Hospital Queue</li>
                      <li>Govt Office</li>
                      <li>Bank Work</li>
                      <li>Senior Care</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-3">Company</h4>
                    <ul className="space-y-2 text-white/40 text-[13px]">
                      <li>About Us</li>
                      <li>Careers</li>
                      <li>Press</li>
                      <li>Blog</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-3">Support</h4>
                    <ul className="space-y-2 text-white/40 text-[13px]">
                      <li>support@golineless.in</li>
                      <li>Privacy Policy</li>
                      <li>Terms of Service</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="border-t border-white/[0.06] pt-6 text-center">
                <p className="text-white/30 text-xs">Powered by IBNAY IFTRIBE PRIVATE LIMITED</p>
                <p className="text-white/20 text-xs mt-1">© 2025 IBNAY IFTRIBE PRIVATE LIMITED. All rights reserved. | Registered Office: Ahmedabad, Gujarat, India</p>
              </div>
            </div>
          </footer>
        </div>
      )}
    </>
  );
}
