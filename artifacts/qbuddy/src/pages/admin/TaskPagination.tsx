interface Props {
  page: number;
  limit: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export default function TaskPagination({ page, limit, total, onPrev, onNext }: Props) {
  const start = page * limit + 1;
  const end = Math.min((page + 1) * limit, total);
  const hasPrev = page > 0;
  const hasNext = (page + 1) * limit < total;

  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white rounded-b-2xl">
      <p className="text-xs text-gray-400">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex gap-2">
        <button disabled={!hasPrev} onClick={onPrev} className="px-3 py-1 rounded-lg border border-gray-200 text-xs disabled:opacity-40">
          ← Prev
        </button>
        <button disabled={!hasNext} onClick={onNext} className="px-3 py-1 rounded-lg border border-gray-200 text-xs disabled:opacity-40">
          Next →
        </button>
      </div>
    </div>
  );
}
