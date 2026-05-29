import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useGetTask, useSubmitReview } from "@workspace/api-client-react";
import { UserBottomNav } from "@/components/BottomNav";
import { CATEGORY_ICONS, CATEGORY_NAMES, STATUS_LABELS, STATUS_COLORS, formatCurrency } from "@/lib/utils";

interface Props { id: string; }

const TIMELINE_STEPS = [
  { status: "pending", label: "Task Booked" },
  { status: "assigned", label: "Runner Assigned" },
  { status: "on_the_way", label: "On the Way" },
  { status: "at_location", label: "Reached" },
  { status: "in_progress", label: "In Progress" },
  { status: "completed", label: "Completed" },
];

const STATUS_ORDER = ["pending", "assigned", "on_the_way", "at_location", "in_progress", "completed"];

function LeafletMap({ task }: { task: any }) {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let map: any;
    const load = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      // Fix default icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const lat = task.locationLat ? Number(task.locationLat) : 23.0225;
      const lng = task.locationLng ? Number(task.locationLng) : 72.5714;

      map = L.map(containerRef.current!).setView([lat, lng], 14);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors"
      }).addTo(map);

      // Task location marker
      L.marker([lat, lng]).addTo(map)
        .bindPopup(`<b>${task.locationName ?? "Task Location"}</b><br>${task.locationArea ?? ""}`);
    };
    load().catch(console.error);
    return () => { map?.remove(); mapRef.current = null; };
  }, [task]);

  return <div ref={containerRef} className="w-full h-full" />;
}

export default function TaskDetail({ id }: Props) {
  const [, navigate] = useLocation();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const { data: task, isLoading, refetch } = useGetTask(id, { query: { refetchInterval: 5000 } });
  const submitReview = useSubmitReview();

  useEffect(() => { refetch(); }, [id]);

  const handleReview = () => {
    if (!rating) { toast.error("Please select a rating"); return; }
    submitReview.mutate({ id, body: { rating, review: reviewText } } as any, {
      onSuccess: () => { toast.success("Review submitted!"); refetch(); },
      onError: () => toast.error("Failed to submit review"),
    });
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#6C3FD4] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500">Loading task...</p>
      </div>
    </div>
  );

  if (!task) return <div className="p-8 text-center text-gray-500">Task not found</div>;

  const t = task as any;
  const statusIdx = STATUS_ORDER.indexOf(t.status);
  const currentStepIdx = TIMELINE_STEPS.findIndex(s => s.status === t.status);

  return (
    <div className="min-h-screen bg-[#F8F7FF] pb-24">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate("/app/tasks")} className="text-xl text-gray-500">←</button>
        <div className="flex-1">
          <h1 className="font-bold text-[#1A1A2E]">Task #{t.id}</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[t.status] ?? ""}`}>{STATUS_LABELS[t.status]}</span>
        </div>
        <span className="text-xl">{CATEGORY_ICONS[t.category] ?? "📦"}</span>
      </div>

      {/* Map */}
      <div className="relative h-56 bg-gray-100">
        <LeafletMap task={t} />
        {t.runner && (
          <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#6C3FD4] rounded-full flex items-center justify-center text-white font-bold">
              {t.runner.name?.[0] ?? "R"}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-[#1A1A2E]">{t.runner.name ?? "Runner"}</p>
              <p className="text-xs text-gray-500">{t.runner.rating ? `⭐ ${Number(t.runner.rating).toFixed(1)}` : "New Runner"} · ETA ~8 mins</p>
            </div>
            <div className="flex gap-2">
              <a href={`tel:${t.runner.phone}`} className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center text-green-600">📞</a>
              <a href={`https://wa.me/${t.runner.phone?.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center text-green-600">💬</a>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Task info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{CATEGORY_ICONS[t.category]}</span>
            <div>
              <h2 className="font-bold text-[#1A1A2E]">{CATEGORY_NAMES[t.category]}</h2>
              {t.locationName && <p className="text-xs text-gray-500">{t.locationName}, {t.locationArea}</p>}
            </div>
          </div>
          <p className="text-sm text-gray-600">{t.description}</p>
          <div className="flex justify-between mt-3 pt-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Total</span>
            <span className="font-bold text-[#6C3FD4]">{formatCurrency(t.price)}</span>
          </div>
        </div>

        {/* Status timeline */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-[#1A1A2E] mb-4">Status</h3>
          <div className="space-y-3">
            {TIMELINE_STEPS.map((step, i) => {
              const done = STATUS_ORDER.indexOf(step.status) <= statusIdx;
              const current = step.status === t.status;
              return (
                <div key={step.status} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${done ? "bg-[#6C3FD4]" : "bg-gray-100"}`}>
                    {done ? (
                      <span className="text-white text-xs font-bold">✓</span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-gray-300" />
                    )}
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div className={`absolute ml-3 w-0.5 h-3 ${done ? "bg-[#6C3FD4]" : "bg-gray-200"}`} style={{ transform: "translateY(14px)" }} />
                  )}
                  <span className={`text-sm ${current ? "font-bold text-[#6C3FD4]" : done ? "text-gray-700" : "text-gray-400"}`}>
                    {step.label}
                    {current && ["assigned","on_the_way","at_location","in_progress"].includes(step.status) && (
                      <span className="ml-2 w-1.5 h-1.5 bg-[#6C3FD4] rounded-full inline-block animate-pulse" />
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* OTP */}
        {t.otp && t.status !== "completed" && (
          <div className="rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg, #6C3FD4, #9B6FF7)" }}>
            <p className="text-white/80 text-xs mb-2">Share this OTP with your runner to complete the task:</p>
            <div className="flex gap-2 mb-3">
              {t.otp.split("").map((d: string, i: number) => (
                <div key={i} className="w-10 h-12 bg-white/20 border border-white/30 rounded-xl flex items-center justify-center text-xl font-black">{d}</div>
              ))}
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(t.otp); toast.success("OTP copied!"); }}
              className="text-xs text-white/80 underline"
            >
              Copy OTP
            </button>
          </div>
        )}

        {/* Rating */}
        {t.status === "completed" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-5 shadow-sm"
          >
            <h3 className="font-bold text-[#1A1A2E] mb-4">Rate your Runner</h3>
            <div className="flex gap-2 justify-center mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-3xl transition-transform hover:scale-110 ${star <= rating ? "text-yellow-400" : "text-gray-300"}`}
                >★</button>
              ))}
            </div>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Write a review (optional)"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#6C3FD4] resize-none"
            />
            <button
              onClick={handleReview}
              disabled={submitReview.isPending || submitReview.isSuccess}
              className="w-full py-3 rounded-xl text-white font-semibold"
              style={{ background: "linear-gradient(135deg, #6C3FD4, #9B6FF7)" }}
            >
              {submitReview.isSuccess ? "Review Submitted ✓" : submitReview.isPending ? "Submitting..." : "Submit Review"}
            </button>
          </motion.div>
        )}
      </div>
      <UserBottomNav />
    </div>
  );
}
