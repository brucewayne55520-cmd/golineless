import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { LayoutDashboard, Map, ClipboardList, PersonStanding, Users, Crown, TrendingUp, Settings, LogOut, UserPlus, BookOpen, Star, Ticket, ShieldAlert, Shield, MapPin, Zap, Activity, Award, Clock, Menu, X, Sun, Moon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { useListSupportTickets } from "@workspace/api-client-react";

const NAVY = "#241100";
const NAVY_DARK = "#060E1A";
const GOLD = "#ff7b00";

// O12: Grouped nav items into logical sections for readability
const navSections: { label: string; items: { path: string; icon: LucideIcon; label: string; exact?: boolean }[] }[] = [
  {
    label: "Overview",
    items: [
      { path: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
      { path: "/admin/pilot", icon: Zap, label: "Pilot Center" },
      { path: "/admin/operations", icon: Activity, label: "Ops Center" },
      { path: "/admin/leaderboard", icon: Award, label: "Leaderboard" },
      { path: "/admin/map", icon: Map, label: "Live Map" },
    ],
  },
  {
    label: "Operations",
    items: [
      { path: "/admin/tasks", icon: ClipboardList, label: "Tasks" },
      { path: "/admin/runners", icon: PersonStanding, label: "Comrades" },
      { path: "/admin/users", icon: Users, label: "Users" },
      { path: "/admin/kyc", icon: Shield, label: "KYC Review" },
      { path: "/admin/areas", icon: MapPin, label: "Areas" },
      { path: "/admin/heatmap", icon: MapPin, label: "Heatmap" },
    ],
  },
  {
    label: "Growth",
    items: [
      { path: "/admin/recruitment", icon: UserPlus, label: "Recruitment" },
      { path: "/admin/training", icon: BookOpen, label: "Training" },
      { path: "/admin/quality", icon: Star, label: "Quality" },
      { path: "/admin/subscriptions", icon: Crown, label: "Subscriptions" },
      { path: "/admin/analytics", icon: TrendingUp, label: "Analytics" },
    ],
  },
  {
    label: "Support",
    items: [
      { path: "/admin/support", icon: Ticket, label: "Support" },
      { path: "/admin/incidents", icon: ShieldAlert, label: "Incidents" },
      { path: "/admin/incident-response", icon: ShieldAlert, label: "Incidents Ops" },
    ],
  },
  {
    label: "System",
    items: [
      { path: "/admin/founder", icon: TrendingUp, label: "Founder" },
      { path: "/admin/audit-log", icon: Clock, label: "Audit Log" },
      { path: "/admin/settings", icon: Settings, label: "Settings" },
    ],
  },
];

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem("golineless_admin_theme") === "dark");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("golineless_admin_theme", dark ? "dark" : "light");
    // O4 FIX: Clean up dark class when leaving admin pages
    return () => { document.documentElement.classList.remove("dark"); };
  }, [dark]);
  return { dark, toggle: () => setDark(d => !d) };
}

export default function AdminSidebar() {
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { dark, toggle } = useDarkMode();
  const { data: supportTickets } = useListSupportTickets(undefined, { query: { queryKey: ["supportTickets", "sidebar"], refetchInterval: 30000 } });
  const openTicketCount = (Array.isArray(supportTickets) ? supportTickets : []).filter((t: { status: string }) => t.status === "open").length;

  const handleLogout = () => {
    localStorage.removeItem("golineless_admin_token");
    navigate("/admin/login");
  };

  const SidebarContent = () => (
    <>
      {/* Logo & Brand */}
      <div className="p-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center shadow-lg">
            <img src="/logo.jpg" alt="Go LineLess" className="h-9 w-auto" />
          </div>
          <div>
            <div className="text-white text-sm font-bold tracking-tight">Admin Panel</div>
            <div className="text-white/35 text-[10px] font-medium tracking-wide uppercase mt-0.5">Command Center</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto px-3" aria-label="Admin navigation">
        {navSections.map((section) => (
          <div key={section.label} className="mb-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-white/20 px-3 mb-1.5 mt-3 first:mt-0">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = item.exact ? location === item.path : location.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setMobileOpen(false); }}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 text-left group relative",
                      active
                        ? "bg-white/[0.12] text-white"
                        : "text-white/45 hover:bg-white/[0.06] hover:text-white/75"
                    )}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: GOLD }} />
                    )}
                    <Icon size={16} className={cn("flex-shrink-0 transition-colors", active ? "text-white" : "text-white/30 group-hover:text-white/50")} aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    {item.path === "/admin/support" && openTicketCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-red-500/90 text-white min-w-[18px] text-center leading-tight">
                        {openTicketCount}
                      </span>
                    )}
                    {active && <div className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.06] space-y-1">
        <button onClick={toggle} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-white/45 hover:bg-white/[0.06] hover:text-white/75 transition-all duration-150" aria-label="Toggle dark mode">
          {dark ? <Sun size={15} className="text-white/30" /> : <Moon size={15} className="text-white/30" />}
          <span>{dark ? "Light Mode" : "Dark Mode"}</span>
        </button>
        <button onClick={handleLogout} aria-label="Logout from admin panel" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-white/45 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150">
          <LogOut size={15} aria-hidden="true" className="text-white/30 group-hover:text-red-400" /> Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-11 h-11 rounded-xl flex items-center justify-center shadow-xl border border-white/10"
        style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})` }}
        aria-label="Open navigation menu"
      >
        <Menu size={20} className="text-white" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex w-60 flex-shrink-0 flex-col min-h-screen border-r border-white/[0.06]"
        style={{ background: `linear-gradient(180deg, ${NAVY} 0%, ${NAVY_DARK} 100%)` }}
        role="navigation"
        aria-label="Admin sidebar"
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-60 flex flex-col border-r border-white/[0.06] transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: `linear-gradient(180deg, ${NAVY} 0%, ${NAVY_DARK} 100%)` }}
        role="navigation"
        aria-label="Admin sidebar (mobile)"
      >
        <div className="flex justify-end p-3">
          <button onClick={() => setMobileOpen(false)} aria-label="Close navigation menu" className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <SidebarContent />
      </aside>
    </>
  );
}
