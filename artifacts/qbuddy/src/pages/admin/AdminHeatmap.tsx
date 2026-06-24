import { motion } from "framer-motion";
import AdminSidebar from "@/components/AdminSidebar";
import { useGetHeatmap } from "@workspace/api-client-react";
import { MapPin, Users, AlertTriangle } from "lucide-react";
import { NAVY } from "@/lib/theme";

export default function AdminHeatmap() {
  const { data, isLoading } = useGetHeatmap();

  const maxDemand = data ? Math.max(...(data?.areas || []).map((a: Required<import("@workspace/api-client-react").HeatmapDataAreasItem>) => a.demand), 1) : 1;
  const maxSupply = data ? Math.max(...(data?.areas || []).map((a: Required<import("@workspace/api-client-react").HeatmapDataAreasItem>) => a.supply), 1) : 1;

  return (
    <div className="flex min-h-screen" style={{ background: "#F0F2F8" }}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <h1 className="text-xl font-black text-[#0A1628] mb-5">City Heatmap — Ahmedabad</h1>

        {data && (
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <MapPin size={18} className="mx-auto mb-1" style={{ color: NAVY }} />
              <p className="text-2xl font-black" style={{ color: NAVY }}>{data.totalDemand}</p>
              <p className="text-[10px] text-gray-400">Total Demand</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-green-100 text-center">
              <Users size={18} className="mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-black text-green-600">{data.totalSupply}</p>
              <p className="text-[10px] text-gray-400">Total Supply</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-red-100 text-center">
              <AlertTriangle size={18} className="mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-black text-red-600">{data.totalShortage}</p>
              <p className="text-[10px] text-gray-400">Total Shortage</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data?.areas || []).map((area: Required<import("@workspace/api-client-react").HeatmapDataAreasItem>, i: number) => {
            const demandPercent = (area.demand / maxDemand) * 100;
            const supplyPercent = (area.supply / maxSupply) * 100;
            const shortage = area.shortage > 0;
            return (
              <motion.div
                key={area.area}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`bg-white rounded-2xl p-5 shadow-sm border ${shortage ? "border-red-100" : "border-gray-100"} hover:shadow-md transition-all`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} style={{ color: shortage ? "#EF4444" : NAVY }} />
                    <h3 className="font-bold text-[#0A1628]">{area.area}</h3>
                  </div>
                  {shortage && (
                    <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle size={10} /> Shortage
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-gray-400 mb-1">Demand ({area.demand})</p>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${demandPercent}%` }}
                        className="h-full rounded-full" style={{ background: NAVY, width: `${demandPercent}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{area.activeTasks} active</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 mb-1">Comrades ({area.supply})</p>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${supplyPercent}%` }}
                        className="h-full rounded-full" style={{ background: "#10B981", width: `${supplyPercent}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{area.onlineRunners} online</p>
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
