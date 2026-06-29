import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Star, Phone, MessageSquare, CheckCircle2, Camera, Clock, Navigation, Share2, UserPlus, Crosshair, AlertTriangle, FileText, Smartphone } from "lucide-react";
import { useGetTask, useSubmitReview, useGetRunnerLocation, useGenerateFamilyTrackingLink, useSubmitCustomerFeedback } from "@workspace/api-client-react";
import { UserBottomNav } from "@/components/BottomNav";
import { CategoryIcon } from "@/components/CategoryIcon";
import { StatusBadge } from "@/components/StatusBadge";
import { PaymentBadge } from "@/components/PaymentBadge";
import { PayButton } from "@/components/PayButton";
import { CATEGORY_NAMES, STATUS_LABELS, formatCurrency, calculateQueueGap, estimateWaitTime, calculateQueueProgress } from "@/lib/utils";
import { DARK, DARK_GRAD, BLUE, SURFACE_DIM } from "@/lib/theme";
interface Props { id: string; }

const TIMELINE_STEPS = [
  { status: "pending", label: "Task Booked" },
  { status: "assigned", label: "Comrade Assigned" },
  { status: "on_the_way", label: "Comrade On the Way" },
  { status: "at_location", label: "Comrade Arrived" },
  { status: "waiting_started", label: "Waiting in Queue" },
  { status: "in_progress", label: "In Progress" },
  { status: "completed", label: "Completed" },
];

const STATUS_ORDER = ["pending", "assigned", "on_the_way", "at_location", "waiting_started", "reached_pickup", "reached_task_location", "in_progress", "completed"];

function LeafletMap({ task, runnerLoc }: { task: import("@workspace/api-client-react").Task; runnerLoc?: Required<import("@workspace/api-client-react").RunnerLocation> }) {
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const runnerMarkerRef = useRef<import("leaflet").Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let map: import("leaflet").Map;
    const load = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const taskLat = task.taskLat ? Number(task.taskLat) : task.locationLat ? Number(task.locationLat) : 23.0225;
      const taskLng = task.taskLng ? Number(task.taskLng) : task.locationLng ? Number(task.locationLng) : 72.5714;

      map = L.map(containerRef.current!).setView([taskLat, taskLng], 13);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);

      // Task location marker
      const blueIcon = L.divIcon({
        html: `<div style="background:#0F172A;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg></div>`,
        className: "",
        iconSize: [24, 24],
      });
      L.marker([taskLat, taskLng], { icon: blueIcon }).addTo(map).bindPopup(`<b>${task.locationName || "Task Location"}</b>`);

      // Pickup marker if applicable
      if (task.pickupRequired && task.pickupLat && task.pickupLng) {
        const goldIcon = L.divIcon({
          html: `<div style="background:#3B82F6;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:10px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;">P</div>`,
          className: "",
          iconSize: [20, 20],
        });
        L.marker([Number(task.pickupLat), Number(task.pickupLng)], { icon: goldIcon }).addTo(map).bindPopup(`<b>Pickup: ${task.pickupAddress || ""}</b>`);
      }

      // Runner location marker
      const runnerLat = runnerLoc?.lat || taskLat;
      const runnerLng = runnerLoc?.lng || taskLng;
      if (task.runner && (task.status === "assigned" || task.status === "on_the_way" || task.status === "at_location" || task.status === "in_progress" || task.status === "waiting_started")) {
        const greenIcon = L.divIcon({
          html: `<div style="background:#22C55E;width:18px;height:18px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);animation:pulse 2s infinite"></div>`,
          className: "",
          iconSize: [18, 18],
        });
        runnerMarkerRef.current = L.marker([runnerLat, runnerLng], { icon: greenIcon }).addTo(map).bindPopup("<b>Your Comrade</b>");
      }
    };
    load().catch(() => {});
    return () => { map?.remove(); mapRef.current = null; };
  }, [task, task.id]);

  // Update runner marker position when location changes
  useEffect(() => {
    if (runnerMarkerRef.current && runnerLoc) {
      runnerMarkerRef.current.setLatLng([runnerLoc.lat, runnerLoc.lng]);
      runnerMarkerRef.current.setPopupContent(`<b>Your Comrade</b><br>${runnerLoc.lat.toFixed(4)}, ${runnerLoc.lng.toFixed(4)}`);
    }
  }, [runnerLoc]);

  return <div ref={containerRef} className="w-full h-full" />;
}

