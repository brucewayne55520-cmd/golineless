import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Action {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  title: string;
  description?: string;
  subtitle?: string;
  action?: Action;
  variant?: "light" | "dark";
  className?: string;
}

export function EmptyState({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  subtitle,
  action,
  variant = "light",
  className,
}: EmptyStateProps) {
  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4",
            isDark ? "bg-white/5" : iconBg || "bg-gray-100"
          )}
        >
          <Icon
            size={28}
            className={cn(isDark ? "text-white/20" : iconColor || "text-gray-300")}
          />
        </div>
      )}
      <h3
        className={cn(
          "font-bold text-lg mb-1",
          isDark ? "text-white" : "text-[#1A1A2E]"
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            "text-sm mt-1 max-w-xs",
            isDark ? "text-white/40" : "text-gray-500"
          )}
        >
          {description}
        </p>
      )}
      {subtitle && (
        <p className={cn("text-xs mt-0.5", isDark ? "text-white/30" : "text-gray-400")}>
          {subtitle}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            "mt-5 px-6 py-3 rounded-xl font-semibold text-sm shadow-sm hover:shadow-md transition-all",
            isDark
              ? "bg-[#C9A84C] text-[#0A1628]"
              : "bg-gradient-to-r from-[#C9A84C] to-[#D4B870] text-[#0A1628]"
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
