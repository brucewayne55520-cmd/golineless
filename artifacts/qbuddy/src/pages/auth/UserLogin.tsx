import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useSendOtp, useVerifyOtp } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";

const NAVY_GRAD = "linear-gradient(135deg, #0F2557, #1D3D7C)";
const GOLD_GRAD = "linear-gradient(135deg, #C9A84C, #D4B870)";

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
        toast.success("Welcome to Go LineLess!");
        navigate("/app/home");
      },
      onError: () => toast.error("Invalid OTP"),
    });
  };

  const handleOtpChange = (val: string, idx: number) => {
    if (val.length > 1) return;
    const next = [...otp]; next[idx] = val;
    setOtp(next);
    if (val && idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #F8F9FC, #EEF2FA)" }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
          <div className="text-center mb-8">
            <div className="inline-block bg-white border border-gray-100 rounded-2xl p-3 shadow-sm mb-4">
              <img src="/logo.jpg" alt="Go LineLess" className="h-14 w-auto" />
            </div>
            <h1 className="text-2xl font-black text-[#0A1628]">Welcome</h1>
            <p className="text-gray-500 text-sm mt-1">Life Without Waiting</p>
          </div>

          {step === "phone" ? (
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Mobile Number</label>
                <div className="flex border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2" style={{ "--tw-ring-color": "#0F2557" } as any}>
                  <span className="px-3 py-3 bg-gray-50 text-gray-600 font-medium border-r border-gray-200">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="9876543210"
                    className="flex-1 px-3 py-3 outline-none text-[#0A1628] text-lg tracking-wider"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={sendOtp.isPending}
                className="w-full py-4 rounded-2xl text-white font-bold text-lg"
                style={{ background: GOLD_GRAD }}
              >
                {sendOtp.isPending ? "Sending..." : "Get OTP"}
              </button>
              <p className="text-center text-sm text-gray-500 mt-2">
                Are you a runner?{" "}
                <button type="button" onClick={() => navigate("/runner/login")} className="font-semibold" style={{ color: "#0F2557" }}>
                  Login here
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-500">Enter the 6-digit OTP sent to</p>
                <p className="font-semibold text-[#0A1628]">+91 {phone}</p>
                <button type="button" onClick={() => setStep("phone")} className="text-xs mt-1" style={{ color: "#0F2557" }}>Change number</button>
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
                    onKeyDown={(e) => { if (e.key === "Backspace" && !digit && idx > 0) document.getElementById(`otp-${idx - 1}`)?.focus(); }}
                    className="w-11 h-14 border-2 border-gray-200 rounded-xl text-center text-2xl font-bold focus:outline-none transition-colors"
                    style={{ color: "#0F2557", borderColor: digit ? "#0F2557" : "" }}
                  />
                ))}
              </div>
              <button
                type="submit"
                disabled={verifyOtp.isPending}
                className="w-full py-4 rounded-2xl text-white font-bold text-lg"
                style={{ background: NAVY_GRAD }}
              >
                {verifyOtp.isPending ? "Verifying..." : "Verify & Continue"}
              </button>
              <button
                type="button"
                onClick={() => sendOtp.mutate({ data: { phone: `+91${phone}`, role: "user" } })}
                className="w-full text-center text-sm text-gray-500"
              >
                Didn't receive? <span className="font-semibold" style={{ color: "#0F2557" }}>Resend OTP</span>
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
