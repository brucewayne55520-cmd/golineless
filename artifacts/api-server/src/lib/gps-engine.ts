import { db, adminSettingsTable } from "@workspace/db";

/**
 * Validate a latitude or longitude coordinate value.
 * Returns true if the value is a finite number within valid range.
 * lat: -90 to 90, lng: -180 to 180
 */
export function isValidCoordinate(value: unknown, type: "lat" | "lng"): boolean {
  if (value === null || value === undefined || value === "") return false;
  const num = Number(value);
  if (!Number.isFinite(num) || Number.isNaN(num)) return false;
  if (type === "lat") return num >= -90 && num <= 90;
  return num >= -180 && num <= 180;
}

/**
 * Safely parse a number from any input, returning null for invalid values.
 * Standardizes on Number() with NaN handling, replacing inconsistent parseInt usage.
 */
export function safeParseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num) || Number.isNaN(num)) return null;
  return num;
}

/**
 * Validate an Indian mobile phone number (10 digits, starting with 6-9).
 */
export function isValidIndianPhone(phone: string): boolean {
  if (!phone || typeof phone !== "string") return false;
  // Strip any leading +91 or 0 prefix
  const cleaned = phone.replace(/^\+?91|^0/, "");
  return /^[6-9]\d{9}$/.test(cleaned);
}

/**
 * Haversine distance between two lat/lng points in meters
 */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get GPS validation radius from admin settings
 */
export async function getGpsValidationRadius(): Promise<number> {
  const [settings] = await db.select().from(adminSettingsTable).limit(1);
  return Number(settings?.gpsValidationRadius ?? 250);
}

/**
 * Validate that the comrade's GPS position is within allowed radius of the task location.
 * Returns { valid: boolean, distanceMeters: number, radius: number }
 */
export async function validateGpsForProof(
  comradeLat: number,
  comradeLng: number,
  taskLat: number | null,
  taskLng: number | null,
  validationRadius?: number
): Promise<{ valid: boolean; distanceMeters: number; radius: number }> {
  if (taskLat == null || taskLng == null) {
    return { valid: true, distanceMeters: 0, radius: validationRadius ?? 250 };
  }
  const radius = validationRadius ?? (await getGpsValidationRadius());
  const distanceMeters = haversineMeters(comradeLat, comradeLng, Number(taskLat), Number(taskLng));
  return { valid: distanceMeters <= radius, distanceMeters: Math.round(distanceMeters), radius };
}

/**
 * Fraud prevention: detect duplicate proof photos for the same task+proofType
 */
export function detectDuplicateProof(
  existingPhotos: string[],
  newProofType: string
): { isDuplicate: boolean; existingCount: number } {
  if (!existingPhotos || existingPhotos.length === 0) return { isDuplicate: false, existingCount: 0 };
  const sameTypeCount = existingPhotos.filter(p => {
    try { const parsed = JSON.parse(p); return parsed.proofType === newProofType; }
    catch { return false; }
  }).length;
  // More than 3 of the same proof type is suspicious
  return { isDuplicate: sameTypeCount >= 3, existingCount: sameTypeCount };
}

/**
 * Fraud prevention: validate task timeline makes sense for a status update
 */
export function validateTimelineTransition(
  currentStatus: string,
  newStatus: string
): { valid: boolean; reason?: string } {
  const validTransitions: Record<string, string[]> = {
    pending: ["assigned", "cancelled"],
    assigned: ["on_the_way", "cancelled"],
    on_the_way: ["reached_pickup", "reached_task_location", "at_location", "cancelled"],
    reached_pickup: ["reached_task_location", "cancelled"],
    reached_task_location: ["at_location", "in_progress", "waiting_started", "cancelled"],
    at_location: ["waiting_started", "in_progress", "cancelled"],
    waiting_started: ["in_progress", "cancelled"],
    in_progress: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  };
  const allowed = validTransitions[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    return { valid: false, reason: `Cannot transition from '${currentStatus}' to '${newStatus}'` };
  }
  return { valid: true };
}
