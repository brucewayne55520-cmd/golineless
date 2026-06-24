import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  variant?: "card" | "text" | "stat" | "notification" | "custom";
  count?: number;
  className?: string;
  dark?: boolean;
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

export function LoadingSkeleton({ variant = "card", count = 1, className, dark }: LoadingSkeletonProps) {
  const items = Array.from({ length: count });

  if (variant === "custom") {
    return <div className={cn("animate-pulse", className)} />;
  }

  return (
    <div className={cn("animate-pulse", className)}>
      {items.map((_, i) => {
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
      })}
    </div>
  );
}
