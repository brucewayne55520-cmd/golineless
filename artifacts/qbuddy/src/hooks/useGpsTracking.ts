import { useEffect, useRef } from "react";

/**
 * C1+C2+H1+M1+B2: Shared GPS tracking hook.
 * - Calls navigator.geolocation.watchPosition
 * - Emits "runner_location" via socket every 10 seconds
 * - Updates runner's currentLat/currentLng via API
 * - Used by both RunnerFeed and ActiveTask
 * - Cleans up on unmount
 */
export function useGpsTracking(opts: {
  enabled: boolean;
  taskId?: number | null;
  runnerId?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socketRef: React.MutableRefObject<any>;
}) {
  const { enabled, taskId, runnerId, socketRef } = opts;
  const lastEmitRef = useRef(0);

  useEffect(() => {
    if (!enabled || !navigator.geolocation) return;

    let watchId: number | null = null;

    const emitLocation = (lat: number, lng: number, heading?: number | null, speed?: number | null) => {
      const now = Date.now();
      // Throttle: emit at most once per 10 seconds
      if (now - lastEmitRef.current < 10000) return;
      lastEmitRef.current = now;

      const sock = socketRef.current;
      if (!sock?.connected) return;

      // Emit via socket if we have a taskId (active task)
      if (taskId && runnerId) {
        sock.emit("runner_location", { taskId, runnerId, lat, lng, heading: Number(heading) || 0, speed: Number(speed) || 0 });
      }

      // Also update currentLat/currentLng via API (fire-and-forget)
      if (runnerId) {
        const token = localStorage.getItem("golineless_runner_token") || "";
        fetch("/api/runners/me/gps-check", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ lat, lng, status: "granted" }),
        }).catch(() => { /* fire-and-forget */ });
      }
    };

    watchId = navigator.geolocation.watchPosition(
      (pos) => emitLocation(pos.coords.latitude, pos.coords.longitude, (pos.coords as GeolocationCoordinates & { heading?: number | null }).heading ?? undefined, (pos.coords as GeolocationCoordinates & { speed?: number | null }).speed ?? undefined),
      () => { /* swallow errors — GPS may be unavailable */ },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    return () => {
      if (watchId != null) navigator.geolocation?.clearWatch(watchId);
    };
  }, [enabled, taskId, runnerId, socketRef]);
}
