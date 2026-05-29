import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useSendOtp, useVerifyOtp } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";

export default function RunnerLogin() {
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
    sendOtp.mutate({ body: { phone: `+91${phone}`, role: "runner" } }, {
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
    verifyOtp.mutate({ body: { phone: `+91${phone}`, otp: otpStr, role: "runner" } }, {
      onSuccess: (data) => {
        login(data.token, "runner", undefined, (data as any).runner);
        toast.success("Welcome, Runner!");
        navigate("/runner/feed");
      },
      onError: () => toast.error("Invalid OTP"),
    });
  };

  const handleOtpChange = (val: string, idx: number) => {
    if (val.length > 1) return;
    const next = [...otp]; next[idx] = val;
    setOtp(next);
    if (val && idx < 5) document.getElementById(`otp-r-${idx + 1}`)?.focus();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #1A1A2E 0%, #2D1B69 100%)" }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, #FF6B35, #FF8C42)" }}>
              <span className="text-white text-2xl">🏃</span>
            </div>
            <h1 className="text-2xl font-black text-white">Runner Portal</h1>
            <p className="text-white/60 text-sm mt-1">Earn up to Rs 1,500 daily</p>
          </div>

          {step === "phone" ? (
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-white/80 mb-1 block">Mobile Number</label>
                <div className="flex border border-white/20 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#FF6B35] bg-white/5">
                  <span className="px-3 py-3 text-white/60 border-r border-white/20 font-medium">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="9876543210"
                    className="flex-1 px-3 py-3 outline-none bg-transparent text-white text-lg tracking-wider placeholder:text-white/30"
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
              <p className="text-center text-sm text-white/60">
                Looking to hire?{" "}
                <button type="button" onClick={() => navigate("/login")} className="text-[#FF6B35] font-semibold">
                  Book a runner
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-white/60">Enter 6-digit OTP sent to</p>
                <p className="font-semibold text-white">+91 {phone}</p>
              </div>
              <div className="flex gap-2 justify-center">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-r-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, idx)}
                    onKeyDown={(e) => { if (e.key === "Backspace" && !digit && idx > 0) document.getElementById(`otp-r-${idx - 1}`)?.focus(); }}
                    className="w-11 h-14 bg-white/10 border-2 border-white/20 rounded-xl text-center text-2xl font-bold text-[#FF6B35] focus:border-[#FF6B35] focus:outline-none"
                  />
                ))}
              </div>
              <button
                type="submit"
                disabled={verifyOtp.isPending}
                className="w-full py-4 rounded-2xl text-white font-bold text-lg"
                style={{ background: "linear-gradient(135deg, #FF6B35, #FF8C42)" }}
              >
                {verifyOtp.isPending ? "Verifying..." : "Start Earning!"}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
