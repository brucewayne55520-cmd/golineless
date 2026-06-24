import { useState } from "react";
import { useLocation } from "wouter";
import { LayoutDashboard, Map, ClipboardList, PersonStanding, Users, Crown, TrendingUp, Settings, LogOut, UserPlus, BookOpen, Star, Ticket, ShieldAlert, Shield, MapPin, Zap, Activity, Award, Clock, Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { NAVY } from "@/lib/theme";

const NAVY_DARK = "#080E1E";

const navItems: { path: string; icon: LucideIcon; label: string; exact?: boolean }[] = [
  { path: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { path: "/admin/pilot", icon: Zap, label: "Pilot Center" },
  { path: "/admin/operations", icon: Activity, label: "Ops Center" },
  { path: "/admin/leaderboard", icon: Award, label: "Leaderboard" },
  { path: "/admin/areas", icon: MapPin, label: "Areas" },
  { path: "/admin/founder", icon: TrendingUp, label: "Founder" },
  { path: "/admin/incident-response", icon: ShieldAlert, label: "Incidents Ops" },
  { path: "/admin/map", icon: Map, label: "Live Map" },
  { path: "/admin/tasks", icon: ClipboardList, label: "Tasks" },
  { path: "/admin/runners", icon: PersonStanding, label: "Runners" },
  { path: "/admin/kyc", icon: Shield, label: "KYC Review" },
  { path: "/admin/audit-log", icon: Clock, label: "Audit Log" },
  { path: "/admin/recruitment", icon: UserPlus, label: "Recruitment" },
  { path: "/admin/training", icon: BookOpen, label: "Training" },
  { path: "/admin/quality", icon: Star, label: "Quality" },
  { path: "/admin/support", icon: Ticket, label: "Support" },
  { path: "/admin/incidents", icon: ShieldAlert, label: "Incidents" },
  { path: "/admin/heatmap", icon: MapPin, label: "Heatmap" },
  { path: "/admin/users", icon: Users, label: "Users" },
  { path: "/admin/subscriptions", icon: Crown, label: "Subscriptions" },
  { path: "/admin/analytics", icon: TrendingUp, label: "Analytics" },
  { path: "/admin/settings", icon: Settings, label: "Settings" },
];

export default function AdminSidebar() {
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("golineless_admin_token");
    navigate("/admin/login");
  };

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <img src="/logo.jpg" alt="Go LineLess" className="h-8 w-auto rounded-sm" />
          <div>
            <div className="text-white/50 text-[10px] mt-0.5">Admin Panel</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto" aria-label="Admin navigation">
        {navItems.map((item) => {
          const active = item.exact ? location === item.path : location.startsWith(item.path);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all text-left",
                active ? "bg-white/20 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{item.label}</span>
              {active && <div className="ml-auto w-1.5 h-5 rounded-full" style={{ background: "#C9A84C" }} />}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button onClick={handleLogout} aria-label="Logout from admin panel" className="w-full flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors">
          <LogOut size={15} aria-hidden="true" /> Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
        style={{ background: NAVY }}
        aria-label="Open navigation menu"
      >
        <Menu size={20} className="text-white" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex w-56 flex-shrink-0 flex-col min-h-screen border-r border-white/10"
        style={{ background: `linear-gradient(180deg, ${NAVY} 0%, ${NAVY_DARK} 100%)` }}
        role="navigation"
        aria-label="Admin sidebar"
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-56 flex flex-col border-r border-white/10 transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: `linear-gradient(180deg, ${NAVY} 0%, ${NAVY_DARK} 100%)` }}
        role="navigation"
        aria-label="Admin sidebar (mobile)"
      >
        <div className="flex justify-end p-3">
          <button onClick={() => setMobileOpen(false)} aria-label="Close navigation menu" className="text-white/60 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <SidebarContent />
      </aside>
    </>
  );
}
