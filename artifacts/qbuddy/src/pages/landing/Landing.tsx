import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, PersonStanding, CheckCircle2, Star, MapPin, HeartHandshake } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { CategoryIcon, CATEGORY_KEYS } from "@/components/CategoryIcon";
import { CATEGORY_NAMES, CATEGORY_PRICES, CATEGORY_HINDI } from "@/lib/utils";

function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{ background: "linear-gradient(135deg, #6C3FD4, #9B6FF7)" }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="flex flex-col items-center"
      >
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-2xl">
          <span className="text-5xl font-black text-[#6C3FD4]">Q</span>
        </div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-black text-white tracking-tight"
        >
          Q<span className="font-light">Buddy</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-white/80 mt-2 text-sm tracking-widest uppercase"
          style={{ textShadow: "0 0 20px rgba(255,255,255,0.5)" }}
        >
          UnLimit &amp; LineLess Assistant
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="text-white/60 text-xs mt-1"
        >
          Aapka Kaam, Hamara Runner
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

const steps = [
  { Icon: Smartphone, title: "Book in 60 seconds", desc: "Select category, describe your task" },
  { Icon: PersonStanding, title: "Runner assigned instantly", desc: "Verified local runner picks your task" },
  { Icon: CheckCircle2, title: "Sit back, task done", desc: "Track live & get proof on completion" },
];

const testimonials = [
  { name: "Priya Sharma", city: "Ahmedabad", text: "Saved me 4 hours at the passport office. The runner was so professional!", rating: 5 },
  { name: "Ankit Patel", city: "Ahmedabad", text: "My parents are in Ahmedabad, I'm in the US. QBuddy handles all their errands. Life changing!", rating: 5 },
  { name: "Sunita Mehta", city: "Ahmedabad", text: "Used it for bank work 3 times now. Always on time, always professional.", rating: 5 },
];

const trustItems = [
  { Icon: Star, val: "4.9", label: "Rated" },
  { Icon: PersonStanding, val: "500+", label: "Runners" },
  { Icon: CheckCircle2, val: "10,000+", label: "Tasks Done" },
  { Icon: MapPin, val: "Ahmedabad", label: "& Growing" },
];

