import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, CheckCircle, AlertCircle, ArrowLeft, Send, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { BLUE_GRAD } from "@/lib/theme";
import { toast } from "sonner";

export default function VerifyEmail() {
  const { role, token } = useAuth();
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"loading" | "sent" | "verified" | "error" | "initial">("initial");
  const [errorMsg, setErrorMsg] = useState("");

  // Check URL for token param (from email link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verificationToken = params.get("token");
    if (verificationToken) {
      setStatus("loading");
      verifyToken(verificationToken);
    }
  }, []);

  const verifyToken = async (verificationToken: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verificationToken }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("verified");
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Verification failed");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  };

  const sendVerification = async () => {
    setStatus("loading");
    try {
      const authKey = role === "runner" ? "golineless_runner_token" : "golineless_user_token";
      const authToken = token || localStorage.getItem(authKey);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/auth/send-verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("sent");
        toast.success("Verification email sent!");
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Failed to send verification email");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white px-4 py-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => window.history.back()} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div>
          <h1 className="font-black text-gray-900 text-base">Verify Email</h1>
          <p className="text-gray-400 text-xs">Confirm your email address</p>
        </div>
      </div>

      <div className="px-4 py-8 max-w-lg mx-auto">
        {/* Initial state — show send button */}
        {status === "initial" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-5">
              <Mail className="w-10 h-10 text-blue-500" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Verify Your Email</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
              We'll send a verification link to your registered email address. Click the link to confirm your account.
            </p>
            <button
              onClick={sendVerification}
              className="w-full py-3.5 rounded-2xl font-bold text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ background: BLUE_GRAD }}
            >
              <Send className="w-4 h-4" />
              Send Verification Email
            </button>
            <p className="text-gray-400 text-xs mt-4">
              Check your spam folder if you don't see the email.
            </p>
          </motion.div>
        )}

        {/* Loading state */}
        {status === "loading" && (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Processing...</p>
          </div>
        )}

        {/* Sent state */}
        {status === "sent" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Email Sent!</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
              Check your inbox and click the verification link. The link expires in 24 hours.
            </p>
            <button
              onClick={() => setStatus("initial")}
              className="w-full py-3.5 rounded-2xl font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm"
            >
              Resend Email
            </button>
          </motion.div>
        )}

        {/* Verified state */}
        {status === "verified" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
              <Shield className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Email Verified!</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
              Your email has been confirmed. Your account is now fully verified.
            </p>
            <button
              onClick={() => navigate(role === "runner" ? "/runner/profile" : "/app/profile")}
              className="w-full py-3.5 rounded-2xl font-bold text-white transition-all active:scale-[0.98]"
              style={{ background: BLUE_GRAD }}
            >
              Back to Profile
            </button>
          </motion.div>
        )}

        {/* Error state */}
        {status === "error" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">{errorMsg}</p>
            <button
              onClick={() => { setStatus("initial"); setErrorMsg(""); }}
              className="w-full py-3.5 rounded-2xl font-bold text-white transition-all active:scale-[0.98]"
              style={{ background: BLUE_GRAD }}
            >
              Try Again
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
