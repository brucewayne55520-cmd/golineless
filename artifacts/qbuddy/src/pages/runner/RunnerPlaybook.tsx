import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { BookOpen, ChevronDown, ArrowLeft, CheckCircle2, Camera, MapPin, Clock, XCircle, ShieldAlert, type LucideIcon } from "lucide-react";
import type { PlaybookResponseSectionsItem } from "@workspace/api-client-react";
import { useGetRunnerPlaybook } from "@workspace/api-client-react";
import { NAVY, NAVY_GRAD, GOLD } from "@/lib/theme";

const SECTION_ICONS: Record<string, LucideIcon> = {
  "Task Acceptance Rules": CheckCircle2,
  "Photo Proof Rules": Camera,
  "GPS Rules": MapPin,
  "Waiting Rules": Clock,
  "Cancellation Rules": XCircle,
  "Emergency Escalation": ShieldAlert,
};

export default function RunnerPlaybook() {
  const [, navigate] = useLocation();
  const [expandedSection, setExpandedSection] = useState<string>("");
  const { data: playbook } = useGetRunnerPlaybook({ query: { queryKey: ["runnerPlaybook"] } });

  return (
    <div className="min-h-screen" style={{ background: "#F8F9FC" }}>
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/runner/feed")} className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="font-black text-[#0A1628] text-base">Operations Playbook</h1>
            <p className="text-xs text-gray-400">Comrade Operations Guide · v{playbook?.version || "1.0"}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-3">
        {/* Hero card */}
        <div className="rounded-2xl p-6 text-white relative overflow-hidden" style={{ background: NAVY_GRAD }}>
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10" style={{ background: `radial-gradient(circle, ${GOLD}, transparent)`, transform: "translate(30%,-30%)" }} />
          <BookOpen size={24} className="mb-2" />
          <h2 className="font-black text-lg">Your Operations Guide</h2>
          <p className="text-white/70 text-sm mt-1">Follow these rules for every task. This guide helps you deliver quality service and maintain high trust scores.</p>
        </div>

        {/* Sections */}
        {playbook?.sections?.map((section: PlaybookResponseSectionsItem) => {
          const title = section.title ?? "";
          const Icon = SECTION_ICONS[title] || BookOpen;
          const isExpanded = expandedSection === title;
          return (
            <motion.div
              key={title}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => setExpandedSection(isExpanded ? "" : title)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #EEF2FA, #D9E3F5)", color: NAVY }}>
                  <Icon size={18} />
                </div>                  <span className="flex-1 font-bold text-[#0A1628] text-sm">{title}</span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
                      {section.rules?.map((rule: string, i: number) => (
                        <div key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#EEF2FA", color: NAVY }}>
                            <span className="text-[10px] font-bold">{i + 1}</span>
                          </span>
                          <span className="leading-relaxed">{rule}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {/* Offline notice */}
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400">
            <BookOpen size={12} className="inline mr-1" />
            This guide is cached in your device for offline use. Last updated: {playbook?.lastUpdated ? new Date(playbook.lastUpdated).toLocaleDateString("en-IN") : "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}
