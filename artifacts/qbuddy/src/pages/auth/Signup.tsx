import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useAuth } from "@/contexts/AuthContext";
import { DARK_GRAD, ORANGE } from "@/lib/theme";

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function Signup() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

          {/* Email + Password Signup Form */}
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
          </form>

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
