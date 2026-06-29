import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { isGoogleAuthConfigured } from "@/lib/google-auth";
import { useAuth } from "@/contexts/AuthContext";
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
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-sm">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-block bg-white rounded-xl p-3 shadow-sm mb-4 border border-gray-100">
              <img src="/logo.jpg" alt="Go LineLess" className="h-14 w-auto" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">Create Account</h1>
            <p className="text-gray-400 text-sm mt-1">Get started with Go LineLess</p>
          </div>

          {/* Google Sign-Up */}
          {isGoogleAuthConfigured && (
            <div className="flex justify-center mb-5">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                shape="rectangular"
                width="300"
                text="signup_with"
                logo_alignment="center"
              />
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">{isGoogleAuthConfigured ? "OR" : "Sign up with email"}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Signup Form */}
          {magicLinkSent ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 mb-3">
                <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Check your email</h2>
              <p className="text-gray-500 text-sm mb-1">We sent a magic link to</p>
              <p className="font-semibold text-gray-900 text-sm">{email}</p>
              <p className="text-gray-400 text-xs mt-2">Click the link in the email to create your account. No password needed!</p>
              <button
                type="button"
                onClick={() => { setMagicLinkSent(false); setEmail(""); setSignupMode("password"); }}
                className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700 underline"
              >
                Use a different method
              </button>
            </div>
          ) : signupMode === "magic" ? (
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
                <label className="text-sm font-medium text-gray-700 mb-1 block">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={sendingLink}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm transition-all hover:bg-blue-700 disabled:opacity-60 shadow-md"
              >
                {sendingLink ? "Sending..." : "Send magic link"}
              </button>
              <p className="text-center text-sm text-gray-500">
                <button type="button" onClick={() => setSignupMode("password")} className="font-semibold text-blue-600 hover:text-blue-700">
                  Use password instead
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-400 mt-1">At least 6 characters</p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm transition-all hover:bg-blue-700 disabled:opacity-60 shadow-md"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
              <p className="text-center text-sm text-gray-500">
                <button type="button" onClick={() => setSignupMode("magic")} className="font-semibold text-blue-600 hover:text-blue-700">
                  Sign up with magic link
                </button>
              </p>
            </form>
          )}

          {/* Login Link */}
          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{" "}
            <button type="button" onClick={() => navigate("/login")} className="font-semibold text-blue-600 hover:text-blue-700">
              Sign in
            </button>
          </p>

          {/* Runner Link */}
          <p className="text-center text-sm text-gray-500 mt-3">
            Are you a runner?{" "}
            <button type="button" onClick={() => navigate("/runner/login")} className="font-semibold text-blue-600 hover:text-blue-700">
              Login here
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">By creating an account, you agree to our Terms &amp; Privacy Policy</p>
      </motion.div>
    </div>
  );
}
