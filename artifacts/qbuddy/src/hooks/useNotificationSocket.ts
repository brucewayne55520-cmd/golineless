import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * M9: Real-time notification updates via socket.
 * Joins the runner's personal room and auto-refetches the notification list query
 * when relevant events arrive.
 *
 * @param runnerId - The runner's ID to join their personal notification room.
 *                  Pass null/undefined when offline or unknown.
 */
export function useNotificationSocket(runnerId?: number | null, enabled = true) {
  const queryClient = useQueryClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled || !runnerId) return;

    let mounted = true;
    const init = async () => {
      try {
        const { io } = await import("socket.io-client");
        if (!mounted) return;
        const sock = io(window.location.origin, {
          path: "/api/socket.io",
          reconnection: true,
          reconnectionDelay: 2000,
          reconnectionAttempts: 5,
        });

        // Join the runner's personal notification room once connected
        sock.on("connect", () => {
          if (mounted && runnerId) {
            sock.emit("join_comrades_room", { runnerId });
          }
        });

        // Listen for notification-related events and refetch
        const refetchNotifications = () => {
          queryClient.invalidateQueries({ queryKey: ["listNotifications"] });
        };

        sock.on("new_notification", refetchNotifications);
        sock.on("task_status_changed", refetchNotifications);
        sock.on("task_accepted", refetchNotifications);
        sock.on("task_booked", refetchNotifications);
        sock.on("cash_payment_confirmed", refetchNotifications);
        sock.on("new_task_broadcast", refetchNotifications);
        sock.on("task_escalated", refetchNotifications);
        sock.on("fraud_alert", refetchNotifications);

        socketRef.current = sock;
      } catch { /* socket init error boundary */ }
    };

    init();
    return () => {
      mounted = false;
      socketRef.current?.disconnect();
    };
  }, [enabled, runnerId, queryClient]);
}
