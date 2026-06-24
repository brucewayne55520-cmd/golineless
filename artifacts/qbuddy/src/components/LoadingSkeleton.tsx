import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  variant?: "card" | "text" | "stat" | "notification" | "table" | "grid" | "dashboard" | "custom";
  count?: number;
  className?: string;
  dark?: boolean;
  columns?: number;
}

function CardSkeleton({ dark }: { dark?: boolean }) {
  return (
    <div className={cn("rounded-2xl overflow-hidden", dark ? "" : "bg-white shadow-sm border border-gray-100")}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className={cn("w-11 h-11 rounded-xl flex-shrink-0", dark ? "bg-white/10" : "")} />
          <div className="flex-1 space-y-2">
            <Skeleton className={cn("h-4 w-3/5 rounded-lg", dark ? "bg-white/10" : "")} />
            <Skeleton className={cn("h-3 w-full rounded-lg", dark ? "bg-white/10" : "")} />
            <Skeleton className={cn("h-3 w-4/5 rounded-lg", dark ? "bg-white/10" : "")} />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Skeleton className={cn("h-8 flex-1 rounded-xl", dark ? "bg-white/10" : "")} />
          <Skeleton className={cn("h-8 flex-[2] rounded-xl", dark ? "bg-white/10" : "")} />
        </div>
      </div>
    </div>
  );
}

function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-3 rounded-lg",
            i === lines - 1 ? "w-3/5" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="text-center">
      <Skeleton className="w-8 h-8 rounded-lg mx-auto mb-2" />
      <Skeleton className="h-6 w-16 mx-auto mb-1 rounded-lg" />
      <Skeleton className="h-3 w-12 mx-auto rounded-lg" />
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-3/5 rounded-lg" />
        <Skeleton className="h-3 w-full rounded-lg" />
        <Skeleton className="h-2.5 w-1/4 rounded-lg" />
      </div>
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Table header */}
      <div className="flex gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100">
        <Skeleton className="h-3 w-8 rounded" />
        <Skeleton className="h-3 w-1/4 rounded" />
        <Skeleton className="h-3 w-1/6 rounded" />
        <Skeleton className="h-3 w-1/6 rounded" />
        <Skeleton className="h-3 w-1/6 rounded ml-auto" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={cn("flex items-center gap-4 px-5 py-3.5", i < rows - 1 ? "border-b border-gray-50" : "")}>
          <Skeleton className="w-6 h-6 rounded-lg flex-shrink-0" />
          <Skeleton className="h-3.5 w-1/4 rounded-lg" />
          <Skeleton className="h-3 w-1/6 rounded-lg" />
          <Skeleton className="h-3 w-1/6 rounded-lg" />
          <Skeleton className="h-6 w-16 rounded-full ml-auto" />
        </div>
      ))}
    </div>
  );
}

function GridSkeleton({ count = 6, columns = 3 }: { count?: number; columns?: number }) {
  return (
    <div className={cn("grid gap-4", columns === 2 ? "grid-cols-1 sm:grid-cols-2" : columns === 4 ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/5 rounded-lg" />
              <Skeleton className="h-3 w-2/5 rounded-lg" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-full rounded-lg" />
            <Skeleton className="h-2.5 w-4/5 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-full rounded-xl mt-4" />
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      {/* Stat cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-6 w-12 rounded-lg" />
                <Skeleton className="h-2.5 w-16 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Chart placeholder */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <Skeleton className="h-5 w-40 rounded-lg mb-4" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
      {/* Table placeholder */}
      <TableSkeleton rows={4} />
    </div>
  );
}

export function LoadingSkeleton({ variant = "card", count = 1, className, dark, columns = 3 }: LoadingSkeletonProps) {
  const items = Array.from({ length: count });

  if (variant === "custom") {
    return <div className={cn("animate-pulse", className)} />;
  }

  return (
    <div className={cn("animate-pulse", className)} role="status" aria-label="Loading">
      <span className="sr-only">Loading content...</span>
      {variant === "dashboard" && <DashboardSkeleton />}
      {variant === "table" && <TableSkeleton rows={count} />}
      {variant === "grid" && <GridSkeleton count={count} columns={columns} />}
      {variant !== "dashboard" && variant !== "table" && variant !== "grid" &&
        items.map((_, i) => {
          switch (variant) {
            case "card":
              return <div key={i} className={i > 0 ? "mt-3" : ""}><CardSkeleton dark={dark} /></div>;
            case "text":
              return <TextSkeleton key={i} />;
            case "stat":
              return <StatSkeleton key={i} />;
            case "notification":
              return <div key={i} className={i > 0 ? "border-t border-gray-50" : ""}><NotificationSkeleton /></div>;
            default:
              return <CardSkeleton key={i} dark={dark} />;
          }
        })
      }
    </div>
  );
}
