import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CATEGORY_NAMES: Record<string, string> = {
  hospital: "Hospital Queue",
  govt_office: "Govt Office",
  bank: "Bank Work",
  document: "Document",
  medicine: "Medicine",
  senior_care: "Senior Care",
  errand: "Errand",
  emergency: "Emergency",
};

export const CATEGORY_HINDI: Record<string, string> = {
  hospital: "अस्पताल",
  govt_office: "सरकारी काम",
  bank: "बैंक",
  document: "दस्तावेज़",
  medicine: "दवाई",
  senior_care: "बुज़ुर्ग सेवा",
  errand: "काम-काज",
  emergency: "ज़रूरी",
};

export const CATEGORY_PRICES: Record<string, number> = {
  hospital: 149,
  govt_office: 179,
  bank: 129,
  document: 139,
  medicine: 99,
  senior_care: 199,
  errand: 89,
  emergency: 299,
};

export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
  assigned: "bg-blue-100 text-blue-700 border-blue-300",
  on_the_way: "bg-purple-100 text-purple-700 border-purple-300",
  at_location: "bg-green-100 text-green-700 border-green-300",
  in_progress: "bg-indigo-100 text-indigo-700 border-indigo-300",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-300",
  cancelled: "bg-red-100 text-red-700 border-red-300",
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  assigned: "Runner Assigned",
  on_the_way: "On the Way",
  at_location: "At Location",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const STATUS_BORDER: Record<string, string> = {
  pending: "border-l-yellow-400",
  assigned: "border-l-blue-400",
  on_the_way: "border-l-purple-400",
  at_location: "border-l-green-400",
  in_progress: "border-l-indigo-400",
  completed: "border-l-emerald-400",
  cancelled: "border-l-red-400",
};

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount == null) return "Rs 0";
  return `Rs ${Number(amount).toLocaleString("en-IN")}`;
}

export function getInitials(name?: string | null): string {
  if (!name) return "Q";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}