export default function Landing() {
  const [showSplash, setShowSplash] = useState(true);
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
        <div className="min-h-screen bg-[#F8F7FF]">
          <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-purple-100 px-6 py-4">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-[#6C3FD4] rounded-full flex items-center justify-center">
                  <span className="text-white font-black text-lg">Q</span>
                </div>
                <span className="text-xl font-black text-[#1A1A2E]">QBuddy</span>
              </div>
              <div className="hidden md:flex gap-6 text-sm font-medium text-gray-600">
                <a href="#how" className="hover:text-[#6C3FD4] transition-colors">How it Works</a>
                <a href="#services" className="hover:text-[#6C3FD4] transition-colors">Services</a>
                <a href="#senior" className="hover:text-[#6C3FD4] transition-colors">Senior Care</a>
              </div>
              <button
                onClick={() => navigate("/login")}
                className="px-5 py-2 rounded-xl text-white text-sm font-semibold"
                style={{ background: "linear-gradient(135deg, #FF6B35, #FF8C42)" }}
              >
                Book Now
              </button>
            </div>
          </nav>

          <section className="relative overflow-hidden pt-16 pb-20 px-6">
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
              <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}>
                <span className="inline-block px-3 py-1 bg-purple-100 text-[#6C3FD4] rounded-full text-xs font-semibold mb-4">
                  Now in Ahmedabad
                </span>
                <h1 className="text-5xl font-black text-[#1A1A2E] leading-tight mb-4">
                  India's First
                  <br />
                  <span style={{ background: "linear-gradient(135deg, #6C3FD4, #FF6B35)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    LineLess
                  </span>
                  <br />
                  Assistant
                </h1>
                <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                  Send a trusted, verified runner to handle your queues, paperwork, bank work, and more.
                  You sit back while we run around for you.
                </p>
                <div className="flex gap-4 flex-wrap">
                  <button
                    onClick={() => navigate("/login")}
                    className="px-8 py-4 rounded-2xl text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
                    style={{ background: "linear-gradient(135deg, #FF6B35, #FF8C42)" }}
                  >
                    Book a Runner
                  </button>
                  <button
                    onClick={() => navigate("/runner/login")}
                    className="px-8 py-4 rounded-2xl text-[#6C3FD4] font-bold text-lg border-2 border-[#6C3FD4] hover:bg-purple-50 transition-all"
                  >
                    Become a Runner
                  </button>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="hidden md:flex items-center justify-center"
              >
                <div className="relative w-80 h-80">
                  <div className="absolute inset-0 rounded-full opacity-20 animate-pulse" style={{ background: "radial-gradient(circle, #6C3FD4, transparent)" }} />
                  <div className="absolute inset-8 rounded-full opacity-30" style={{ background: "radial-gradient(circle, #FF6B35, transparent)" }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      animate={{ y: [-10, 10, -10] }}
                      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                      className="text-center"
                    >
                      <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <PersonStanding size={48} className="text-white" />
                      </div>
                      <div className="bg-white rounded-2xl px-4 py-2 shadow-lg text-sm font-semibold text-[#6C3FD4]">
                        On the way!
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          <section className="bg-white py-6 border-y border-gray-100">
            <div className="max-w-4xl mx-auto px-6">
              <div className="flex flex-wrap items-center justify-center gap-8 text-center">
                {trustItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <item.Icon size={22} className="text-[#6C3FD4]" />
                    <div>
                      <div className="font-bold text-[#1A1A2E]">{item.val}</div>
                      <div className="text-xs text-gray-500">{item.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="how" className="py-20 px-6">
            <div className="max-w-4xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
                <h2 className="text-3xl font-black text-[#1A1A2E] mb-3">How QBuddy Works</h2>
                <p className="text-gray-500">3 simple steps to your personal runner</p>
              </motion.div>
              <div className="grid md:grid-cols-3 gap-8">
                {steps.map((step, i) => (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15 }}
                    className="text-center bg-white rounded-2xl p-8 shadow-md"
                  >
                    <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
                      <step.Icon size={28} className="text-[#6C3FD4]" />
                    </div>
                    <div className="w-7 h-7 bg-[#6C3FD4] text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-3">{i + 1}</div>
                    <h3 className="font-bold text-[#1A1A2E] mb-2">{step.title}</h3>
                    <p className="text-gray-500 text-sm">{step.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          <section id="services" className="py-20 px-6 bg-white">
            <div className="max-w-4xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
                <h2 className="text-3xl font-black text-[#1A1A2E] mb-3">Our Services</h2>
                <p className="text-gray-500">Whatever the task, we have a runner for it</p>
              </motion.div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {CATEGORY_KEYS.map((cat, i) => (
                  <motion.div
                    key={cat}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07 }}
                    onClick={() => navigate(`/login?category=${cat}`)}
                    className="cursor-pointer bg-[#F8F7FF] hover:bg-purple-50 rounded-2xl p-5 text-center transition-all hover:shadow-md hover:-translate-y-1"
                  >
                    <div className="flex justify-center mb-2 text-[#6C3FD4]">
                      <CategoryIcon category={cat} size={36} />
                    </div>
                    <div className="font-semibold text-[#1A1A2E] text-sm">{CATEGORY_NAMES[cat]}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{CATEGORY_HINDI[cat]}</div>
                    <div className="text-xs text-[#6C3FD4] font-bold mt-2">from Rs {CATEGORY_PRICES[cat]}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          <section id="senior" className="py-20 px-6">
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-3xl p-10 text-white text-center"
                style={{ background: "linear-gradient(135deg, #6C3FD4, #9B6FF7)" }}
              >
                <HeartHandshake size={48} className="mx-auto mb-4 text-white/90" />
                <h2 className="text-3xl font-black mb-3">Senior Care Plans</h2>
                <p className="text-white/80 mb-2">Peace of mind for your parents back home.</p>
                <p className="text-white/70 text-sm mb-6">Trusted by NRI families in USA, UK, UAE, Middle East</p>
                <button
                  onClick={() => navigate("/login")}
                  className="px-8 py-3 rounded-xl font-bold text-[#6C3FD4] bg-white hover:bg-gray-50 transition-all"
                >
                  View Senior Plans
                </button>
              </motion.div>
            </div>
          </section>

          <section className="py-20 px-6 bg-white">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <h2 className="text-3xl font-black text-[#1A1A2E] mb-3">Earn Rs 500–1,500 Daily</h2>
                <p className="text-gray-500 mb-6">Be your own boss. Set your hours. QBuddy runners earn more than most gig jobs.</p>
                <button
                  onClick={() => navigate("/runner/login")}
                  className="px-8 py-4 rounded-2xl text-white font-bold text-lg"
                  style={{ background: "linear-gradient(135deg, #6C3FD4, #9B6FF7)" }}
                >
                  Join as a Runner
                </button>
              </motion.div>
            </div>
          </section>

          <section className="py-20 px-6">
            <div className="max-w-4xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
                <h2 className="text-3xl font-black text-[#1A1A2E]">What our users say</h2>
              </motion.div>
              <div className="grid md:grid-cols-3 gap-6">
                {testimonials.map((t, i) => (
                  <motion.div
                    key={t.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white rounded-2xl p-6 shadow-md"
                  >
                    <div className="flex gap-1 mb-3">
                      {Array.from({ length: t.rating }).map((_, j) => (
                        <Star key={j} size={16} className="text-yellow-400 fill-yellow-400" />
                      ))}
                    </div>
                    <p className="text-gray-600 text-sm mb-4 leading-relaxed">"{t.text}"</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-[#6C3FD4] rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {t.name[0]}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#1A1A2E]">{t.name}</div>
                        <div className="text-xs text-gray-400">{t.city}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          <footer className="bg-[#1A1A2E] text-white py-16 px-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row gap-10 justify-between mb-10">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-[#6C3FD4] rounded-full flex items-center justify-center">
                      <span className="font-black text-white">Q</span>
                    </div>
                    <span className="text-xl font-black">QBuddy</span>
                  </div>
                  <p className="text-white/60 text-sm">UnLimit &amp; LineLess Assistant</p>
                  <p className="text-white/40 text-xs mt-1">Aapka Kaam, Hamara Runner</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
                  <div>
                    <h4 className="font-semibold mb-3">Services</h4>
                    <ul className="space-y-2 text-white/60">
                      <li>Hospital Queue</li>
                      <li>Govt Office</li>
                      <li>Bank Work</li>
                      <li>Senior Care</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Company</h4>
                    <ul className="space-y-2 text-white/60">
                      <li>About Us</li>
                      <li>Careers</li>
                      <li>Press</li>
                      <li>Blog</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Support</h4>
                    <ul className="space-y-2 text-white/60">
                      <li>support@qbuddy.in</li>
                      <li>Privacy Policy</li>
                      <li>Terms of Service</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="border-t border-white/10 pt-6 text-center">
                <p className="text-white/40 text-xs">Powered by IBNAY IFTRIBE PRIVATE LIMITED</p>
                <p className="text-white/30 text-xs mt-1">© 2025 IBNAY IFTRIBE PRIVATE LIMITED. All rights reserved. | Registered Office: Ahmedabad, Gujarat, India</p>
              </div>
            </div>
          </footer>
        </div>
      )}
    </>
  );
}
