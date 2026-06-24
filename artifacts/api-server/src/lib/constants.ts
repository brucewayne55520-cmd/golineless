// Shared constants — single source of truth for category prices, names, and pilot zones.
// Backend imports this directly; frontend should mirror these values in lib/utils.ts.

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

export const PILOT_ZONES = [
  "Juhapura", "Sarkhej", "Prahladnagar", "Makarba",
  "Paldi", "Vasna", "Jamalpur", "Kalupur",
];

export const PILOT_CATEGORIES = [
  "medicine", "document", "bank", "govt_office", "courier", "senior_care",
];

export const DISTANCE_CHARGES: Record<string, number> = {
  "0-2": 0,
  "2-5": 20,
  "5+": 50,
};

/** Maximum proof photos per task (prevents unbounded array growth). */
export const MAX_PROOF_PHOTOS_PER_TASK = 20;
