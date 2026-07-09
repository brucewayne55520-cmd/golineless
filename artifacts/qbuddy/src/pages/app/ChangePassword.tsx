import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, ArrowLeft, Shield, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BLUE, BLUE_GRAD, DARK_GRAD } from "@/lib/theme";
import { toast } from "sonner";

export default function ChangePassword() {
  const { role, token } = useAuth();
  const [, navigate] = useLocation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const hasMinLength = newPassword.length >= 6;
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const canSubmit = currentPassword.length > 0 && hasMinLength && passwordsMatch && !isSubmitting;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);

    try {
      const endpoint = role === "runner" ? "/runners/me/change-password" : "/users/me/change-password";
      const authKey = role === "runner" ? "golineless_runner_token" : "golineless_user_token";
      const authToken = token || localStorage.getItem(authKey);

      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to change password");
        return;
      }

      setSuccess(true);
      toast.success("Password changed successfully");
      setTimeout(() => {
        navigate(role === "runner" ? "/runner/profile" : "/app/profile");
      }, 2500);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Overlay */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.85)" }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Password Changed!</h2>
              <p className="text-white/60 text-sm">Redirecting to profile...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white px-4 py-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => window.history.back()} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div>
          <h1 className="font-black text-gray-900 text-base">Change Password</h1>
          <p className="text-gray-400 text-xs">Update your account password</p>
        </div>
      </div>

      {/* Form */}
      <div className="px-4 py-6 max-w-lg mx-auto">
        {/* Security notice */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-blue-800 text-sm font-medium">Security Notice</p>
            <p className="text-blue-600/70 text-xs mt-1">
              Changing your password will log you out from all other devices.
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-5">
          {/* Current Password */}
          <div>
            <label className="block text-gray-600 text-sm font-semibold mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white pr-12"
                autoComplete="current-password"
                required
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                {showCurrent ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-gray-600 text-sm font-semibold mb-2">New Password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white pr-12"
                autoComplete="new-password"
                required
                minLength={6}
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                {showNew ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
            {newPassword.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className={`w-1.5 h-1.5 rounded-full ${hasMinLength ? "bg-green-500" : "bg-gray-300"}`} />
                <span className={`text-xs ${hasMinLength ? "text-green-600" : "text-gray-400"}`}>At least 6 characters</span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-gray-600 text-sm font-semibold mb-2">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
              autoComplete="new-password"
              required
            />
            {confirmPassword.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className={`w-1.5 h-1.5 rounded-full ${passwordsMatch ? "bg-green-500" : "bg-red-500"}`} />
                <span className={`text-xs ${passwordsMatch ? "text-green-600" : "text-red-500"}`}>
                  {passwordsMatch ? "Passwords match" : "Passwords don't match"}
                </span>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3.5 rounded-2xl font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
            style={{ background: canSubmit ? BLUE_GRAD : "#D1D5DB" }}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Changing...
              </span>
            ) : (
              "Change Password"
            )}
          </button>
        </form>

        {/* Forgot password link */}
        <div className="text-center mt-6">
          <button onClick={() => navigate("/forgot-password")} className="text-sm text-blue-600 hover:text-blue-700 transition-colors font-medium">
            Forgot your current password?
          </button>
        </div>
      </div>
    </div>
  );
}
