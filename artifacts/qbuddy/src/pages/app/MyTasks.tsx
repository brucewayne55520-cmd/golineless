import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ClipboardList, ChevronRight, Search, Star } from "lucide-react";
import { useListTasks } from "@workspace/api-client-react";
import { UserBottomNav } from "@/components/BottomNav";
import { CategoryIcon } from "@/components/CategoryIcon";
import { StatusBadge } from "@/components/StatusBadge";
import { PaymentBadge } from "@/components/PaymentBadge";
import { PayButton } from "@/components/PayButton";
import { CATEGORY_NAMES, STATUS_BORDER, formatCurrency } from "@/lib/utils";
import { DARK, BLUE_GRAD, DARK_LIGHT } from "@/lib/theme";
import { EmptyState } from "@/components/EmptyState";

const FILTERS = ["all", "unpaid", "pending", "assigned", "in_progress", "completed", "cancelled"] as const;
const FILTER_LABELS: Record<string, string> = {
  all: "All", unpaid: "Pay", pending: "Pending", assigned: "Assigned", in_progress: "Active", completed: "Completed", cancelled: "Cancelled"
};
const ACTIVE_STATUSES = ["pending", "assigned", "on_the_way", "at_location", "in_progress"];

const isUnpaid = (paymentStatus?: string | null, taskStatus?: string) =>
  paymentStatus !== "paid" && !["completed", "cancelled"].includes(taskStatus ?? "");

export default function MyTasks() {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "price" | "status">("date");
  const [, navigate] = useLocation();
  const { data: tasks, isLoading } = useListTasks(
    filter === "all" || filter === "unpaid"
      ? {}
      : { status: filter === "in_progress" ? "assigned,on_the_way,at_location,in_progress" : filter },
    { query: { queryKey: ["myTasks", filter], refetchInterval: 30000 } }
  );

  // Client-side filter for unpaid tasks
  const unpaidFilteredTasks = filter === "unpaid"
    ? (tasks ?? []).filter((t: Required<import("@workspace/api-client-react").Task>) =>
        isUnpaid(t.paymentStatus, t.status)
      )
    : (tasks ?? []);

  // Fix #48: Search, filter, and sort
  const filteredTasks = useMemo(() => {
    let result = unpaidFilteredTasks;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t: Required<import("@workspace/api-client-react").Task>) =>
        (t.description?.toLowerCase().includes(q)) ||
        (t.locationArea?.toLowerCase().includes(q)) ||
        (t.category?.toLowerCase().includes(q))
      );
    }
    if (sortBy === "price") {
      result = [...result].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sortBy === "status") {
      const statusOrder: Record<string, number> = { in_progress: 0, assigned: 1, pending: 2, completed: 3, cancelled: 4 };
      result = [...result].sort((a, b) => (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5));
    }
    return result;
  }, [unpaidFilteredTasks, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 py-4 border-b border-gray-100 sticky top-0 z-30">
        <h1 className="text-xl font-black text-[#1A1A2E]">My Tasks</h1>
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
        {/* Fix #48: Search + Sort */}
        <div className="flex gap-2 mt-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-xs border border-gray-200 rounded-xl px-2 py-1.5 bg-white focus:outline-none"
          >
            <option value="date">Newest</option>
            <option value="price">Price</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          ))
        ) : filteredTasks.length === 0 ? (
          filter === "unpaid" && tasks && tasks.length > 0 ? (
            <EmptyState
              icon={ClipboardList}
              iconBg={BLUE_GRAD}
              iconColor={DARK_LIGHT}
              title="All Paid Up!"
              description="You have no unpaid tasks."
              subtitle="All your payments are settled ✓"
            />
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="No tasks yet"
              description="Book your first runner today!"
              action={{ label: "Book a Runner", onClick: () => navigate("/app/book") }}
            />
          )
        ) : (
          filteredTasks.map((task: Required<import("@workspace/api-client-react").Task>, i: number) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/app/tasks/${task.id}`)}
              className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 cursor-pointer hover:shadow-md transition-all ${STATUS_BORDER[task.status] ?? "border-l-gray-300"}`}
            >
              <div className="flex items-start gap-3">
                <div className="text-gray-900 flex-shrink-0 mt-0.5">
                  <CategoryIcon category={task.category} size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-[#1A1A2E] text-sm">{CATEGORY_NAMES[task.category]}</span>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <StatusBadge status={task.status} showLive={ACTIVE_STATUSES.includes(task.status)} />
                      <PaymentBadge paymentStatus={task.paymentStatus} taskStatus={task.status} paymentMethod={task.paymentMethod} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1 mb-1">{task.description}</p>
                  {task.runner && (
                    <p className="text-xs text-blue-600 font-medium flex items-center gap-1.5">
                      Runner: {task.runner.name}
                      {task.runner.rating && Number(task.runner.rating) > 0 && (
                        <span className="flex items-center gap-0.5 text-amber-500">
                          <Star size={10} fill="currentColor" /> {Number(task.runner.rating).toFixed(1)}
                        </span>
                      )}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">
                      {task.scheduledAt ? new Date(task.scheduledAt).toLocaleDateString("en-IN") : new Date(task.createdAt).toLocaleDateString("en-IN")}
                    </span>
                    <div className="flex items-center gap-2">
                      {isUnpaid(task.paymentStatus, task.status) && (
                        <PayButton taskId={task.id} variant="gold" paymentMethod={task.paymentMethod} />
                      )}
                      <span className="text-xs font-bold" style={{ color: DARK }}>{formatCurrency(task.price)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
      <UserBottomNav />
    </div>
  );
}
