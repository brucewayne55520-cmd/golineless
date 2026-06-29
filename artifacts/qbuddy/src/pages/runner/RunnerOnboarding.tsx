import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Phone, User, MapPin, CreditCard, Camera, Wifi,
  CheckCircle2, ArrowRight, ArrowLeft, Shield, Navigation,
  Smartphone, Loader2,
} from "lucide-react";
import { useGetRunnerMe, useSaveOnboardingStep, useToggleOnlineStatus, useGpsHealthCheck } from "@workspace/api-client-react";
import { BLUE, BLUE_GRAD } from "@/lib/theme";
const BG = "#080E1E";

const STEPS = [
  { label: "Phone", icon: Phone, desc: "Verify your number" },
  { label: "Name", icon: User, desc: "Tell us your name" },
  { label: "Location", icon: MapPin, desc: "Enable GPS" },
  { label: "Bank", icon: CreditCard, desc: "Add bank details" },
  { label: "Selfie", icon: Camera, desc: "Upload a selfie" },
  { label: "Go Live", icon: Wifi, desc: "Start earning" },
];

export default function RunnerOnboarding() {
  const [, navigate] = useLocation();
  const { data: runner, refetch } = useGetRunnerMe();

  const saveOnboardingStep = useSaveOnboardingStep();
  const toggleOnline = useToggleOnlineStatus();
  const gpsCheck = useGpsHealthCheck();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [selfie, setSelfie] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"checking" | "granted" | "denied" | "unavailable">("checking");
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Initialize step from existing onboarding progress
  useEffect(() => {
    const r = runner as import("@workspace/api-client-react").Runner & { onboardingStep?: number; bankAccount?: string; bankIfsc?: string; bankAccountHolder?: string; selfie?: string };
    if (r) {
      setStep(r.onboardingStep ?? 0);
      setName(r.name || r.fullName || "");
      setBankAccount(r.bankAccount || "");
      setBankIfsc(r.bankIfsc || "");
      setBankHolder(r.bankAccountHolder || "");
      setSelfie(r.selfie || null);
    }
  }, [runner]);

  const saveStep = async (stepNum: number, extra: Record<string, string | boolean | number | undefined> = {}) => {
    setSaving(true);
    try {
      await saveOnboardingStep.mutateAsync({ data: { step: stepNum, ...extra } });
      await refetch();
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save progress");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (step === 0) {
      // Phone already verified via login
      await saveStep(1);
      setStep(1);
    } else if (step === 1) {
      if (!name.trim()) { toast.error("Please enter your name"); return; }
      const ok = await saveStep(2, { name: name.trim(), fullName: name.trim() });
      if (ok) setStep(2);
    } else if (step === 2) {
      // GPS check happens inline, just proceed
      const ok = await saveStep(3, { gpsStatus: gpsStatus, lat: gpsCoords?.lat, lng: gpsCoords?.lng });
      if (ok) setStep(3);
    } else if (step === 3) {
      if (!bankAccount.trim() || !bankIfsc.trim() || !bankHolder.trim()) {
        toast.error("Please fill all bank details");
        return;
      }
      const ok = await saveStep(4, {
        bankAccount: bankAccount.trim(),
        bankIfsc: bankIfsc.trim().toUpperCase(),
        bankAccountHolder: bankHolder.trim(),
      });
      if (ok) setStep(4);
    } else if (step === 4) {
      if (!selfie) { toast.error("Please take a selfie"); return; }
      const ok = await saveStep(5, { selfie });
      if (ok) setStep(5);
    } else if (step === 5) {
      // Save onboarding completion FIRST, then toggle online
      setOnlineLoading(true);
      try {
        await saveStep(6);
        await toggleOnline.mutateAsync({ data: { isOnline: true } });
        setCompleted(true);
        toast.success("You're live! Tasks will start appearing.");
        setTimeout(() => navigate("/runner/feed"), 1500);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Setup incomplete. Please try again.");
      } finally {
        setOnlineLoading(false);
      }
    }
    return;
  };

  const checkGps = () => {
    setGpsStatus("checking");
    if (!navigator.geolocation) {
      setGpsStatus("unavailable");
      toast.error("Geolocation is not available on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsStatus("granted");
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        // Send GPS check to backend using hook
        gpsCheck.mutate({
          data: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            status: "granted",
          },
        });
        toast.success("Location access granted!");
      },
      (err) => {
        setGpsStatus("denied");
        toast.error("Location permission denied. You can enable it later in settings.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Auto-check GPS on step 2 entrance — M9 FIX: include checkGps in deps
  useEffect(() => {
    if (step === 2 && gpsStatus === "checking") {
      const timer = setTimeout(checkGps, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [step, gpsStatus]);

  const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setSelfie(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const stepProgress = ((step) / (STEPS.length - 1)) * 100;

  const inputClass = "w-full bg-white/10 border border-white/20 rounded-xl px-3.5 py-3 text-white text-sm focus:outline-none focus:border-blue-600/50 transition-colors placeholder-white/30";

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BG }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg" style={{ background: BLUE_GRAD }}>
            <CheckCircle2 size={40} className="text-gray-900" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">You're Live!</h1>
          <p className="text-white/60 text-sm mb-6">Your Comrade profile is active. Dispatching tasks near you...</p>
          <div className="w-10 h-10 border-4 rounded-full animate-spin mx-auto" style={{ borderColor: BLUE, borderTopColor: "transparent" }} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <img src="/logo.jpg" alt="" className="h-6 w-auto brightness-0 invert" />
          </div>
          <div>
            <h1 className="text-white font-black text-lg">Become a Comrade</h1>
            <p className="text-white/40 text-xs">Step {step + 1} of {STEPS.length}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: BLUE_GRAD }}
            initial={{ width: 0 }}
            animate={{ width: `${stepProgress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Step indicators */}
        <div className="flex justify-between mt-2">
          {STEPS.map((s, i) => {
            const done = i < step;
            const current = i === step;
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex flex-col items-center gap-1" style={{ opacity: current || done ? 1 : 0.3 }}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${done ? "" : current ? "" : "bg-white/10"}`}
                  style={done ? { background: BLUE } : current ? { borderColor: BLUE, borderWidth: 2 } : {}}>
                  {done ? <CheckCircle2 size={12} className="text-gray-900" /> : <Icon size={11} className="text-white/50" />}
                </div>
                <span className="text-[8px] font-semibold text-white/40">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && (
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-5">
                  <Smartphone size={36} className="text-blue-600" />
                </div>
                <h2 className="text-white font-black text-xl mb-2">Phone Verified ✓</h2>
                <p className="text-white/50 text-sm mb-6">{runner?.phone || "Your number is verified"}</p>
                <div className="bg-green-500/15 border border-green-500/30 rounded-xl p-3 inline-flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-400" />
                  <span className="text-green-400 text-sm font-semibold">Number confirmed</span>
                </div>
                <p className="text-white/30 text-xs mt-6">Let's set up your Comrade profile</p>
              </div>
            )}

            {step === 1 && (
              <div className="py-6">
                <div className="bg-white/8 border border-white/15 rounded-2xl p-5 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center mb-3">
                    <User size={22} className="text-blue-600" />
                  </div>
                  <h2 className="text-white font-black text-lg mb-1">What's your name?</h2>
                  <p className="text-white/40 text-xs mb-4">This is how clients will see you</p>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className={inputClass}
                    autoFocus
                  />
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <p className="text-white/40 text-xs leading-relaxed">
                    <Shield size={12} className="inline mr-1" />
                    Your name is only shared with clients after you accept a task.
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="py-6">
                <div className="bg-white/8 border border-white/15 rounded-2xl p-5 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-3">
                    <Navigation size={22} className="text-blue-400" />
                  </div>
                  <h2 className="text-white font-black text-lg mb-1">Live Location</h2>
                  <p className="text-white/40 text-xs mb-4">Enable GPS so we can dispatch nearby tasks</p>

                  {gpsStatus === "checking" && (
                    <div className="flex items-center gap-3 bg-white/10 rounded-xl p-4">
                      <Loader2 size={20} className="animate-spin text-blue-600" />
                      <div>
                        <p className="text-white font-semibold text-sm">Checking location...</p>
                        <p className="text-white/40 text-xs">Please allow location access</p>
                      </div>
                    </div>
                  )}
                  {gpsStatus === "granted" && (
                    <div className="bg-green-500/15 border border-green-500/30 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 size={20} className="text-green-400" />
                        <div>
                          <p className="text-green-400 font-semibold text-sm">Location Active ✓</p>
                          <p className="text-green-400/60 text-xs">
                            {gpsCoords ? `${gpsCoords.lat.toFixed(4)}, ${gpsCoords.lng.toFixed(4)}` : "Position acquired"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {gpsStatus === "denied" && (
                    <div className="bg-red-500/15 border border-red-500/30 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <MapPin size={20} className="text-red-400" />
                        <div>
                          <p className="text-red-400 font-semibold text-sm">Location Blocked</p>
                          <p className="text-red-400/60 text-xs">Enable in browser settings → Location</p>
                        </div>
                      </div>
                      <button onClick={checkGps} className="mt-3 w-full py-2 rounded-xl bg-white/10 text-white text-sm font-semibold">
                        Try Again
                      </button>
                    </div>
                  )}
                  {gpsStatus === "unavailable" && (
                    <div className="bg-yellow-500/15 border border-yellow-500/30 rounded-xl p-4">
                      <p className="text-yellow-400 font-semibold text-sm">GPS not available</p>
                      <p className="text-yellow-400/60 text-xs">Location services not supported on this device</p>
                    </div>
                  )}
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <p className="text-white/40 text-xs leading-relaxed">
                    <Shield size={12} className="inline mr-1" />
                    Your location is only tracked while online and on active tasks. Never shared with third parties.
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="py-6">
                <div className="bg-white/8 border border-white/15 rounded-2xl p-5 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-3">
                    <CreditCard size={22} className="text-emerald-400" />
                  </div>
                  <h2 className="text-white font-black text-lg mb-1">Bank Details</h2>
                  <p className="text-white/40 text-xs mb-4">Where should we send your earnings?</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-white/50 text-xs font-semibold mb-1 block">Account Holder Name</label>
                      <input
                        type="text"
                        value={bankHolder}
                        onChange={(e) => setBankHolder(e.target.value)}
                        placeholder="As per bank records"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-white/50 text-xs font-semibold mb-1 block">Account Number</label>
                      <input
                        type="text"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, ""))}
                        placeholder="9-18 digit account number"
                        className={inputClass}
                        maxLength={18}
                      />
                      {bankAccount.length > 0 && (!/^\d{9,18}$/.test(bankAccount)) && (
                        <p className="text-red-400 text-[10px] mt-1">Must be 9-18 digits only</p>
                      )}
                    </div>
                    <div>
                      <label className="text-white/50 text-xs font-semibold mb-1 block">IFSC Code</label>
                      <input
                        type="text"
                        value={bankIfsc}
                        onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                        placeholder="E.g. SBIN0001234"
                        className={inputClass}
                        maxLength={11}
                      />
                      {bankIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankIfsc) && (
                        <p className="text-red-400 text-[10px] mt-1">Invalid IFSC format (e.g. SBIN0001234)</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <p className="text-white/40 text-xs leading-relaxed">
                    <Shield size={12} className="inline mr-1" />
                    Weekly payouts processed every Monday. Bank details are encrypted and secure.
                  </p>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="py-6">
                <div className="bg-white/8 border border-white/15 rounded-2xl p-5 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center mb-3">
                    <Camera size={22} className="text-pink-400" />
                  </div>
                  <h2 className="text-white font-black text-lg mb-1">Upload a Selfie</h2>
                  <p className="text-white/40 text-xs mb-4">Helps clients identify you at pickup</p>
                  <label className="block cursor-pointer">
                    <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleFileRead} />
                    <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${selfie ? "border-green-500/50 bg-green-500/10" : "border-white/20 hover:border-white/30"}`}>
                      {selfie ? (
                        <div>
                          <img src={selfie} alt="" className="w-28 h-28 object-cover rounded-full mx-auto mb-3 shadow-xl border-4" style={{ borderColor: BLUE }} />
                          <p className="text-green-400 text-sm font-bold">Selfie uploaded ✓</p>
                          <p className="text-green-400/60 text-xs mt-0.5">Tap to retake</p>
                        </div>
                      ) : (
                        <div>
                          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
                            <Camera size={28} className="text-white/30" />
                          </div>
                          <p className="text-white/70 font-semibold">Take a selfie</p>
                          <p className="text-white/30 text-xs mt-1">Face clearly visible · Good lighting</p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <p className="text-white/40 text-xs leading-relaxed">
                    <Shield size={12} className="inline mr-1" />
                    Your selfie is used for identity verification and client recognition only.
                  </p>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="text-center py-6">
                <div className="bg-white/8 border border-white/15 rounded-2xl p-6 mb-5">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ background: BLUE_GRAD }}>
                    <Wifi size={28} className="text-gray-900" />
                  </div>
                  <h2 className="text-white font-black text-xl mb-2">Ready to Earn!</h2>
                  <p className="text-white/50 text-sm mb-6">
                    All set! Go online to start receiving nearby task dispatches.
                  </p>

                  {/* Readiness Score */}
                  <div className="bg-white/10 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/60 text-xs font-semibold">Dispatch Readiness</span>
                      <span className="text-white font-black">{name ? "100%" : "83%"}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                      <div className="h-full rounded-full" style={{ width: name ? "100%" : "83%", background: BLUE_GRAD }} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "KYC", ok: true },
                        { label: "GPS", ok: gpsStatus === "granted" },
                        { label: "Bank", ok: !!bankAccount },
                        { label: "Selfie", ok: !!selfie },
                        { label: "Online", ok: false },
                        { label: "Name", ok: !!name },
                      ].map((item) => (
                        <div key={item.label} className={`text-center p-1.5 rounded-lg ${item.ok ? "bg-green-500/15" : "bg-white/8"}`}>
                          <div className={`w-1.5 h-1.5 rounded-full mx-auto mb-1 ${item.ok ? "bg-green-400" : "bg-white/20"}`} />
                          <span className={`text-[9px] font-semibold ${item.ok ? "text-green-400" : "text-white/40"}`}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Go Online button */}
                  <button
                    onClick={handleNext}
                    disabled={onlineLoading}
                    className="w-full py-4 rounded-2xl text-gray-900 font-black text-lg flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl transition-all disabled:opacity-60"
                    style={{ background: BLUE_GRAD }}
                  >
                    {onlineLoading ? (
                      <><Loader2 size={18} className="animate-spin" /> Going Live...</>
                    ) : (
                      <><Wifi size={18} /> Go Online Now</>
                    )}
                  </button>
                  <p className="text-white/30 text-xs mt-3">
                    Tasks will appear on your feed as soon as you go online
                  </p>
                </div>

                <button
                  onClick={() => navigate("/runner/feed")}
                  className="text-white/40 text-sm hover:text-white/60 transition-colors"
                >
                  Skip for now — I'll go online later
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom actions */}
      <div className="px-4 pb-8 mt-auto">
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3.5 rounded-2xl border border-white/20 text-white/70 font-semibold text-sm hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={14} /> Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={saving || (step === 2 && gpsStatus === "checking") || (step === 2 && gpsStatus === "denied")}
            className="flex-[2] py-3.5 rounded-2xl text-gray-900 font-black text-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            style={{ background: BLUE_GRAD }}
          >
            {saving ? (
              <><Loader2 size={14} className="animate-spin" /> Saving...</>
            ) : step === 5 ? (
              "Go Online Now"
            ) : (
              <><span>Continue</span> <ArrowRight size={14} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
