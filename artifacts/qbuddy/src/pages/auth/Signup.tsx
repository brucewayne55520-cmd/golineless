import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useAuth } from "@/contexts/AuthContext";
import { DARK_GRAD, ORANGE } from "@/lib/theme";
import { requestMagicLink } from "@/lib/neon-auth";

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function Signup() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [signupMode, setSignupMode] = useState<"password" | "magic">("password");

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      toast.error("Google sign-up failed. Please try again.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Sign-up failed. Please try again.");
        return;
      }
      const data = await res.json();
      login(data.token, "user", data.user);
      toast.success("Welcome to Go LineLess!");
      navigate("/app/home");
    } catch {
      toast.error("Network error. Please try again.");
    }
  };

  const handleGoogleError = () => {
    toast.error("Google sign-up was cancelled or failed.");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email || !password) { toast.error("All fields are required"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email, password, role: "user" }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Signup failed"); setLoading(false); return; }
      login(data.token, "user", data.user);
      toast.success("Account created! Welcome to Go LineLess!");
      navigate("/app/home");
    } catch {
      toast.error("Network error. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: "linear-gradient(160deg, #241100 0%, #331900 30%, #663100 60%, #994a00 85%, #cc6300 100%)" }}>
      {/* Decorative circles */}
      <div className="absolute top-[-80px] left-[-60px] w-[300px] h-[300px] rounded-full opacity-[0.1]" style={{ background: "radial-gradient(circle, #ff7b00, transparent 70%)" }} />
      <div className="absolute bottom-[-100px] right-[-60px] w-[250px] h-[250px] rounded-full opacity-[0.07]" style={{ background: "radial-gradient(circle, #ff9633, transparent 70%)" }} />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-sm relative z-10">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-block bg-white rounded-2xl p-3 shadow-lg mb-4">
              <img src="/logo.jpg" alt="Go LineLess" className="h-14 w-auto" />
            </div>
            <h1 className="text-2xl font-black text-white">Create Account</h1>
            <p className="text-white/60 text-sm mt-1">Get started with Go LineLess</p>
          </div>

          {/* Google Sign-Up */}
          <div className="flex justify-center mb-5">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="filled_black"
              size="large"
              shape="rectangular"
              width="300"
              text="signup_with"
              logo_alignment="center"
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-xs text-white/40 font-medium">OR</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          {/* Signup Form */}
          {magicLinkSent ? (
            /* Magic link sent confirmation */
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/20 mb-3">
                <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Check your email</h2>
              <p className="text-white/60 text-sm mb-1">We sent a magic link to</p>
              <p className="font-semibold text-white text-sm">{email}</p>
              <p className="text-white/40 text-xs mt-2">Click the link in the email to create your account. No password needed!</p>
              <button
                type="button"
                onClick={() => { setMagicLinkSent(false); setEmail(""); setSignupMode("password"); }}
                className="mt-3 text-sm font-medium underline"
                style={{ color: ORANGE }}
              >
                Use a different method
              </button>
            </div>
          ) : signupMode === "magic" ? (
            /* Magic link form */
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!email || !email.includes("@")) { toast.error("Enter a valid email"); return; }
                setSendingLink(true);
                const result = await requestMagicLink(email, `${window.location.origin}/auth/magic-link/callback`, "user");
                setSendingLink(false);
                if (result.success) {
                  setMagicLinkSent(true);
                  toast.success("Magic link sent!");
                } else {
                  toast.error(result.error || "Failed to send magic link");
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-sm font-medium text-white/80 mb-1 block">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 transition"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={sendingLink}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #ff7b00, #ff9633)", boxShadow: "0 6px 20px -4px rgba(255, 123, 0, 0.35)" }}
              >
                {sendingLink ? "Sending..." : "Send magic link"}
              </button>
              <p className="text-center text-sm text-white/60">
                <button type="button" onClick={() => setSignupMode("password")} className="font-semibold" style={{ color: ORANGE }}>
                  Use password instead
                </button>
              </p>
            </form>
          ) : (
            /* Email + Password Signup Form */
            <form onSubmit={handleSignup} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-white/80 mb-1 block">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 transition"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-white/80 mb-1 block">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 transition"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-white/80 mb-1 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 transition"
                  required
                  minLength={6}
                />
                <p className="text-xs text-white/40 mt-1">At least 6 characters</p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #ff7b00, #ff9633)", boxShadow: "0 6px 20px -4px rgba(255, 123, 0, 0.35)" }}
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
              <p className="text-center text-sm text-white/60">
                <button type="button" onClick={() => setSignupMode("magic")} className="font-semibold" style={{ color: ORANGE }}>
                  Sign up with magic link
                </button>
              </p>
            </form>
          )}

          {/* Login Link */}
          <p className="text-center text-sm text-white/60 mt-5">
            Already have an account?{" "}
            <button type="button" onClick={() => navigate("/login")} className="font-semibold" style={{ color: ORANGE }}>
              Sign in
            </button>
          </p>

          {/* Runner Link */}
          <p className="text-center text-sm text-white/60 mt-3">
            Are you a runner?{" "}
            <button type="button" onClick={() => navigate("/runner/login")} className="font-semibold" style={{ color: ORANGE }}>
              Login here
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-white/30 mt-4">By creating an account, you agree to our Terms &amp; Privacy Policy</p>
      </motion.div>
    </div>
  );
}
