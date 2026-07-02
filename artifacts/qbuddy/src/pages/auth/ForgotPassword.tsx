import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();
  const role = new URLSearchParams(window.location.search).get("role") === "runner" ? "runner" : "user";
  const loginPath = role === "runner" ? "/runner/login" : "/login";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) { toast.error("Enter a valid email"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      await res.json();
      setSent(true);
    } catch { toast.error("Network error"); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-sm">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <div className="text-center mb-8">
            <div className="inline-block bg-white border border-gray-100 rounded-xl p-3 shadow-sm mb-4">
              <img src="/logo.jpg" alt="Go LineLess" className="h-14 w-auto" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              {sent ? "Check your email" : "Forgot password?"}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {sent ? "We sent a reset link to your email." : "Enter your email and we'll send you a reset link."}
            </p>
          </div>

          {sent ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <p className="text-gray-500 text-sm mb-1">We sent a password reset link to</p>
              <p className="font-semibold text-gray-900 text-sm">{email}</p>
              <p className="text-gray-400 text-xs mt-3">Click the link in the email to reset your password. The link expires in 1 hour.</p>
              <button
                type="button"
                onClick={() => navigate(loginPath)}
                className="mt-6 w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all shadow-md"
              >
                Back to login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm transition-all hover:bg-blue-700 disabled:opacity-60 shadow-md"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          <button type="button" onClick={() => navigate(loginPath)} className="font-semibold text-blue-600 hover:text-blue-700">
            Back to login
          </button>
        </p>
      </motion.div>
    </div>
  );
}
