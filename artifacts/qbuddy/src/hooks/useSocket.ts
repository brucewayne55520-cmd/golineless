import { useEffect, useRef, useCallback, useState } from "react";

/**
 * O2: Shared Socket.IO hook — single connection per component lifecycle.
 * Replaces ad-hoc `io()` calls scattered across RunnerFeed, ActiveTask,
 * AdminDashboard, FamilyTrack, etc.
 *
 * Usage:
 *   const { getSocket, connected } = useSocket({ path: "/api/socket.io" });
 *   const sock = await getSocket();
 *   sock?.emit("join_comrades_room", { runnerId });
 */
interface UseSocketOptions {
  path?: string;
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useSocket(opts: UseSocketOptions = {}) {
  const { path = "/api/socket.io", autoConnect = true, onConnect, onDisconnect } = opts;
  const socketRef = useRef<ReturnType<typeof import("socket.io-client").io> | null>(null);
  const [connected, setConnected] = useState(false);

  const getSocket = useCallback(async () => {
    if (socketRef.current?.connected) return socketRef.current;
    if (socketRef.current && !socketRef.current.connected) return socketRef.current;

    const { io } = await import("socket.io-client");
    const authToken = localStorage.getItem("golineless_runner_token")
      || localStorage.getItem("golineless_user_token")
      || localStorage.getItem("golineless_admin_token")
      || "";

    const sock = io(window.location.origin, {
      path,
      auth: { token: authToken },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 5,
      transports: ["websocket", "polling"],
    });

    sock.on("connect", () => {
      setConnected(true);
      onConnect?.();
    });
    sock.on("disconnect", () => {
      setConnected(false);
      onDisconnect?.();
    });

    socketRef.current = sock;
    return sock;
  }, [path, onConnect, onDisconnect]);

  useEffect(() => {
    if (!autoConnect) return;
    let mounted = true;

    getSocket().then(sock => {
      if (!mounted) { sock?.disconnect(); return; }
    });

    return () => {
      mounted = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [autoConnect, getSocket]);

  return {
    /** Get or create the socket instance (lazy async init) */
    getSocket,
    /** Whether the socket is currently connected */
    connected,
    /** Raw ref — use with caution */
    socketRef,
  };
}
