import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useSendOtp, useVerifyOtp } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";

export default function UserLogin() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) { toast.error("Enter a valid 10-digit phone number"); return; }
    sendOtp.mutate({ data: { phone: `+91${phone}`, role: "user" } }, {
      onSuccess: (data) => {
        toast.success("OTP sent!");
        if ((data as any).otp) toast.info(`Dev OTP: ${(data as any).otp}`, { duration: 10000 });
        setStep("otp");
      },
      onError: () => toast.error("Failed to send OTP"),
    });
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const otpStr = otp.join("");
    if (otpStr.length !== 6) { toast.error("Enter 6-digit OTP"); return; }
    verifyOtp.mutate({ data: { phone: `+91${phone}`, otp: otpStr, role: "user" } }, {
      onSuccess: (data) => {
        login(data.token, "user", (data as any).user);
        toast.success("Welcome to QBuddy!");
        navigate("/app/home");
      },
      onError: () => toast.error("Invalid OTP"),
    });
  };

  const handleOtpChange = (val: string, idx: number) => {
    if (val.length > 1) return;
    const next = [...otp]; next[idx] = val;
    setOtp(next);
    if (val && idx < 5) {
      const el = document.getElementById(`otp-${idx + 1}`);
      el?.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F7FF] px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="bg-white rounded-3xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, #6C3FD4, #9B6FF7)" }}>
              <span className="text-white font-black text-2xl">Q</span>
            </div>
            <h1 className="text-2xl font-black text-[#1A1A2E]">Welcome to QBuddy</h1>
            <p className="text-gray-500 text-sm mt-1">Aapka Kaam, Hamara Runner</p>
          </div>

          {step === "phone" ? (
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Mobile Number</label>
                <div className="flex border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#6C3FD4]">
                  <span className="px-3 py-3 bg-gray-50 text-gray-600 font-medium border-r border-gray-200">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="9876543210"
                    className="flex-1 px-3 py-3 outline-none text-[#1A1A2E] text-lg tracking-wider"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={sendOtp.isPending}
                className="w-full py-4 rounded-2xl text-white font-bold text-lg"
                style={{ background: "linear-gradient(135deg, #FF6B35, #FF8C42)" }}
              >
                {sendOtp.isPending ? "Sending..." : "Get OTP"}
              </button>
              <p className="text-center text-sm text-gray-500 mt-2">
                Are you a runner?{" "}
                <button type="button" onClick={() => navigate("/runner/login")} className="text-[#6C3FD4] font-semibold">
                  Login here
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-500">Enter the 6-digit OTP sent to</p>
                <p className="font-semibold text-[#1A1A2E]">+91 {phone}</p>
                <button type="button" onClick={() => setStep("phone")} className="text-[#6C3FD4] text-xs mt-1">Change number</button>
              </div>
              <div className="flex gap-2 justify-center">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, idx)}
                    onKeyDown={(e) => { if (e.key === "Backspace" && !digit && idx > 0) { document.getElementById(`otp-${idx - 1}`)?.focus(); } }}
                    className="w-11 h-14 border-2 border-gray-200 rounded-xl text-center text-2xl font-bold text-[#6C3FD4] focus:border-[#6C3FD4] focus:outline-none transition-colors"
                  />
                ))}
              </div>
              <button
                type="submit"
                disabled={verifyOtp.isPending}
                className="w-full py-4 rounded-2xl text-white font-bold text-lg"
                style={{ background: "linear-gradient(135deg, #6C3FD4, #9B6FF7)" }}
              >
                {verifyOtp.isPending ? "Verifying..." : "Verify & Continue"}
              </button>
              <button
                type="button"
                onClick={() => sendOtp.mutate({ data: { phone: `+91${phone}`, role: "user" } })}
                className="w-full text-center text-sm text-gray-500"
              >
                Didn't receive? <span className="text-[#6C3FD4] font-semibold">Resend OTP</span>
              </button>
            </form>
          )}
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          By continuing, you agree to our Terms &amp; Privacy Policy
        </p>
      </motion.div>
    </div>
  );
}
