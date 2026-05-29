import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/admin", icon: "📊", label: "Dashboard", exact: true },
  { path: "/admin/map", icon: "🗺️", label: "Live Map" },
  { path: "/admin/tasks", icon: "📋", label: "Tasks" },
  { path: "/admin/runners", icon: "🏃", label: "Runners" },
  { path: "/admin/users", icon: "👥", label: "Users" },
  { path: "/admin/subscriptions", icon: "👑", label: "Subscriptions" },
  { path: "/admin/analytics", icon: "📈", label: "Analytics" },
  { path: "/admin/settings", icon: "⚙️", label: "Settings" },
];

export default function AdminSidebar() {
  const [location, navigate] = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("qbuddy_admin_token");
    navigate("/admin/login");
  };

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col min-h-screen border-r border-white/10"
      style={{ background: "linear-gradient(180deg, #6C3FD4 0%, #4A2D9A 100%)" }}>
      {/* Logo */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-white font-black">Q</span>
          </div>
          <div>
            <div className="text-white font-black text-lg leading-none">QBuddy</div>
            <div className="text-white/50 text-[10px]">Admin Panel</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3">
        {navItems.map((item) => {
          const active = item.exact ? location === item.path : location.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all text-left",
                active ? "bg-white/20 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
              {active && <div className="ml-auto w-1.5 h-5 bg-white/60 rounded-full" />}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/10">
        <button onClick={handleLogout} className="w-full flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors">
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>
  );
}
