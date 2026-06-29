import { useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";
interface InfoPageProps {
  title: string;
  children: React.ReactNode;
}

export default function InfoPage({ title, children }: InfoPageProps) {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate("/app/profile")}
            className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center"
          >
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <h1 className="font-black text-gray-900 text-lg">{title}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-4 prose prose-sm max-w-none text-gray-700 leading-relaxed">
        {children}
      </div>

      {/* Footer */}
      <div className="px-5 py-6 text-center border-t border-gray-100">
        <p className="text-xs text-gray-400 font-semibold">
          Go LineLess — Life Without Waiting
        </p>
        <p className="text-xs text-gray-300 mt-1">
          © {new Date().getFullYear()} IBNAY IFTRIBE PRIVATE LIMITED
        </p>
      </div>
    </div>
  );
}
