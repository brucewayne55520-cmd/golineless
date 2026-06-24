import { STATUS_LABELS } from "@/lib/utils";

interface Props {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}

export default function TaskFilters({ options, selected, onSelect }: Props) {
  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      {options.map(s => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            selected === s ? "bg-[#6C3FD4] text-white" : "bg-white text-gray-600 border border-gray-200"
          }`}
        >
          {s === "" ? "All" : STATUS_LABELS[s] ?? s}
        </button>
      ))}
    </div>
  );
}
