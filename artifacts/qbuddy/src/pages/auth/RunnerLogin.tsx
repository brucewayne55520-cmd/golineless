import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { DARK_GRAD } from "@/lib/theme";
import { requestMagicLink } from "@/lib/neon-auth";

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function RunnerLogin() {
  const [mode, setMode] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();
  const { login } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: DARK_GRAD }}>
      {/* Decorative circles */}
      <div className="absolute top-[-80px] right-[-60px] w-[300px] h-[300px] rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #3B82F6, transparent 70%)" }} />
      <div className="absolute bottom-[-100px] left-[-60px] w-[250px] h-[250px] rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, #8B5CF6, transparent 70%)" }} />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm relative z-10">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <div className="bg-white rounded-xl p-3 inline-block mb-4 shadow-lg">
              <img src="/logo.jpg" alt="Go LineLess" className="h-14 w-auto" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Runner Portal</h1>
            <p className="text-white/60 text-sm mt-1">Earn up to Rs 1,500 daily</p>
          </div>

          {magicLinkSent ? (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Check your email</h2>
              <p className="text-white/60 text-sm mb-1">We sent a magic link to</p>
              <p className="font-semibold text-white text-sm">{email}</p>
              <p className="text-white/40 text-xs mt-3">Click the link in the email to sign in. No password needed!</p>
              <button
                type="button"
                onClick={() => { setMagicLinkSent(false); setEmail(""); setMode("email"); }}
                className="mt-4 text-sm font-medium text-blue-400 hover:text-blue-300 underline"
              >
                Use a different method
              </button>
            </div>
          ) : mode === "email" ? (
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
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={sendingLink}
                className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-lg disabled:opacity-60 shadow-lg hover:bg-blue-700 transition-all"
              >
                {sendingLink ? "Sending..." : "Send magic link"}
              </button>
              <p className="text-center text-sm text-white/60">
                <button type="button" onClick={() => setMode("password")} className="font-semibold text-blue-400 hover:text-blue-300">
                  Sign in with email + password instead
                </button>
              </p>
            </form>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!email || !password) { toast.error("Email and password required"); return; }
                setLoading(true);
                try {
                  const endpoint = isSigningUp ? "/api/auth/signup" : "/api/auth/login";
                  const body: Record<string, string> = { email, password, role: "runner" };
                  if (isSigningUp && name) body.name = name;
                  if (isSigningUp && phone) body.phone = phone;
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
                <>
                  <div>
                    <label className="text-sm font-medium text-white/80 mb-1 block">Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400/40" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-white/80 mb-1 block">Phone number</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400/40" required={isSigningUp} />
                  </div>
                </>
              )}
              <div>
                <label className="text-sm font-medium text-white/80 mb-1 block">Email address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400/40" required />
              </div>
              <div>
                <label className="text-sm font-medium text-white/80 mb-1 block">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400/40" required minLength={6} />
              </div>
              <button type="submit" disabled={loading} className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-lg disabled:opacity-60 shadow-lg hover:bg-blue-700 transition-all">
                {loading ? "Please wait..." : isSigningUp ? "Create Account" : "Sign In"}
              </button>
              {!isSigningUp && (
                <p className="text-center">
                  <button type="button" onClick={() => navigate("/forgot-password?role=runner")} className="text-xs font-medium text-white/50 hover:text-white/80 transition">
                    Forgot password?
                  </button>
                </p>
              )}
              <p className="text-center text-sm text-white/60">
                {isSigningUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button type="button" onClick={() => setIsSigningUp(!isSigningUp)} className="font-semibold text-blue-400 hover:text-blue-300">
                  {isSigningUp ? "Sign in" : "Create one"}
                </button>
              </p>
              <p className="text-center text-sm text-white/60">
                <button type="button" onClick={() => setMode("email")} className="font-semibold text-blue-400 hover:text-blue-300">
                  Use magic link instead
                </button>
              </p>
            </form>
          )}

          <p className="text-center text-sm text-white/60 mt-5">
            Looking to hire?{" "}
            <button type="button" onClick={() => navigate("/login")} className="font-semibold text-blue-400 hover:text-blue-300">
              Book a runner
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
