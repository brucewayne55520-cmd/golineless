import { CATEGORY_NAMES, formatCurrency } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import type { Task } from "@workspace/api-client-react";

interface Props {
  tasks: Task[];
  isLoading: boolean;
  onSelect: (task: Required<Task>) => void;
}

const HEADERS = ["#", "User", "Category", "Location", "Runner", "Price", "Status", "Date", "Action"];

function LoadingSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: 9 }).map((_, j) => (
            <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
          ))}
        </tr>
      ))}
    </>
  );
}

function EmptyState() {
  return (
    <tr><td colSpan={9} className="text-center py-12 text-gray-400">No tasks found</td></tr>
  );
}

function TaskRow({ task, onSelect }: { task: Required<Task>; onSelect: (t: Required<Task>) => void }) {
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => onSelect(task)}>
      <td className="px-4 py-3 text-gray-500">#{task.id}</td>
      <td className="px-4 py-3 font-medium text-[#1A1A2E]">{task.user?.name ?? task.user?.phone ?? "—"}</td>
      <td className="px-4 py-3">{CATEGORY_NAMES[task.category] ?? task.category}</td>
      <td className="px-4 py-3 text-gray-500 max-w-24 truncate">{task.locationArea ?? "—"}</td>
      <td className="px-4 py-3">{task.runner?.name ?? "—"}</td>
      <td className="px-4 py-3 font-semibold">{formatCurrency(task.price)}</td>
      <td className="px-4 py-3">
        <StatusBadge status={task.status} />
      </td>
      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(task.createdAt).toLocaleDateString("en-IN")}</td>
      <td className="px-4 py-3">
        <button className="text-[#6C3FD4] text-xs font-semibold hover:underline">Edit</button>
      </td>
    </tr>
  );
}

export default function TaskTable({ tasks, isLoading, onSelect }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {HEADERS.map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <LoadingSkeleton />
            ) : tasks.length === 0 ? (
              <EmptyState />
            ) : (
              tasks.map(task => <TaskRow key={task.id} task={task as Required<Task>} onSelect={onSelect} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
