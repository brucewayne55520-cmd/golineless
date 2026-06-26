import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import AdminSidebar from "@/components/AdminSidebar";
import { useGetHeatmap } from "@workspace/api-client-react";
import { MapPin, Users, AlertTriangle, Plus, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { NAVY } from "@/lib/theme";


const DEFAULT_AREAS = [
  "Juhapura", "Sarkhej", "Prahladnagar", "Makarba", "Paldi", "Vasna", "Jamalpur", "Kalupur",
];

function getCustomAreas(): string[] {
  try { return JSON.parse(localStorage.getItem("golineless_heatmap_areas") || "[]"); } catch { return []; }
}

function saveCustomAreas(areas: string[]) {
  localStorage.setItem("golineless_heatmap_areas", JSON.stringify(areas));
}

export default function AdminHeatmap() {
  const { data, isLoading, refetch } = useGetHeatmap();
  const [newArea, setNewArea] = useState("");
  const [customAreas, setCustomAreas] = useState<string[]>(getCustomAreas);

  // L3: Store previous heatmap snapshot for trend arrows
  // Read previous snapshot on mount, then write current to a separate key
  const [prevSnapshot, setPrevSnapshot] = useState<Record<string, number>>({});
  useEffect(() => {
    try {
      // prev = what was stored last session as 'current'
      setPrevSnapshot(JSON.parse(localStorage.getItem("golineless_heatmap_prev") || "{}"));
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    if (data?.areas) {
      const snapshot: Record<string, number> = {};
      data.areas.forEach((a: Required<import("@workspace/api-client-react").HeatmapDataAreasItem>) => { snapshot[a.area] = a.demand; });
      // Write current snapshot to 'prev' key so it becomes previous on next load
      localStorage.setItem("golineless_heatmap_prev", JSON.stringify(snapshot));
    }
  }, [data]);

  // Merge default + custom areas for display
  const allAreas = [...DEFAULT_AREAS, ...customAreas];
  const areaNames = data?.areas?.map((a: Required<import("@workspace/api-client-react").HeatmapDataAreasItem>) => a.area) ?? [];
  const displayAreas = areaNames.length > 0 ? areaNames : allAreas;

  const maxDemand = data ? Math.max(...(data?.areas || []).map((a: Required<import("@workspace/api-client-react").HeatmapDataAreasItem>) => a.demand), 1) : 1;
  const maxSupply = data ? Math.max(...(data?.areas || []).map((a: Required<import("@workspace/api-client-react").HeatmapDataAreasItem>) => a.supply), 1) : 1;

  const addCustomArea = async () => {
    const area = newArea.trim();
    if (!area) return;
    if (customAreas.includes(area) || DEFAULT_AREAS.includes(area)) {
      toast.error("Area already exists"); return;
    }
    // Store custom areas in localStorage (backend doesn't have a heatmapAreas column yet)
    const next = [...customAreas, area];
    saveCustomAreas(next);
    setCustomAreas(next);
    setNewArea("");
    toast.success(`Added area: ${area}`);
  };

  // L3: Compute trend for an area vs previous snapshot
  const getTrend = (area: string, currentDemand: number): "up" | "down" | "flat" => {
    const prev = prevSnapshot[area];
    if (prev == null || prev === currentDemand) return "flat";
    return currentDemand > prev ? "up" : "down";
  };

  const removeArea = (area: string) => {
    if (!window.confirm(`Remove "${area}" from the heatmap?`)) return;
    const next = customAreas.filter(a => a !== area);
    saveCustomAreas(next);
    setCustomAreas(next);
    toast.success(`Removed area: ${area}`);
  };

  return (
    <div className="flex min-h-screen gl-surface dark:bg-[#0A0E1A]">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-[#0A1628] dark:text-[#F5F0E8]">City Heatmap</h1>
          <div className="flex items-center gap-2">
            <input
              value={newArea}
              onChange={e => setNewArea(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCustomArea()}
              placeholder="Add new area..."
              className="w-48 border border-[#E5E0D8] dark:border-[#374151] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0A1628] bg-white dark:bg-[#1F2937] dark:text-[#F5F0E8] gl-transition"
            />
            <button onClick={addCustomArea} className="p-1.5 rounded-xl bg-white dark:bg-[#1F2937] border border-[#E5E0D8] dark:border-[#374151] hover:bg-[#FAF7F2] dark:hover:bg-[#111827] gl-transition" title="Add area">
              <Plus size={14} className="text-[#0A1628] dark:text-[#D4A843]" />
            </button>
          </div>
        </div>

        {/* Summary cards */}
        {data && (
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 gl-shadow-md border border-[#E5E0D8] dark:border-[#1F2937] text-center gl-transition">
              <MapPin size={18} className="mx-auto mb-1 text-[#0A1628] dark:text-[#D4A843]" />
              <p className="text-2xl font-bold text-[#0A1628] dark:text-[#F5F0E8]">{data.totalDemand}</p>
              <p className="text-[10px] text-[#9CA3AF]">Total Demand</p>
            </div>
            <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 gl-shadow-md border border-[#ECFDF5] dark:border-[#065F46] text-center gl-transition">
              <Users size={18} className="mx-auto mb-1 text-[#10B981]" />
              <p className="text-2xl font-bold text-[#059669]">{data.totalSupply}</p>
              <p className="text-[10px] text-[#9CA3AF]">Total Supply</p>
            </div>
            <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 gl-shadow-md border border-[#FEF2F2] dark:border-[#7F1D1D] text-center gl-transition">
              <AlertTriangle size={18} className="mx-auto mb-1 text-[#DC2626]" />
              <p className="text-2xl font-bold text-[#DC2626]">{data.totalShortage}</p>
              <p className="text-[10px] text-[#9CA3AF]">Total Shortage</p>
            </div>
          </div>
        )}

        {/* Area grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data?.areas || []).map((area: Required<import("@workspace/api-client-react").HeatmapDataAreasItem>, i: number) => {
            const demandPercent = (area.demand / maxDemand) * 100;
            const supplyPercent = (area.supply / maxSupply) * 100;
            const shortage = area.shortage > 0;
            const isCustom = !DEFAULT_AREAS.includes(area.area);
            return (
              <motion.div
                key={area.area}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`bg-white dark:bg-[#111827] rounded-2xl p-5 gl-shadow-md border ${shortage ? "border-[#FECACA] dark:border-[#7F1D1D]" : "border-[#E5E0D8] dark:border-[#1F2937]"} hover:gl-shadow-lg gl-transition`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} style={{ color: shortage ? "#EF4444" : NAVY }} />
                    <h3 className="font-bold text-[#0A1628] dark:text-[#F5F0E8]">{area.area}</h3>
                    {isCustom && (
                      <button onClick={() => removeArea(area.area)} className="p-0.5 rounded hover:bg-red-50 transition-colors" title="Remove custom area">
                        <X size={12} className="text-gray-400 hover:text-red-400" />
                      </button>
                    )}
                  </div>
                  {shortage && (
                    <span className="text-[10px] font-bold text-[#DC2626] bg-[#FEF2F2] px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle size={10} /> Shortage
                    </span>
                  )}
                  {(() => {
                    const trend = getTrend(area.area, area.demand);
                    if (trend === "up") return <span title="Demand increasing"><TrendingUp size={14} className="text-red-400" /></span>;
                    if (trend === "down") return <span title="Demand decreasing"><TrendingDown size={14} className="text-green-400" /></span>;
                    return <span title="Demand stable"><Minus size={14} className="text-gray-300" /></span>;
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-[#9CA3AF] mb-1">Demand ({area.demand})</p>
                    <div className="w-full bg-[#F3F4F6] rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${demandPercent}%` }}
                        className="h-full rounded-full" style={{ background: "#0A1628", width: `${demandPercent}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[#9CA3AF] mt-0.5">{area.activeTasks} active</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#9CA3AF] mb-1">Comrades ({area.supply})</p>
                    <div className="w-full bg-[#F3F4F6] rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${supplyPercent}%` }}
                        className="h-full rounded-full" style={{ background: "#10B981", width: `${supplyPercent}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[#9CA3AF] mt-0.5">{area.onlineRunners} online</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
