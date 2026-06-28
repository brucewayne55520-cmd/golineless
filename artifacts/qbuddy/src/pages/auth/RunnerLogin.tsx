import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useSendOtp, useVerifyOtp } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { DARK_GRAD } from "@/lib/theme";
import { requestMagicLink } from "@/lib/neon-auth";

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function RunnerLogin() {
  const [step, setStep] = useState<"phone" | "otp" | "email" | "password">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) { toast.error("Enter a valid 10-digit phone number"); return; }
    sendOtp.mutate({ data: { phone: `+91${phone}`, role: "runner" } }, {
      onSuccess: (data) => {
        toast.success("OTP sent!");
        if (data.otp) toast.info(`Dev OTP: ${data.otp}`, { duration: 10000 });
        setStep("otp");
      },
      onError: () => toast.error("Failed to send OTP"),
    });
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const otpStr = otp.join("");
    if (otpStr.length !== 6) { toast.error("Enter 6-digit OTP"); return; }
    verifyOtp.mutate({ data: { phone: `+91${phone}`, otp: otpStr, role: "runner" } }, {
      onSuccess: (data) => {
        login(data.token, "runner", undefined, data.runner);
        toast.success("Welcome, Runner!");
        navigate("/runner/feed");
      },
      onError: () => toast.error("Invalid OTP"),
    });
  };

  const handleOtpChange = (val: string, idx: number) => {
    if (val.length > 1) return;
    const next = [...otp]; next[idx] = val;
    setOtp(next);
    if (val && idx < 5) document.getElementById(`otp-r-${idx + 1}`)?.focus();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: "linear-gradient(160deg, #241100 0%, #331900 30%, #663100 60%, #994a00 85%, #cc6300 100%)" }}>
      {/* Decorative circles */}
      <div className="absolute top-[-80px] right-[-60px] w-[300px] h-[300px] rounded-full opacity-[0.1]" style={{ background: "radial-gradient(circle, #ff7b00, transparent 70%)" }} />
      <div className="absolute bottom-[-100px] left-[-60px] w-[250px] h-[250px] rounded-full opacity-[0.07]" style={{ background: "radial-gradient(circle, #ff9633, transparent 70%)" }} />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm relative z-10">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <div className="bg-white rounded-2xl p-3 inline-block mb-4 shadow-lg">
              <img src="/logo.jpg" alt="Go LineLess" className="h-14 w-auto" />
            </div>
            <h1 className="text-2xl font-black text-white">Runner Portal</h1>
            <p className="text-white/60 text-sm mt-1">Earn up to Rs 1,500 daily</p>
          </div>

          {magicLinkSent ? (
            /* ---- Magic link sent confirmation ---- */
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Check your email</h2>
              <p className="text-white/60 text-sm mb-1">We sent a magic link to</p>
              <p className="font-semibold text-white text-sm">{email}</p>
              <p className="text-white/40 text-xs mt-3">Click the link in the email to sign in. No password needed!</p>
              <button
                type="button"
                onClick={() => { setMagicLinkSent(false); setEmail(""); setStep("phone"); }}
                className="mt-4 text-sm font-medium underline"
                style={{ color: "#ff9633" }}
              >
                Use a different method
              </button>
            </div>
          ) : step === "email" ? (
            /* ---- Email magic link form ---- */
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!email || !email.includes("@")) { toast.error("Enter a valid email"); return; }
                setSendingLink(true);
                const result = await requestMagicLink(email, `${window.location.origin}/auth/magic-link/callback`, "runner");
                setSendingLink(false);
                if (result.success) {
                  setMagicLinkSent(true);
                  toast.success("Magic link sent!");
                } else {
                  toast.error(result.error || "Failed to send magic link");
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-white/80 mb-1 block">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={sendingLink}
                className="w-full py-4 rounded-2xl text-white font-bold text-lg disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #ff7b00, #ff9633)", boxShadow: "0 6px 20px -4px rgba(255, 123, 0, 0.35)" }}
              >
                {sendingLink ? "Sending..." : "Send magic link"}
              </button>
              <p className="text-center text-sm text-white/60">
                <button type="button" onClick={() => setStep("phone")} className="font-semibold" style={{ color: "#ff9633" }}>
                  Use phone instead
                </button>
              </p>
            </form>
          ) : step === "phone" ? (
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-white/80 mb-1 block">Mobile Number</label>
                <div className="flex border border-white/20 rounded-xl overflow-hidden bg-white/5">
                  <span className="px-3 py-3 text-white/60 border-r border-white/20 font-medium">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="9876543210"
                    className="flex-1 px-3 py-3 outline-none bg-transparent text-white text-lg tracking-wider placeholder:text-white/30"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={sendOtp.isPending}
                className="w-full py-4 rounded-2xl text-white font-bold text-lg"
                style={{ background: "linear-gradient(135deg, #ff7b00, #ff9633)", boxShadow: "0 6px 20px -4px rgba(255, 123, 0, 0.35)" }}
              >
                {sendOtp.isPending ? "Sending..." : "Get OTP"}
              </button>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/20" />
                <span className="text-xs text-white/40">OR</span>
                <div className="flex-1 h-px bg-white/20" />
              </div>
              <button
                type="button"
                onClick={() => setStep("email")}
                className="w-full py-3 rounded-2xl border border-white/20 text-white font-semibold text-sm bg-white/5 hover:bg-white/10 transition"
              >
                Sign in with email instead
              </button>
              <button
                type="button"
                onClick={() => setStep("password")}
                className="w-full py-3 rounded-2xl border border-white/20 text-white font-semibold text-sm bg-white/5 hover:bg-white/10 transition"
              >
                Sign in with email + password
              </button>
              <p className="text-center text-sm text-white/60">
                Looking to hire?{" "}
                <button type="button" onClick={() => navigate("/login")} className="font-semibold" style={{ color: "#ff9633" }}>
                  Book a runner
                </button>
              </p>
            </form>
          ) : step === "password" ? (
            /* ---- Email + Password form ---- */
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!email || !password) { toast.error("Email and password required"); return; }
                setLoading(true);
                try {
                  const endpoint = isSigningUp ? "/api/auth/signup" : "/api/auth/login";
                  const body: Record<string, string> = { email, password, role: "runner" };
                  if (isSigningUp && name) body.name = name;
                  const res = await fetch(`${API_BASE}${endpoint}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                  });
                  const data = await res.json();
                  if (!res.ok) { toast.error(data.error || "Invalid credentials"); setLoading(false); return; }
                  login(data.token, "runner", undefined, data.runner);
                  toast.success(isSigningUp ? "Account created!" : "Welcome, Runner!");
                  navigate("/runner/feed");
                } catch { toast.error("Network error"); }
                setLoading(false);
              }}
              className="space-y-4"
            >
              {isSigningUp && (
                <div>
                  <label className="text-sm font-medium text-white/80 mb-1 block">Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30" />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-white/80 mb-1 block">Email address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30" required />
              </div>
              <div>
                <label className="text-sm font-medium text-white/80 mb-1 block">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30" required minLength={6} />
              </div>
              <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl text-white font-bold text-lg disabled:opacity-60" style={{ background: "linear-gradient(135deg, #ff7b00, #ff9633)", boxShadow: "0 6px 20px -4px rgba(255, 123, 0, 0.35)" }}>
                {loading ? "Please wait..." : isSigningUp ? "Create Account" : "Sign In"}
              </button>
              {!isSigningUp && (
                <p className="text-center">
                  <button type="button" onClick={() => navigate("/forgot-password")} className="text-xs font-medium text-white/50 hover:text-white/80 transition">
                    Forgot password?
                  </button>
                </p>
              )}
              <p className="text-center text-sm text-white/60">
                {isSigningUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button type="button" onClick={() => setIsSigningUp(!isSigningUp)} className="font-semibold" style={{ color: "#ff9633" }}>
                  {isSigningUp ? "Sign in" : "Create one"}
                </button>
              </p>
              <p className="text-center text-sm text-white/60">
                <button type="button" onClick={() => setStep("phone")} className="font-semibold" style={{ color: "#ff9633" }}>
                  Use phone instead
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-white/60">Enter 6-digit OTP sent to</p>
                <p className="font-semibold text-white">+91 {phone}</p>
              </div>
              <div className="flex gap-2 justify-center">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-r-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, idx)}
                    onKeyDown={(e) => { if (e.key === "Backspace" && !digit && idx > 0) document.getElementById(`otp-r-${idx - 1}`)?.focus(); }}
                    className="w-11 h-14 bg-white/10 border-2 border-white/20 rounded-xl text-center text-2xl font-bold focus:outline-none transition-colors"
                    style={{ color: "#ff9633", borderColor: digit ? "#ff7b00" : "" }}
                  />
                ))}
              </div>
              <button
                type="submit"
                disabled={verifyOtp.isPending}
                className="w-full py-4 rounded-2xl text-white font-bold text-lg"
                style={{ background: "linear-gradient(135deg, #ff7b00, #ff9633)", boxShadow: "0 6px 20px -4px rgba(255, 123, 0, 0.35)" }}
              >
                {verifyOtp.isPending ? "Verifying..." : "Start Earning!"}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
