import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Star, Phone, MessageSquare, CheckCircle2 } from "lucide-react";
import { useGetTask, useSubmitReview } from "@workspace/api-client-react";
import { UserBottomNav } from "@/components/BottomNav";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CATEGORY_NAMES, STATUS_LABELS, STATUS_COLORS, formatCurrency } from "@/lib/utils";

const NAVY = "#0F2557";
const NAVY_GRAD = "linear-gradient(135deg, #0F2557, #1D3D7C)";
const GOLD = "#C9A84C";
const GOLD_GRAD = "linear-gradient(135deg, #C9A84C, #D4B870)";

interface Props { id: string; }

const TIMELINE_STEPS = [
  { status: "pending", label: "Task Booked" },
  { status: "assigned", label: "Runner Assigned" },
  { status: "on_the_way", label: "On the Way" },
  { status: "at_location", label: "Runner Arrived" },
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
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors" }).addTo(map);
      L.marker([lat, lng]).addTo(map).bindPopup(`<b>${task.locationName ?? "Task Location"}</b><br>${task.locationArea ?? ""}`);
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
    submitReview.mutate({ id, data: { rating, review: reviewText } } as any, {
      onSuccess: () => { toast.success("Review submitted!"); refetch(); },
      onError: () => toast.error("Failed to submit review"),
    });
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8F9FC" }}>
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: NAVY, borderTopColor: "transparent" }} />
        <p className="text-gray-500">Loading task...</p>
      </div>
    </div>
  );

  if (!task) return <div className="p-8 text-center text-gray-500">Task not found</div>;

  const t = task as any;
  const statusIdx = STATUS_ORDER.indexOf(t.status);

  return (
    <div className="min-h-screen pb-24" style={{ background: "#F8F9FC" }}>
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-gray-100 shadow-sm">
        <button onClick={() => navigate("/app/tasks")} className="text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-[#0A1628]">Task #{t.id}</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[t.status] ?? ""}`}>{STATUS_LABELS[t.status]}</span>
        </div>
        <div style={{ color: NAVY }}>
          <CategoryIcon category={t.category} size={22} />
        </div>
      </div>

      <div className="relative h-56 bg-gray-100">
        <LeafletMap task={t} />
        {t.runner && (
          <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm px-4 py-3 flex items-center gap-3 border-t border-gray-100">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: NAVY_GRAD }}>
              {t.runner.name?.[0] ?? "R"}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-[#0A1628]">{t.runner.name ?? "Runner"}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                {t.runner.rating && <><Star size={10} className="text-yellow-400" /> {Number(t.runner.rating).toFixed(1)}</>}
                {!t.runner.rating && "New Runner"} · ETA ~8 mins
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
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div style={{ color: NAVY }}>
              <CategoryIcon category={t.category} size={28} />
            </div>
            <div>
              <h2 className="font-bold text-[#0A1628]">{CATEGORY_NAMES[t.category]}</h2>
              {t.locationName && <p className="text-xs text-gray-500">{t.locationName}, {t.locationArea}</p>}
            </div>
          </div>
          <p className="text-sm text-gray-600">{t.description}</p>
          <div className="flex justify-between mt-3 pt-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Total</span>
            <span className="font-bold" style={{ color: NAVY }}>{formatCurrency(t.price)}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-[#0A1628] mb-4">Live Status</h3>
          <div className="space-y-0">
            {TIMELINE_STEPS.map((step, i) => {
              const done = STATUS_ORDER.indexOf(step.status) <= statusIdx;
              const current = step.status === t.status;
              const isLast = i === TIMELINE_STEPS.length - 1;
              return (
                <div key={step.status} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all border-2`}
                      style={done
                        ? { background: NAVY, borderColor: NAVY }
                        : { background: "#F3F4F6", borderColor: "#E5E7EB" }}>
                      {done ? <CheckCircle2 size={14} className="text-white" /> : <span className="w-2 h-2 rounded-full bg-gray-300" />}
                    </div>
                    {!isLast && <div className={`w-0.5 h-6 mt-1 ${done ? "" : "bg-gray-200"}`} style={done ? { background: NAVY } : {}} />}
                  </div>
                  <div className="pb-4">
                    <span className={`text-sm ${current ? "font-bold" : done ? "text-gray-700 font-medium" : "text-gray-400"}`}
                      style={current ? { color: NAVY } : {}}>
                      {step.label}
                      {current && ["assigned","on_the_way","at_location","in_progress"].includes(step.status) && (
                        <span className="ml-2 w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: GOLD }} />
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {t.otp && t.status !== "completed" && (
          <div className="rounded-2xl p-5 text-white shadow-md" style={{ background: NAVY_GRAD }}>
            <p className="text-white/80 text-xs mb-2">Share this OTP with your runner to complete the task:</p>
            <div className="flex gap-2 mb-3">
              {t.otp.split("").map((d: string, i: number) => (
                <div key={i} className="w-10 h-12 bg-white/20 border border-white/30 rounded-xl flex items-center justify-center text-xl font-black">{d}</div>
              ))}
            </div>
            <button onClick={() => { navigator.clipboard.writeText(t.otp); toast.success("OTP copied!"); }} className="text-xs text-white/80 underline">
              Copy OTP
            </button>
          </div>
        )}

        {t.status === "completed" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-[#0A1628] mb-4">Rate your Runner</h3>
            <div className="flex gap-2 justify-center mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)} className="transition-transform hover:scale-110">
                  <Star size={28} className={star <= rating ? "fill-yellow-400" : ""} style={{ color: star <= rating ? "#FBBF24" : "#D1D5DB" }} />
                </button>
              ))}
            </div>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Write a review (optional)"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 resize-none"
              style={{ "--tw-ring-color": NAVY } as any}
            />
            <button
              onClick={handleReview}
              disabled={submitReview.isPending || submitReview.isSuccess}
              className="w-full py-3 rounded-xl text-white font-semibold"
              style={{ background: NAVY_GRAD }}
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
