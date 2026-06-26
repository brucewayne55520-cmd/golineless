import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { BookOpen, ChevronDown, ArrowLeft, CheckCircle2, Camera, MapPin, Clock, XCircle, ShieldAlert, Search, Share2, type LucideIcon } from "lucide-react";
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
// L13: Section icon fallback — use first word of title to pick a reasonable icon
const ICON_WORDS: [string, LucideIcon][] = [
  ["photo", Camera], ["proof", Camera], ["gps", MapPin], ["location", MapPin],
  ["wait", Clock], ["time", Clock], ["cancel", XCircle], ["emergency", ShieldAlert],
  ["sos", ShieldAlert], ["accept", CheckCircle2], ["task", CheckCircle2],
];
function getSectionIcon(title: string): LucideIcon {
  if (SECTION_ICONS[title]) return SECTION_ICONS[title];
  const lower = title.toLowerCase();
  for (const [word, icon] of ICON_WORDS) { if (lower.includes(word)) return icon; }
  return BookOpen;
}

export default function RunnerPlaybook() {
  const [, navigate] = useLocation();
  const [expandedSection, setExpandedSection] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: fetchedPlaybook, isLoading } = useGetRunnerPlaybook({ query: { queryKey: ["runnerPlaybook"] } });

  // L2: Offline playbook caching — save to localStorage, use cache when offline
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cachedPlaybook, setCachedPlaybook] = useState<any>(null);
  useEffect(() => {
    if (fetchedPlaybook) {
      try { localStorage.setItem("golineless_playbook", JSON.stringify(fetchedPlaybook)); } catch { /* ignore */ }
    }
  }, [fetchedPlaybook]);
  useEffect(() => {
    try {
      const cached = localStorage.getItem("golineless_playbook");
      if (cached) setCachedPlaybook(JSON.parse(cached));
    } catch { /* ignore */ }
  }, []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playbook: any = fetchedPlaybook || cachedPlaybook;

  return (
    <div className="min-h-screen" style={{ background: "#080E1E" }}>
      {/* Header */}
      <div className="bg-white/5 px-4 py-3 border-b border-white/10 shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/runner/feed")} className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/15 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="font-black text-white text-base">Operations Playbook</h1>
            <p className="text-xs text-white/40">Comrade Operations Guide · v{playbook?.version || "1.0"}</p>
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

        {/* H12: Search bar */}
        <div className="relative mb-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rules..."
            className="w-full bg-white/8 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs placeholder-white/30 focus:outline-none focus:border-white/20"
          />
        </div>

        {/* Sections */}
        {playbook?.sections?.map((section: PlaybookResponseSectionsItem) => {
          const title = section.title ?? "";
          const Icon = getSectionIcon(title);
          const isExpanded = expandedSection === title;
          // H12: Filter sections by search query
          const matchesSearch = !searchQuery || title.toLowerCase().includes(searchQuery.toLowerCase()) || section.rules?.some((r: string) => r.toLowerCase().includes(searchQuery.toLowerCase()));
          if (!matchesSearch) return null;
          return (
            <motion.div
              key={title}
              className="bg-white/8 rounded-2xl shadow-sm border border-white/10 overflow-hidden"
            >
              <button
                onClick={() => setExpandedSection(isExpanded ? "" : title)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}>
                  <Icon size={18} />
                </div>                  <span className="flex-1 font-bold text-white text-sm">{title}</span>
                <ChevronDown size={16} className={`text-white/40 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2 border-t border-white/10 pt-3">
                      {section.rules?.map((rule: string, i: number) => (
                        <div key={i} className="flex items-start gap-2.5 text-sm text-white/60">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}>
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

        {/* L5: Share playbook button */}
        <button
          onClick={async () => {
            const text = playbook?.sections?.map((s: PlaybookResponseSectionsItem) => `${s.title}\n${s.rules?.map((r: string, i: number) => `  ${i+1}. ${r}`).join("\n") || ""}`).join("\n\n") || "Go LineLess Operations Playbook";
            if (navigator.share) {
              try { await navigator.share({ title: "Go LineLess Playbook", text }); } catch { /* user cancelled */ }
            } else {
              await navigator.clipboard.writeText(text);
              toast.success("Playbook copied to clipboard!");
            }
          }}
          className="w-full py-3 rounded-xl border border-white/20 text-white/60 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
        >
          <Share2 size={14} /> Share Playbook
        </button>

        {/* Offline notice */}
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-xs text-white/30">
            <BookOpen size={12} className="inline mr-1" />
            This guide is cached for offline use. Last updated: {playbook?.lastUpdated ? new Date(playbook.lastUpdated).toLocaleDateString("en-IN") : "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}
