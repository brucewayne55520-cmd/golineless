import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle, Trash2, Shield, FileText, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";


export default function AccountDeletion() {
  const [, navigate] = useLocation();
  const { role, logout } = useAuth();
  const isRunner = role === "runner";

  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const CONFIRM_TEXT = "DELETE MY ACCOUNT";
  const canDelete = password.length > 0 && confirmText === CONFIRM_TEXT && agreed && !loading;

  const [redirectTimer, setRedirectTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleDelete = async () => {
    if (!canDelete) return;
    setLoading(true);
    setError(null);

    try {
      const tokenKey = isRunner ? "golineless_runner_token" : "golineless_user_token";
      const token = localStorage.getItem(tokenKey) || "";
      const endpoint = isRunner ? "/api/runners/delete-account" : "/api/users/delete-account";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        setShowSuccess(true);
        toast.success("Account deleted successfully");
        // Auto-redirect after delay (user can also click 'Go to Home')
        const timer = setTimeout(() => {
          logout();
          navigate("/");
        }, 5000);
        setRedirectTimer(timer);
      } else {
        setError(data.error || "Failed to delete account. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  const handleGoHome = () => {
    if (redirectTimer) clearTimeout(redirectTimer);
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(isRunner ? "/runner/profile" : "/app/profile")}
            className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="font-black text-gray-900 text-base">Delete Account</h1>
            <p className="text-xs text-gray-400">This action cannot be undone</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">
        {/* Warning banner */}
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-black text-red-700 text-sm">Permanent Account Deletion</h3>
              <p className="text-xs text-red-600/80 mt-1 leading-relaxed">
                This will permanently delete your {isRunner ? "runner" : "user"} account.
                All your data will be anonymized and you will not be able to recover it.
              </p>
            </div>
          </div>
        </div>

        {/* What will be deleted */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-black text-gray-900 text-sm mb-3">What will be deleted:</h3>
          <div className="space-y-2.5">
            {[
              { icon: Shield, text: "Personal profile and identity information" },
              { icon: FileText, text: isRunner ? "KYC documents (Aadhaar, selfie, bank details)" : "KYC documents (Aadhaar verification)" },
              { icon: Clock, text: isRunner ? "Task history, earnings, and trust score" : "Task history and booking records" },
              { icon: Trash2, text: "Login credentials and active sessions" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2.5">
                <item.icon size={14} className="text-red-400 flex-shrink-0" />
                <span className="text-xs text-gray-600">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* What will be kept */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-black text-gray-900 text-sm mb-2">What will be kept:</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Transaction records and audit logs will be retained for legal and financial compliance,
            but will be dissociated from your identity.
          </p>
        </div>

        {/* Password confirmation */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-black text-gray-900 text-sm mb-3">Confirm your password</h3>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            placeholder="Enter your password"
            className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all bg-white"
          />
          {error && (
            <p className="text-red-500 text-xs mt-2 font-medium">{error}</p>
          )}
        </div>

        {/* Type confirmation */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-black text-gray-900 text-sm mb-3">
            Type <span className="text-red-500 font-mono">{CONFIRM_TEXT}</span> to confirm
          </h3>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_TEXT}
            className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-800 font-mono focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all bg-white"
          />
        </div>

        {/* Agreement checkbox */}
        <label className="flex items-start gap-3 cursor-pointer bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 flex-shrink-0 accent-red-500"
          />
          <span className="text-xs text-gray-500 leading-relaxed">
            I understand this action is permanent and cannot be undone. I voluntarily choose to delete my account.
          </span>
        </label>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          disabled={!canDelete}
          className="w-full py-4 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-2"
          style={{
            background: canDelete ? "linear-gradient(135deg, #DC2626, #EF4444)" : "#E5E7EB",
            color: canDelete ? "white" : "#9CA3AF",
            cursor: canDelete ? "pointer" : "not-allowed",
          }}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Deleting Account...
            </>
          ) : (
            <>
              <Trash2 size={16} />
              Delete My Account Permanently
            </>
          )}
        </button>

        {/* Cancel */}
        <button
          onClick={() => navigate(isRunner ? "/runner/profile" : "/app/profile")}
          className="w-full py-3 rounded-2xl text-gray-500 font-semibold text-sm hover:bg-gray-100 transition-colors"
        >
          Cancel — Keep my account
        </button>
      </div>

      {/* Success overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white rounded-2xl p-8 text-center mx-4 max-w-sm"
            >
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} className="text-red-500" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Account Deleted</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Your account has been permanently deleted. All personal data has been anonymized.
              </p>
              <button onClick={handleGoHome} className="w-full mt-4 py-3 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-gray-800 transition-colors">
                Go to Home
              </button>
              <p className="text-gray-400 text-[10px] mt-2">Or wait to auto-redirect...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
