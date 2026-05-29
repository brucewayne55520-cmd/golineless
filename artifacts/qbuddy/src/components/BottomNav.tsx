import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

const userNav: NavItem[] = [
  { path: "/app/home", icon: "🏠", label: "Home" },
  { path: "/app/tasks", icon: "📋", label: "Tasks" },
  { path: "/app/senior", icon: "👴", label: "Senior" },
  { path: "/app/profile", icon: "👤", label: "Profile" },
];

const runnerNav: NavItem[] = [
  { path: "/runner/feed", icon: "📋", label: "Tasks" },
  { path: "/runner/active", icon: "▶️", label: "Active" },
  { path: "/runner/earnings", icon: "💰", label: "Earnings" },
  { path: "/runner/profile", icon: "👤", label: "Profile" },
];

export function UserBottomNav() {
  const [location, navigate] = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-gray-100 safe-area-pb">
      <div className="flex">
        {userNav.map((item) => {
          const active = location.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-3 transition-all min-h-[56px]",
                active ? "text-[#6C3FD4]" : "text-gray-400"
              )}
            >
              <span className={cn("text-xl transition-transform", active && "scale-110")}>{item.icon}</span>
              <span className={cn("text-[10px] font-semibold", active && "font-bold")}>{item.label}</span>
              {active && <div className="absolute top-0 w-10 h-0.5 rounded-full bg-[#6C3FD4]" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function RunnerBottomNav() {
  const [location, navigate] = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#1A1A2E]/95 backdrop-blur-xl border-t border-white/10">
      <div className="flex">
        {runnerNav.map((item) => {
          const active = location.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-3 transition-all",
                active ? "text-[#FF6B35]" : "text-white/40"
              )}
            >
              <span className={cn("text-xl transition-transform", active && "scale-110")}>{item.icon}</span>
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
