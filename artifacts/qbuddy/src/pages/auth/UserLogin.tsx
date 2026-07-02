import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { isGoogleAuthConfigured } from "@/lib/google-auth";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { requestMagicLink } from "@/lib/neon-auth";

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function UserLogin() {
  const [, navigate] = useLocation();
  const { login, token: authToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [loginMode, setLoginMode] = useState<"password" | "magic">("password");

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      toast.error("Google sign-in failed. Please try again.");
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
        toast.error(err.error || "Sign-in failed. Please try again.");
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
    toast.error("Google sign-in was cancelled or failed.");
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Email and password are required"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: "user" }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Invalid credentials"); setLoading(false); return; }
      login(data.token, "user", data.user);
      toast.success("Welcome back!");
      navigate("/app/home");
    } catch {
      toast.error("Network error. Please try again.");
    }
    setLoading(false);
  };

  const [initializing, setInitializing] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setInitializing(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-3 text-blue-600" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-sm">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-block bg-white border border-gray-100 rounded-xl p-3 shadow-sm mb-4">
              <img src="/logo.jpg" alt="Go LineLess" className="h-14 w-auto" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">Welcome Back</h1>
            <p className="text-gray-400 text-sm mt-1">Life Without Waiting</p>
          </div>

          {/* Google Sign-In */}
          {isGoogleAuthConfigured && (
            <div className="flex justify-center mb-5">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap
                theme="outline"
                size="large"
                shape="rectangular"
                width="300"
                text="signin_with"
                logo_alignment="center"
              />
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">{isGoogleAuthConfigured ? "OR" : "Sign in with email"}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Email Login */}
          {magicLinkSent ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 mb-3">
                <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Check your email</h2>
              <p className="text-gray-500 text-sm mb-1">We sent a magic link to</p>
              <p className="font-semibold text-gray-900 text-sm">{email}</p>
              <p className="text-gray-400 text-xs mt-2">Click the link in the email to sign in. No password needed!</p>
              <button
                type="button"
                onClick={() => { setMagicLinkSent(false); setEmail(""); setLoginMode("password"); }}
                className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700 underline"
              >
                Use a different method
              </button>
            </div>
          ) : loginMode === "magic" ? (
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
                <button type="button" onClick={() => setLoginMode("password")} className="font-semibold text-blue-600 hover:text-blue-700">
                  Use password instead
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-3">
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
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={() => navigate("/forgot-password?role=user")} className="text-xs font-medium text-gray-400 hover:text-gray-600 transition">
                  Forgot password?
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm transition-all hover:bg-blue-700 disabled:opacity-60 shadow-md"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
              <p className="text-center text-sm text-gray-500">
                <button type="button" onClick={() => setLoginMode("magic")} className="font-semibold text-blue-600 hover:text-blue-700">
                  Sign in with magic link
                </button>
              </p>
            </form>
          )}

          {/* Sign Up Link */}
          <p className="text-center text-sm text-gray-500 mt-5">
            Don't have an account?{" "}
            <button type="button" onClick={() => navigate("/signup")} className="font-semibold text-blue-600 hover:text-blue-700">
              Create one
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

        {/* Trust Badges */}
        <div className="flex justify-center gap-6 mt-5">
          {[{ icon: "🔒", label: "Secure" }, { icon: "⚡", label: "Instant" }, { icon: "🛡️", label: "Trusted" }].map(({ icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span className="text-xl">{icon}</span>
              <span className="text-xs text-gray-400 font-medium">{label}</span>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">By continuing, you agree to our Terms &amp; Privacy Policy</p>
      </motion.div>
    </div>
  );
}
