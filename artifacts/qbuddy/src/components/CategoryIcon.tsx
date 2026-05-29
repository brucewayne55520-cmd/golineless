import { HeartPulse, Landmark, Building2, FileText, Pill, HeartHandshake, Package, Zap, type LucideProps } from "lucide-react";

const ICON_MAP: Record<string, React.FC<LucideProps>> = {
  hospital: HeartPulse,
  govt_office: Landmark,
  bank: Building2,
  document: FileText,
  medicine: Pill,
  senior_care: HeartHandshake,
  errand: Package,
  emergency: Zap,
};

export const CATEGORY_KEYS = Object.keys(ICON_MAP);

export function CategoryIcon({ category, size = 20, className }: { category: string; size?: number; className?: string }) {
  const Icon = ICON_MAP[category] ?? Package;
  return <Icon size={size} className={className} />;
}
