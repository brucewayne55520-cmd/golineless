import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ClipboardList, ChevronRight } from "lucide-react";
import { useListTasks } from "@workspace/api-client-react";
import { UserBottomNav } from "@/components/BottomNav";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CATEGORY_NAMES, STATUS_COLORS, STATUS_LABELS, STATUS_BORDER, formatCurrency } from "@/lib/utils";

const FILTERS = ["all", "pending", "assigned", "in_progress", "completed", "cancelled"] as const;
const FILTER_LABELS: Record<string, string> = {
  all: "All", pending: "Pending", assigned: "Assigned", in_progress: "Active", completed: "Completed", cancelled: "Cancelled"
};
const ACTIVE_STATUSES = ["pending", "assigned", "on_the_way", "at_location", "in_progress"];

export default function MyTasks() {
  const [filter, setFilter] = useState("all");
  const [, navigate] = useLocation();
  const { data: tasks, isLoading } = useListTasks({ params: filter === "all" ? {} : { status: filter === "in_progress" ? "assigned,on_the_way,at_location,in_progress" : filter } });

  return (
    <div className="min-h-screen bg-[#F8F7FF] pb-24">
      <div className="bg-white px-4 py-4 border-b border-gray-100 sticky top-0 z-30">
        <h1 className="text-xl font-black text-[#1A1A2E]">My Tasks</h1>
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === f ? "bg-[#6C3FD4] text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          ))
        ) : !tasks || tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ClipboardList size={48} className="text-gray-300 mb-4" />
            <h3 className="font-bold text-[#1A1A2E] text-lg">No tasks yet</h3>
            <p className="text-gray-500 text-sm mt-1 mb-5">Book your first runner today!</p>
            <button
              onClick={() => navigate("/app/book")}
              className="px-6 py-3 rounded-xl text-white font-semibold"
              style={{ background: "linear-gradient(135deg, #FF6B35, #FF8C42)" }}
            >
              Book a Runner
            </button>
          </div>
        ) : (
          (tasks as any[]).map((task: any, i: number) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/app/tasks/${task.id}`)}
              className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 cursor-pointer hover:shadow-md transition-all ${STATUS_BORDER[task.status] ?? "border-l-gray-300"}`}
            >
              <div className="flex items-start gap-3">
                <div className="text-[#6C3FD4] flex-shrink-0 mt-0.5">
                  <CategoryIcon category={task.category} size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-[#1A1A2E] text-sm">{CATEGORY_NAMES[task.category]}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${STATUS_COLORS[task.status] ?? ""}`}>
                      {ACTIVE_STATUSES.includes(task.status) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      )}
                      {STATUS_LABELS[task.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1 mb-1">{task.description}</p>
                  {task.runner && (
                    <p className="text-xs text-blue-600 font-medium">Runner: {task.runner.name}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">
                      {task.scheduledAt ? new Date(task.scheduledAt).toLocaleDateString("en-IN") : new Date(task.createdAt).toLocaleDateString("en-IN")}
                    </span>
                    <span className="text-xs font-bold text-[#6C3FD4]">{formatCurrency(task.price)}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-0.5" />
              </div>
            </motion.div>
          ))
        )}
      </div>
      <UserBottomNav />
    </div>
  );
}
