import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useListAdminTasks, useUpdateAdminTask } from "@workspace/api-client-react";
import type { Task } from "@workspace/api-client-react";
import { Download } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import TaskFilters from "./TaskFilters";
import TaskTable from "./TaskTable";
import TaskPagination from "./TaskPagination";
import TaskSlideOver from "./TaskSlideOver";

const STATUS_OPTS = ["", "pending", "assigned", "on_the_way", "reached_pickup", "reached_task_location", "at_location", "in_progress", "completed", "cancelled"];
const LIMIT = 20;

export default function AdminTasks() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Required<Task> | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [notes, setNotes] = useState("");
  // M1 FIX: Pass limit/offset to API for server-side pagination instead of loading all + client-side slicing
  const offset = page * LIMIT;
  const { data, isLoading, refetch } = useListAdminTasks({ status: status || undefined, limit: LIMIT, offset });
  const updateTask = useUpdateAdminTask();

  const result = data as Required<import("@workspace/api-client-react").AdminTaskList> | undefined;
  const tasks = result?.tasks ?? (Array.isArray(data) ? data : []);
  const totalCount = result?.total ?? tasks.length;
  const pageTasks = tasks; // Already paginated by API
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const allSelected = pageTasks.length > 0 && pageTasks.every(t => selectedIds.has(Number(t.id)));
  const toggleSelectAll = () => {
    if (allSelected) { setSelectedIds(new Set()); } else { setSelectedIds(new Set(pageTasks.map(t => Number(t.id)))); }
  };
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const exportCsv = useCallback(() => {
    const data = selectedIds.size > 0 ? pageTasks.filter(t => selectedIds.has(Number(t.id))) : pageTasks;
    if (data.length === 0) { toast.error("No tasks to export"); return; }
    const escape = (v: string) => v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    const header = "ID,User,Category,Location,Runner,Price,Status,Payment,Date\n";
    const rows = data.map((t: Required<Task>) =>
      [t.id, t.user?.name ?? t.user?.phone ?? "", t.category ?? "", t.locationArea ?? "", t.runner?.name ?? "", t.price ?? "", t.status ?? "", t.paymentStatus ?? "", t.createdAt ? new Date(t.createdAt).toISOString().split("T")[0] : ""].map(v => escape(String(v))).join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;    a.download = `tasks-${status || "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${data.length} tasks`);
  }, [pageTasks, status, selectedIds]);

  const handleSelect = (task: Required<Task>) => {
    setSelected(task);
    setNewStatus(task.status);
    setNotes(task.internalNotes ?? "");
  };

  const handleUpdate = () => {
    if (!selected) return;
    updateTask.mutate({
      id: Number(selected.id),
      data: { status: newStatus || undefined, internalNotes: notes } as import("@workspace/api-client-react").AdminTaskUpdate,
    }, {
      onSuccess: () => { toast.success("Task updated"); setSelected(null); refetch(); },
      onError: () => toast.error("Update failed"),
    });
  };

  return (
    <div className="flex min-h-screen gl-surface dark:bg-[#0A0E1A]">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-[#0A1628] dark:text-[#F5F0E8]">Tasks</h1>
            <p className="text-[#6B7280] text-sm">{totalCount} tasks · Page {page + 1}{selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ""}</p>
          </div>
          <button onClick={exportCsv} disabled={pageTasks.length === 0} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#1F2937] border border-[#E5E0D8] dark:border-[#374151] hover:bg-[#FAF7F2] dark:hover:bg-[#111827] disabled:opacity-40 gl-transition">
            <Download size={14} /> Export CSV{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
          </button>
        </div>

        <TaskFilters options={STATUS_OPTS} selected={status} onSelect={(s) => { setStatus(s); setPage(0); setSelectedIds(new Set()); }} />

        <TaskTable tasks={pageTasks} isLoading={isLoading} onSelect={handleSelect} selectedIds={selectedIds} onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAll} />

        <TaskPagination
          page={page}
          limit={LIMIT}
          total={totalCount}
          onPrev={() => setPage(p => p - 1)}
          onNext={() => setPage(p => p + 1)}
        />

        <TaskSlideOver
          task={selected}
          newStatus={newStatus}
          notes={notes}
          options={STATUS_OPTS}
          isSaving={updateTask.isPending}
          onStatusChange={setNewStatus}
          onNotesChange={setNotes}
          onSave={handleUpdate}
          onClose={() => setSelected(null)}
          onAction={() => refetch()}
        />
      </main>
    </div>
  );
}
