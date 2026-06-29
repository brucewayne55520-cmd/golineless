import { useState } from "react";
import { Check, X } from "lucide-react";
import { BLUE } from "@/lib/theme";

const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી" },
];

interface LanguageSelectorProps {
  currentLanguage: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

export default function LanguageSelector({ currentLanguage, onSelect, onClose }: LanguageSelectorProps) {
  const [selected, setSelected] = useState(currentLanguage);

  const handleSave = () => {
    onSelect(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end backdrop-blur-sm">
      <div className="bg-white w-full rounded-t-3xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-gray-900 text-xl">Language</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setSelected(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                selected === lang.code
                  ? "bg-blue-50 border-2 border-blue-500"
                  : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
              }`}
            >
              <div className="flex-1 text-left">
                <p className="font-bold text-sm text-gray-900">{lang.native}</p>
                <p className="text-xs text-gray-500">{lang.label}</p>
              </div>
              {selected === lang.code && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: BLUE }}>
                  <Check size={14} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3.5 rounded-2xl text-white font-bold mt-4"
          style={{ background: BLUE }}
        >
          Save Language
        </button>
      </div>
    </div>
  );
}
