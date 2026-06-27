import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Home, ClipboardList, HeartHandshake, User, List, Play, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { NAVY, GOLD } from "@/lib/theme";
import { customFetch } from "@workspace/api-client-react";

interface NavItem {
  path: string;
  icon: LucideIcon;
  label: string;
}

const userNav: NavItem[] = [
  { path: "/app/home", icon: Home, label: "Home" },
  { path: "/app/tasks", icon: ClipboardList, label: "Tasks" },
  { path: "/app/senior", icon: HeartHandshake, label: "Senior" },
  { path: "/app/profile", icon: User, label: "Profile" },
];

const runnerNav: NavItem[] = [
  { path: "/runner/feed", icon: List, label: "Tasks" },
  { path: "/runner/active", icon: Play, label: "Active" },
  { path: "/runner/earnings", icon: Wallet, label: "Earnings" },
  { path: "/runner/profile", icon: User, label: "Profile" },
];

export function UserBottomNav() {
  const [location, navigate] = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-gray-100 safe-area-pb">
      <div className="flex">
        {userNav.map((item) => {
          const active = location.startsWith(item.path);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-3 transition-all min-h-[56px]",
                active ? "" : "text-gray-400"
              )}
              style={active ? { color: NAVY } : {}}
            >
              <Icon size={active ? 22 : 20} className="transition-all" />
              <span className={cn("text-[10px] font-semibold", active && "font-bold")}>{item.label}</span>
              {active && <div className="absolute top-0 w-10 h-0.5 rounded-full" style={{ background: GOLD }} />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function RunnerBottomNav() {
  const [location, navigate] = useLocation();
  // L15: Check for active task to show badge on Active tab
  const [hasActiveTask, setHasActiveTask] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem("golineless_runner_token") || "";
    if (!token || token === "undefined" || token === "null") return;
    fetch("/api/runners/me/active-tasks", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => setHasActiveTask(!!data))
      .catch(() => setHasActiveTask(false));
  }, [location]);
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl border-t border-white/10" style={{ background: "rgba(8,14,30,0.97)" }}>
      <div className="flex">
        {runnerNav.map((item) => {
          const active = location.startsWith(item.path);
          const Icon = item.icon;
          const isActiveTab = item.path === "/runner/active";
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-3 transition-all relative",
                active ? "" : "text-white/40"
              )}
              style={active ? { color: GOLD } : {}}
            >
              <div className="relative">
                <Icon size={active ? 22 : 20} className="transition-all" />
                {/* L15: Badge dot when there's an active task */}
                {isActiveTab && hasActiveTask && !active && (
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
                )}
              </div>
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
