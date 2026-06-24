import { useState } from "react";
import { toast } from "sonner";
import { useListAdminTasks, useUpdateAdminTask } from "@workspace/api-client-react";
import type { Task } from "@workspace/api-client-react";
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
  const { data, isLoading, refetch } = useListAdminTasks(status ? { status } : {});
  const updateTask = useUpdateAdminTask();

  const tasks = (data as Required<import("@workspace/api-client-react").AdminTaskList>)?.tasks ?? (Array.isArray(data) ? data : []);
  const pageTasks = tasks.slice(page * LIMIT, page * LIMIT + LIMIT);

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
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-5">
          <h1 className="text-2xl font-black text-[#1A1A2E]">Tasks</h1>
        </div>

        <TaskFilters options={STATUS_OPTS} selected={status} onSelect={(s) => { setStatus(s); setPage(0); }} />

        <TaskTable tasks={pageTasks} isLoading={isLoading} onSelect={handleSelect} />

        <TaskPagination
          page={page}
          limit={LIMIT}
          total={tasks.length}
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
        />
      </main>
    </div>
  );
}
