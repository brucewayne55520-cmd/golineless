import { motion } from "framer-motion";
import AdminSidebar from "@/components/AdminSidebar";
import { useGetAreaPerformance } from "@workspace/api-client-react";
import type { AreaPerformanceAreasItem, AreaPerformanceHighDemandItem } from "@workspace/api-client-react";
import { MapPin, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { DARK, BLUE } from "@/lib/theme";

export default function AdminAreaPerformance() {
  const { data, isLoading } = useGetAreaPerformance({ query: { queryKey: ["areaPerformance"], refetchInterval: 30000 } });

  const maxTasks = Math.max(...(data?.areas ?? []).map((a: Required<import("@workspace/api-client-react").AreaPerformanceAreasItem>) => a.tasks), 1);

  return (
    <div className="flex min-h-screen" style={{ background: "#F0F2F8" }}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-black text-gray-900">Area Performance Analytics</h1>
            <p className="text-gray-400 text-xs mt-0.5">Ahmedabad · {data?.areas?.length ?? 0} zones</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse shadow-sm border border-gray-100" />)}</div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-[9px] text-gray-400 uppercase font-semibold">Total Tasks</p>
                <p className="text-2xl font-black" style={{ color: DARK }}>{data?.totalTasks ?? 0}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-[9px] text-gray-400 uppercase font-semibold">Total Comrades</p>
                <p className="text-2xl font-black" style={{ color: BLUE }}>{data?.totalComrades ?? 0}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-[9px] text-gray-400 uppercase font-semibold">High Demand Areas</p>
                <p className="text-2xl font-black text-red-500">{data?.highDemand?.length ?? 0}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-[9px] text-gray-400 uppercase font-semibold">Low Supply Areas</p>
                <p className="text-2xl font-black text-amber-500">{data?.lowSupply?.length ?? 0}</p>
              </div>
            </div>

            {/* Area cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              {(data?.areas ?? []).map((area: Required<import("@workspace/api-client-react").AreaPerformanceAreasItem>, i: number) => (
                <motion.div
                  key={area.area}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: area.shortage > 0 ? "#FEF2F2" : "#F0FDF4" }}>
                        <MapPin size={14} style={{ color: area.shortage > 0 ? "#EF4444" : "#16A34A" }} />
                      </div>
                      <h3 className="font-bold text-gray-900">{area.area}</h3>
                    </div>
                    {area.shortage > 0 && (
                      <span className="text-[9px] font-bold text-red-500 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                        Shortage: {area.shortage}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <div className="text-center">
                      <p className="text-sm font-black" style={{ color: DARK }}>{area.tasks}</p>
                      <p className="text-[9px] text-gray-400">Tasks</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black text-green-600">{formatCurrency(area.revenue)}</p>
                      <p className="text-[9px] text-gray-400">Revenue</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black text-blue-600">{area.comrades}</p>
                      <p className="text-[9px] text-gray-400">Comrades</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black text-amber-600">
                        {area.avgAcceptTime > 60 ? `${Math.round(area.avgAcceptTime / 60)}m` : `${area.avgAcceptTime}s`}
                      </p>
                      <p className="text-[9px] text-gray-400">Avg Accept</p>
                    </div>
                  </div>

                  {/* Supply bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-green-500" style={{ width: `${(area.onlineComrades / Math.max(area.comrades, 1)) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400">{area.onlineComrades}/{area.comrades} online</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Alerts */}
            {(data?.highDemand?.length ?? 0) > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <h3 className="font-bold text-red-700 text-sm flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} /> High Demand Areas
                </h3>
                <div className="flex flex-wrap gap-2">
                  {data?.highDemand?.map((a: { area: string; shortage: number }) => (
                    <span key={String(a.area)} className="bg-white border border-red-200 rounded-lg px-3 py-1 text-xs font-semibold text-red-600">
                      {String(a.area)} · shortage {Number(a.shortage)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