function ProofGallery({ photos }: { photos: string[] }) {
  if (!photos || photos.length === 0) return null;
  return (
    <div>
      <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1 mb-3"><Camera size={14} /> Proof Photos</h3>
      <div className="grid grid-cols-2 gap-2">
        {photos.map((photoStr: string, i: number) => {
          let proof: { imageUrl?: string; proofType?: string; timestamp?: string; address?: string; lat?: number; lng?: number; id?: number; runnerId?: number; taskStatus?: string; uploadedBy?: string; gpsVerified?: boolean };
          try { proof = JSON.parse(photoStr); } catch { return null; }
          if (!proof?.imageUrl) return null;
          return (
            <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm">
              <img src={proof.imageUrl} alt={proof.proofType || "Proof"} className="w-full h-28 object-cover" />
              <div className="p-2">
                <p className="text-[10px] font-medium text-gray-600 capitalize">{proof.proofType?.replace(/_/g, " ") || "Proof"}</p>
                <p className="text-[9px] text-gray-400">{proof.timestamp ? new Date(proof.timestamp).toLocaleString("en-IN") : ""}</p>
                {proof.address && <p className="text-[9px] text-gray-400 truncate">{proof.address}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TaskDetail({ id }: Props) {
  const [, navigate] = useLocation();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [issueReport, setIssueReport] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const { data: task, isLoading, refetch } = useGetTask(Number(id), { query: { queryKey: ["task", Number(id)], refetchInterval: 5000 } });
  const submitReview = useSubmitReview({});
  const generateTrackingLink = useGenerateFamilyTrackingLink();
  const submitFeedback = useSubmitCustomerFeedback();

  // Family tracking state
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [familyPhone, setFamilyPhone] = useState("");
  const [familyToken, setFamilyToken] = useState("");

  // Waiting timer display
  const [waitingElapsed, setWaitingElapsed] = useState(0);
  const [waitingActive, setWaitingActive] = useState(false);
  const waitingIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // (#16) Dispute confirmation modal state
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeLoading, setDisputeLoading] = useState(false);

  // (#19) Dispute countdown timer
  const [disputeCountdown, setDisputeCountdown] = useState("");
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Realtime queue update listener
  const queueSocketRef = useRef<{ disconnect: () => void; emit: (event: string, ...args: unknown[]) => void; on: (event: string, cb: (...args: unknown[]) => void) => void } | null>(null);
  useEffect(() => {
    if (!id) return;
    const init = async () => {
      const { io } = await import("socket.io-client");
      const token = localStorage.getItem("golineless_user_token") || localStorage.getItem("golineless_runner_token") || "";
      const sock = io(window.location.origin, { path: "/api/socket.io", auth: { token } });
      sock.emit("join_task", { taskId: Number(id) });
      sock.on("queue_updated", (data: Record<string, unknown>) => {
        if (data.taskId === Number(id)) {
          refetch();
        }
      });
      // Listen for cash payment confirmation from runner
      sock.on("cash_payment_confirmed", (data: Record<string, unknown>) => {
        if (data.taskId === Number(id)) {
          const runnerName = (data.runnerName as string) || "Comrade";
          const amount = data.amount as number | undefined;
          toast.success(
            `Cash payment confirmed by ${runnerName}` + (amount ? ` · ${formatCurrency(amount)}` : ""),
            { duration: 5000 }
          );
          refetch();
        }
      });
      queueSocketRef.current = sock;
    };
    init();
    return () => { queueSocketRef.current?.disconnect(); };
  }, [id]);

  const taskData = task;
  const runnerLocQuery = useGetRunnerLocation(
    taskData?.runner?.id ?? 0,
    Number(id),
    { query: { queryKey: ["runnerLocation", taskData?.runner?.id ?? 0, Number(id)], refetchInterval: taskData?.runner ? 3000 : undefined, enabled: !!taskData?.runner } }
  );
  const runnerLoc = runnerLocQuery.data as Required<import("@workspace/api-client-react").RunnerLocation>;

  useEffect(() => { refetch(); }, [id]);

  // Live waiting timer calculation
  useEffect(() => {
    if (!taskData) return;
    if (taskData.waitingStartedAt && !taskData.waitingEndedAt) {
      setWaitingActive(true);
      const startedMs = new Date(taskData.waitingStartedAt).getTime();
      const updateElapsed = () => setWaitingElapsed(Math.floor((Date.now() - startedMs) / 1000));
      updateElapsed();
      waitingIntervalRef.current = setInterval(updateElapsed, 1000);
    } else {
      setWaitingActive(false);
      setWaitingElapsed(0);
    }
    return () => { if (waitingIntervalRef.current) clearInterval(waitingIntervalRef.current); };
  }, [taskData?.waitingStartedAt, taskData?.waitingEndedAt, taskData?.id]);

  // (#19) Dispute countdown: calculate time remaining in 24hr window
  useEffect(() => {
    if (!taskData || taskData.paymentStatus !== "cash_pending" || !taskData.paymentConfirmedAt) {
      setDisputeCountdown("");
      return;
    }
    const confirmedMs = new Date(taskData.paymentConfirmedAt as string).getTime();
    const deadlineMs = confirmedMs + 24 * 60 * 60 * 1000;
    const updateCountdown = () => {
      const remaining = deadlineMs - Date.now();
      if (remaining <= 0) {
        setDisputeCountdown("Window expired — awaiting auto-finalization");
        clearInterval(countdownIntervalRef.current);
        return;
      }
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      setDisputeCountdown(`${hours}h ${minutes}m remaining to dispute`);
    };
    updateCountdown();
    countdownIntervalRef.current = setInterval(updateCountdown, 60000);
    return () => { if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current); };
  }, [taskData?.paymentStatus, taskData?.paymentConfirmedAt]);

  // (#16) Handle user dispute submission
  const handleDispute = async () => {
    setDisputeLoading(true);
    try {
      const res = await fetch(`/api/tasks/${id}/confirm-cash-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("golineless_user_token") || ""}`,
        },
        body: JSON.stringify({ action: "dispute", disputeReason: disputeReason || "Amount incorrect" }),
      });
      if (res.ok) {
        toast.success("Dispute submitted. Admin will review.");
        setShowDisputeModal(false);
        setDisputeReason("");
        refetch();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to submit dispute");
      }
    } catch {
      toast.error("Failed to submit dispute");
    } finally {
      setDisputeLoading(false);
    }
  };

  // (#16) Handle user confirm payment
  const handleConfirmPayment = async () => {
    try {
      const res = await fetch(`/api/tasks/${id}/confirm-cash-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("golineless_user_token") || ""}`,
        },
        body: JSON.stringify({ action: "confirm" }),
      });
      if (res.ok) {
        toast.success("Payment confirmed!");
        refetch();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to confirm");
      }
    } catch {
      toast.error("Failed to confirm payment");
    }
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const handleFamilyTracking = async () => {
    if (!familyName.trim() || !familyPhone.trim()) { toast.error("Please enter name and phone"); return; }
    generateTrackingLink.mutate({ id: Number(id), data: { familyContactName: familyName, familyContactPhone: familyPhone } }, {
      onSuccess: (data: import("@workspace/api-client-react").FamilyTrackingResponse) => {
        const token = data.familyTrackingToken ?? "";
        setFamilyToken(token);
        const shareUrl = `${window.location.origin}/family/track/${token}`;
        navigator.clipboard.writeText(shareUrl).catch(() => {});
        toast.success("Tracking link copied! Share it with family.");
      },
      onError: () => toast.error("Failed to create tracking link"),
    });
  };

  const handleReview = () => {
    if (!rating) { toast.error("Please select a rating"); return; }
    submitReview.mutate({ id: Number(id), data: { rating, review: reviewText } }, {
      onSuccess: () => {
        toast.success("Review submitted!");
        refetch();
        // Also submit feedback to feedback engine
        setFeedbackLoading(true);
        submitFeedback.mutate({ data: {
          taskId: Number(id),
          rating,
          feedback: reviewText,
          issueReport: issueReport || undefined,
        } }, {
          onSuccess: () => { setFeedbackSent(true); toast.success("Feedback recorded!"); },
          onError: () => { /* feedback optional, doesn't block */ },
          onSettled: () => setFeedbackLoading(false),
        });
      },
      onError: () => toast.error("Failed to submit review"),
    });
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: DARK, borderTopColor: "transparent" }} />
        <p className="text-gray-500">Loading task...</p>
      </div>
    </div>
  );

  if (!task) return <div className="p-8 text-center text-gray-500">Task not found</div>;

  const t = task;
  const statusIdx = STATUS_ORDER.indexOf(t.status);
  const proofPhotos: string[] = t.proofPhotos || [];
  const hasActiveRunner = t.runner && ["assigned","on_the_way","at_location","in_progress","waiting_started"].includes(t.status);

  // Estimated completion time
  let eta = "";
  if (t.estimatedDurationMinutes && t.acceptedAt) {
    const etaDate = new Date(t.acceptedAt);
    etaDate.setMinutes(etaDate.getMinutes() + t.estimatedDurationMinutes);
    eta = etaDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } else if (t.scheduledAt) {
    eta = new Date(t.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="min-h-screen pb-24 bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <button onClick={() => navigate("/app/tasks")} className="text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-gray-900">Task #{t.id}</h1>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            <StatusBadge status={t.status} />
            <PaymentBadge paymentStatus={t.paymentStatus} taskStatus={t.status} paymentMethod={t.paymentMethod} />
          </div>
        </div>
        <div style={{ color: DARK }}>
          <CategoryIcon category={t.category} size={22} />
        </div>
      </div>

      {/* Map with live comrade location */}
      <div className="relative h-56 bg-gray-100">
        <LeafletMap task={t} runnerLoc={runnerLoc} />
        {/* Status overlay banner */}
        <div className="absolute top-3 left-3 right-3 flex justify-between">
          <div className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${hasActiveRunner ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
            <span className="text-xs font-semibold text-gray-700">
              {hasActiveRunner ? "Live" : STATUS_LABELS[t.status] || t.status}
            </span>
          </div>
          {t.estimatedDurationMinutes && (
            <div className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1">
              <Clock size={11} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-600">~{t.estimatedDurationMinutes} min</span>
            </div>
          )}
        </div>
        {/* Comrade card overlay at bottom of map */}
        {t.runner && (
          <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm px-4 py-3 flex items-center gap-3 border-t border-gray-100">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: DARK_GRAD }}>
              {t.runner.name?.[0] ?? "C"}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-gray-900">{t.runner.name ?? "Comrade"}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                {t.runner.rating && <><Star size={10} className="text-yellow-400" /> {Number(t.runner.rating).toFixed(1)}</>}
                {!t.runner.rating && "New Comrade"}
                {runnerLoc && <span className="flex items-center gap-1 ml-1">· <Navigation size={9} className="text-green-500" /> Live</span>}
              </p>
            </div>
            <div className="flex gap-2">
              <a href={`tel:${t.runner.phone}`} className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <Phone size={16} />
              </a>
              <a href={`https://wa.me/${t.runner.phone?.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <MessageSquare size={16} />
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Task details card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div style={{ color: DARK }}>
              <CategoryIcon category={t.category} size={28} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{CATEGORY_NAMES[t.category]}</h2>
              {t.locationName && <p className="text-xs text-gray-500">{t.locationName}, {t.locationArea}</p>}
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2">{t.description}</p>
          <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
            {t.fromArea && t.toArea && (
              <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Navigation size={9} /> {t.fromArea} → {t.toArea}
              </span>
            )}
            {t.pickupRequired && (
              <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">📦 Pickup: {t.pickupArea || "Yes"}</span>
            )}
            {t.estimatedDurationMinutes && (
              <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">⏱ ~{t.estimatedDurationMinutes} min</span>
            )}
            {t.urgency === "urgent" && (
              <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">⚡ Urgent</span>
            )}
            {t.seniorInvolved && (
              <span className="text-[10px] bg-pink-50 text-pink-600 px-2 py-0.5 rounded-full font-medium">👴 Senior Care</span>
            )}
          </div>
          {t.specialInstructions && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-3">
              <p className="text-xs text-amber-700 font-medium">📝 {t.specialInstructions}</p>
            </div>
          )}
          {/* (#17) Invoice + (#18) Waiting charges breakdown */}
          <div className="space-y-1.5 mt-3 pt-3 border-t border-gray-100">
            {t.invoiceNumber && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1"><FileText size={10} /> Invoice</span>
                <span className="font-mono font-medium text-gray-600">{t.invoiceNumber}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Task Price</span>
              <span className="text-gray-600">{formatCurrency(t.price)}</span>
            </div>
            {(t.waitingChargeAmount ?? 0) > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Waiting Charges ({t.totalWaitingMinutes ?? 0} min)</span>
                <span className="text-amber-600">+{formatCurrency(t.waitingChargeAmount)}</span>
              </div>
            )}
            {t.paidAmount != null && Number(t.paidAmount) > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Paid Amount</span>
                <span className="text-green-600 font-medium">{formatCurrency(t.paidAmount!)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1.5 border-t border-gray-100">
              <span className="text-sm font-semibold text-gray-600">Total</span>
              <span className="font-bold" style={{ color: DARK }}>{formatCurrency((Number(t.price) || 0) + (Number(t.waitingChargeAmount) || 0))}</span>
            </div>
          </div>
          {/* (#16) Cash payment confirm/dispute actions */}           {t.paymentStatus === "cash_pending" && (
            <div className="mt-3 space-y-2">
              {disputeCountdown && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
                  <Clock size={12} className="text-amber-500" />
                  <span className="text-[11px] font-medium text-amber-700">{disputeCountdown}</span>
                </div>
              )}
              <button onClick={handleConfirmPayment}
                className="w-full py-3 rounded-xl text-white font-bold text-sm shadow-md" style={{ background: "linear-gradient(135deg, #16A34A, #22C55E)" }}>
                ✓ Confirm Payment Received
              </button>
              <button onClick={() => setShowDisputeModal(true)}
                className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-colors">
                <AlertTriangle size={14} /> Dispute Payment
              </button>
            </div>
          )}           {t.paymentStatus !== "paid" && t.paymentStatus !== "cash_pending" && !["completed","cancelled"].includes(t.status) && (
            <div className="mt-3">
              <PayButton taskId={t.id} variant="navy" price={t.price} paymentMethod={t.paymentMethod} />
            </div>
          )}
          {/* (#32) UPI QR button for cash tasks */}
          {t.paymentMethod === "cash" && ["assigned","on_the_way","at_location","in_progress"].includes(t.status) && (
            <button onClick={async () => {
              try {
                const res = await fetch(`/api/tasks/${t.id}/upi-qr`, { headers: { Authorization: `Bearer ${localStorage.getItem("golineless_user_token") || ""}` } });
                if (res.ok) {
                  const data = await res.json();
                  window.open(data.upiUri, "_blank");
                  toast.success(`Pay Rs ${data.amount} via UPI`);
                }
              } catch { toast.error("Failed to generate UPI link"); }
            }}
              className="w-full py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-600 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors mt-2">
              <Smartphone size={14} /> Pay via UPI
            </button>
          )}
        </div>

        {/* Live Status + ETA Row */}
        <div className="grid grid-cols-2 gap-3">
          {eta && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Est. Completion</p>
              <p className="text-lg font-black" style={{ color: DARK }}>{eta}</p>
              <p className="text-[10px] text-gray-400">Estimated time</p>
            </div>
          )}
          {(t.totalWaitingMinutes ?? 0) > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Total Waiting</p>
              <p className="text-lg font-black" style={{ color: BLUE }}>{t.totalWaitingMinutes ?? 0} min</p>
              <p className="text-[10px] text-gray-400">At location</p>
            </div>
          )}
          {t.estimatedDurationMinutes && !eta && !(t.totalWaitingMinutes) && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Duration</p>
              <p className="text-lg font-black" style={{ color: DARK }}>~{t.estimatedDurationMinutes} min</p>
              <p className="text-[10px] text-gray-400">Estimated</p>
            </div>
          )}
          {waitingActive && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border-2" style={{ borderColor: BLUE }}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Waiting Now</p>
              <p className="text-lg font-black font-mono" style={{ color: BLUE }}>{formatTime(waitingElapsed)}</p>
              <p className="text-[10px] text-gray-400">Comrade is waiting</p>
            </div>
          )}
        </div>

        {/* Phase 4: Queue Intelligence Card — Premium Navy/Gold Design */}
        {t.tokenNumber && (
          <div className="rounded-2xl p-5 shadow-md border overflow-hidden relative" style={{ background: "linear-gradient(135deg, #0F172A, #1E293B)", borderColor: DARK }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: `radial-gradient(circle, ${BLUE}, transparent)`, transform: "translate(30%,-30%)" }} />
            <h3 className="font-bold text-white/80 text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Crosshair size={12} /> Queue Intelligence
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
                <p className="text-white/50 text-[9px] uppercase tracking-wide">Your Token</p>
                <p className="text-2xl font-black text-white mt-0.5">{t.tokenNumber}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
                <p className="text-white/50 text-[9px] uppercase tracking-wide">Current</p>
                <p className="text-2xl font-black mt-0.5" style={{ color: BLUE }}>{t.currentToken || "—"}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
                <p className="text-white/50 text-[9px] uppercase tracking-wide">Counter</p>
                <p className="text-2xl font-black text-white mt-0.5">{t.counterNumber || "—"}</p>
              </div>
            </div>

            {/* Computed Intelligence Row */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {(() => {
                const gap = calculateQueueGap(t.tokenNumber, t.currentToken);
                const wait = estimateWaitTime(gap);
                const progress = calculateQueueProgress(t.tokenNumber, t.currentToken);
                return (
                  <>
                    <div className="bg-white/8 backdrop-blur-sm rounded-xl p-3 text-center border border-white/5">
                      <p className="text-white/40 text-[9px] uppercase">Tokens Ahead</p>
                      <p className="text-lg font-black mt-0.5" style={{ color: BLUE }}>{gap != null ? gap : "—"}</p>
                    </div>
                    <div className="bg-white/8 backdrop-blur-sm rounded-xl p-3 text-center border border-white/5">
                      <p className="text-white/40 text-[9px] uppercase">Est. Wait</p>
                      <p className="text-lg font-black mt-0.5" style={{ color: BLUE }}>{wait != null ? `${wait} min` : "—"}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Progress Bar */}
            {(() => {
              const progress = calculateQueueProgress(t.tokenNumber, t.currentToken);
              if (progress == null) return null;
              return (
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/40 text-[9px] uppercase">Progress</span>
                    <span className="text-white/70 text-xs font-bold">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${BLUE}, #ffb066)` }} />
                  </div>
                </div>
              );
            })()}

            {/* Waiting Intelligence — combined waiting + queue estimate */}
            {((t.totalWaitingMinutes ?? 0) > 0 || t.waitingStartedAt) && (() => {
              const gap = calculateQueueGap(t.tokenNumber, t.currentToken);
              const wait = estimateWaitTime(gap);
              const waited = t.totalWaitingMinutes || 0;
              const totalEst = wait != null ? waited + wait : null;
              return (
                <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-white/30 text-[8px] uppercase">Waited</p>
                    <p className="text-white font-bold text-sm">{waited}m</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/30 text-[8px] uppercase">Remaining</p>
                    <p className="text-white font-bold text-sm">{wait != null ? `${wait}m` : "—"}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/30 text-[8px] uppercase">Total Est.</p>
                    <p className="font-bold text-sm" style={{ color: BLUE }}>{totalEst != null ? `${totalEst}m` : "—"}</p>
                  </div>
                </div>
              );
            })()}

            {/* Last updated */}
            <p className="text-white/20 text-[8px] text-center mt-2">
              Last updated: {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        )}

        {/* Live Status Timeline */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">Live Status</h3>
          <div className="space-y-0">
            {TIMELINE_STEPS.map((step, i) => {
              const done = STATUS_ORDER.indexOf(step.status) <= statusIdx;
              const current = step.status === t.status;
              const isLast = i === TIMELINE_STEPS.length - 1;
              return (
                <div key={step.status} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all border-2`}
                      style={done ? { background: DARK, borderColor: DARK } : { background: SURFACE_DIM, borderColor: "#E5E7EB" }}>
                      {done ? <CheckCircle2 size={14} className="text-white" /> : <span className="w-2 h-2 rounded-full bg-gray-300" />}
                    </div>
                    {!isLast && <div className={`w-0.5 h-6 mt-1 ${done ? "" : "bg-gray-200"}`} style={done ? { background: DARK } : {}} />}
                  </div>
                  <div className="pb-4">
                    <span className={`text-sm ${current ? "font-bold" : done ? "text-gray-700 font-medium" : "text-gray-400"}`}
                      style={current ? { color: DARK } : {}}>
                      {step.label}
                      {current && ["assigned","on_the_way","at_location","in_progress","waiting_started"].includes(step.status) && (
                        <span className="ml-2 w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: BLUE }} />
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Queue Timeline — parsed from taskTimeline entries */}
        {(() => {
          const queueEntries = (t.taskTimeline || []).filter((e: { status?: string; label?: string; timestamp?: string; proofType?: string }) => e?.status === "queue_updated");
          if (queueEntries.length === 0) return null;
          return (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-1">
                <Navigation size={14} /> Queue Timeline
              </h3>
              <div className="space-y-2">
                {queueEntries.map((entry: { status?: string; label?: string; timestamp?: string; proofType?: string }, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: BLUE }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 font-medium">{entry.label}</p>
                      <p className="text-gray-400 mt-0.5">{entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Proof photos gallery */}
        {proofPhotos.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <ProofGallery photos={proofPhotos} />
          </div>
        )}

        {/* Family Tracking Button */}
        {t.status !== "completed" && t.status !== "cancelled" && !familyToken && !t.familyTrackingToken && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1"><Share2 size={14} /> Family Tracking</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">Let your family track this task live — share a read-only link with them.</p>
            <button
              onClick={() => setShowFamilyModal(true)}
              className="w-full py-2.5 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-semibold transition-all"
              style={{ borderColor: DARK + "40", color: DARK }}
            >
              <UserPlus size={16} /> Add Family Contact
            </button>
          </div>
        )}

        {/* OTP section */}
        {t.otp && t.status !== "completed" && t.status !== "cancelled" && (
          <div className="rounded-2xl p-5 text-white shadow-md" style={{ background: DARK_GRAD }}>
            <p className="text-white/80 text-xs mb-2">Share this OTP with your Comrade to complete the task:</p>
            <div className="flex gap-2 mb-3">
              {String(t.otp).split("").map((d: string, i: number) => (
                <div key={i} className="w-10 h-12 bg-white/20 border border-white/30 rounded-xl flex items-center justify-center text-xl font-black">{d}</div>
              ))}
            </div>
            <button onClick={() => { navigator.clipboard.writeText(String(t.otp)); toast.success("OTP copied!"); }} className="text-xs text-white/80 underline">
              Copy OTP
            </button>
          </div>
        )}

        {/* Review section */}
        {t.status === "completed" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4">Rate your Comrade</h3>
            <div className="flex gap-2 justify-center mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)} className="transition-transform hover:scale-110">
                  <Star size={28} className={star <= rating ? "fill-yellow-400" : ""}
                    style={{ color: star <= rating ? "#FBBF24" : "#D1D5DB" }} />
                </button>
              ))}
            </div>
            <textarea
              value={reviewText} onChange={(e) => setReviewText(e.target.value)}
              placeholder="Write a review (optional)" rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 resize-none"
              style={{ "--tw-ring-color": DARK } as React.CSSProperties}
            />
            <textarea
              value={issueReport} onChange={(e) => setIssueReport(e.target.value)}
              placeholder="Report an issue? (optional)" rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 resize-none"
              style={{ "--tw-ring-color": DARK, color: "#DC2626" } as React.CSSProperties}
            />
            <button onClick={handleReview} disabled={submitReview.isPending || submitReview.isSuccess || feedbackLoading}
              className="w-full py-3 rounded-xl text-white font-semibold" style={{ background: submitReview.isSuccess && feedbackSent ? "linear-gradient(135deg, #16A34A, #22C55E)" : DARK_GRAD }}>
              {submitReview.isSuccess && feedbackSent ? "✓ Review & Feedback Submitted" : submitReview.isPending || feedbackLoading ? "Submitting..." : "Submit Review"}
            </button>
          </motion.div>
        )}
      </div>

      {/* (#16) Dispute Confirmation Modal */}
      <AnimatePresence>
        {showDisputeModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowDisputeModal(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 p-6 shadow-2xl">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={18} className="text-red-500" />
                <h3 className="font-black text-gray-900 text-lg">Dispute Payment</h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">Are you sure you want to dispute this payment? Admin will review the case.</p>
              <div className="space-y-3">
                <textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)}
                  placeholder="Reason for dispute (e.g., amount incorrect, service incomplete)"
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 resize-none"
                  style={{ "--tw-ring-color": "#EF4444" } as React.CSSProperties} />
                <div className="flex gap-3">
                  <button onClick={() => setShowDisputeModal(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">
                    Cancel
                  </button>
                  <button onClick={handleDispute} disabled={disputeLoading}
                    className="flex-1 py-3 rounded-xl text-white font-bold text-sm" style={{ background: "linear-gradient(135deg, #DC2626, #EF4444)" }}>
                    {disputeLoading ? "Submitting..." : "Submit Dispute"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Family Tracking Modal */}
      <AnimatePresence>
        {showFamilyModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowFamilyModal(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 p-6 shadow-2xl">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <h3 className="font-black text-gray-900 text-lg mb-1">Family Tracking</h3>
              <p className="text-gray-400 text-sm mb-4">Add a family contact to generate a read-only tracking link.</p>
              {familyToken ? (
                <div>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                    <p className="text-green-700 font-bold text-sm">✓ Tracking Link Created!</p>
                    <p className="text-green-600 text-xs mt-1">The link has been copied to your clipboard. Share it with your family.</p>
                  </div>
                  <button onClick={() => setShowFamilyModal(false)} className="w-full py-3 rounded-xl text-white font-bold" style={{ background: DARK_GRAD }}>
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="Family member name"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2" style={{ "--tw-ring-color": DARK } as React.CSSProperties} />
                  <input value={familyPhone} onChange={e => setFamilyPhone(e.target.value)} placeholder="Phone number"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2" style={{ "--tw-ring-color": DARK } as React.CSSProperties} />
                  <button onClick={handleFamilyTracking}
                    className="w-full py-3 rounded-xl text-white font-bold" style={{ background: DARK_GRAD }}>
                    Generate Tracking Link
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <UserBottomNav />
    </div>
  );
}
