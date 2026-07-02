import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [reset, setReset] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [, navigate] = useLocation();

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const role = params.get("role") || "user";

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">{tokenExpired ? "Link expired" : "Invalid link"}</h1>
            <p className="text-gray-500 text-sm mb-4">{tokenExpired ? "This password reset link has expired. Reset links are valid for 1 hour." : "This password reset link is invalid or missing a token."}</p>
            <button onClick={() => navigate("/forgot-password")} className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all shadow-md">
              Request a new link
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes("expired")) { setTokenExpired(true); }
        toast.error(data.error || "Reset failed");
        setLoading(false);
        return;
      }
      setReset(true);
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
              {reset ? "Password reset!" : "Set new password"}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {reset ? "You can now sign in with your new password." : "Choose a strong password for your account."}
            </p>
          </div>

          {reset ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <button
                onClick={() => navigate(role === "runner" ? "/runner/login" : "/login")}
                className="mt-4 w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all shadow-md"
              >
                Go to login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">New password</label>
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
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm transition-all hover:bg-blue-700 disabled:opacity-60 shadow-md"
              >
                {loading ? "Resetting..." : "Reset password"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          <button type="button" onClick={() => navigate(role === "runner" ? "/runner/login" : "/login")} className="font-semibold text-blue-600 hover:text-blue-700">
            Back to login
          </button>
        </p>
      </motion.div>
    </div>
  );
}
