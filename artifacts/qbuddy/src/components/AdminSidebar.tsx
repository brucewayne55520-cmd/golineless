import { useLocation } from "wouter";
import { LayoutDashboard, Map, ClipboardList, PersonStanding, Users, Crown, TrendingUp, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const NAVY = "#0F2557";
const NAVY_DARK = "#080E1E";

const navItems: { path: string; icon: LucideIcon; label: string; exact?: boolean }[] = [
  { path: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { path: "/admin/map", icon: Map, label: "Live Map" },
  { path: "/admin/tasks", icon: ClipboardList, label: "Tasks" },
  { path: "/admin/runners", icon: PersonStanding, label: "Runners" },
  { path: "/admin/users", icon: Users, label: "Users" },
  { path: "/admin/subscriptions", icon: Crown, label: "Subscriptions" },
  { path: "/admin/analytics", icon: TrendingUp, label: "Analytics" },
  { path: "/admin/settings", icon: Settings, label: "Settings" },
];

export default function AdminSidebar() {
  const [location, navigate] = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("qbuddy_admin_token");
    navigate("/admin/login");
  };

  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col min-h-screen border-r border-white/10"
      style={{ background: `linear-gradient(180deg, ${NAVY} 0%, ${NAVY_DARK} 100%)` }}
    >
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <img src="/logo.jpg" alt="Go LineLess" className="h-8 w-auto rounded-sm" />
          <div>
            <div className="text-white/50 text-[10px] mt-0.5">Admin Panel</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3">
        {navItems.map((item) => {
          const active = item.exact ? location === item.path : location.startsWith(item.path);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all text-left",
                active ? "bg-white/20 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon size={16} />
              {item.label}
              {active && <div className="ml-auto w-1.5 h-5 rounded-full" style={{ background: "#C9A84C" }} />}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button onClick={handleLogout} className="w-full flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors">
          <LogOut size={15} /> Logout
        </button>
      </div>
    </aside>
  );
}
