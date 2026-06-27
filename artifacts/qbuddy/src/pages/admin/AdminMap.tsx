import { useEffect, useRef } from "react";
import { useGetActiveRunnerLocations, type RunnerMapMarker } from "@workspace/api-client-react";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminMap() {
  const { data: runners } = useGetActiveRunnerLocations({ query: { queryKey: ["activeRunnerLocations"], refetchInterval: 5000 } });
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<import("leaflet").Marker[]>([]);

  const runnerList = (runners ?? []) as RunnerMapMarker[];
  const online = runnerList.filter(r => r.status === "available").length;
  const onTask = runnerList.filter(r => r.status === "on_task").length;
  const offline = runnerList.filter(r => r.status === "offline").length;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const load = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      const map = L.map(containerRef.current!).setView([22.9, 72.5], 9);
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    };
    load().catch(() => {});
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || runnerList.length === 0) return;
    const load = async () => {
      const L = await import("leaflet");
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      for (const r of runnerList) {
        const color = r.status === "available" ? "#22C55E" : r.status === "on_task" ? "#6C3FD4" : "#9CA3AF";
        const icon = L.divIcon({
          html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
          className: "",
          iconSize: [16, 16],
        });
        const marker = L.marker([r.lat, r.lng], { icon })
          .addTo(map)
          .bindPopup(`<b>${r.name ?? "Runner"}</b><br>📞 ${r.phone}<br>Status: ${r.status}<br>${r.rating ? `⭐ ${Number(r.rating).toFixed(1)}` : ""}`);
        markersRef.current.push(marker);
      }
    };
    load().catch(() => {});
  }, [runners]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 flex flex-col">
        {/* Stats bar */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-sm font-semibold text-gray-700">{online} Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#6C3FD4] rounded-full" />
            <span className="text-sm font-semibold text-gray-700">{onTask} On Task</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full" />
            <span className="text-sm font-semibold text-gray-700">{offline} Offline</span>
          </div>
          <div className="ml-auto text-sm text-gray-400">Total: {runnerList.length} runners</div>
        </div>

        {/* Map */}
        <div ref={containerRef} className="flex-1" style={{ minHeight: "calc(100vh - 60px)" }} />
      </main>
    </div>
  );
}
