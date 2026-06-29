/**
 * Google Auth configuration helper.
 *
 * Validates VITE_GOOGLE_CLIENT_ID at module load and exports a boolean
 * flag so pages can conditionally render the Google Sign-In button.
 */

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

/**
 * Validates the Google Client ID.
 * Must end with `.apps.googleusercontent.com` and must NOT contain
 * common placeholder fragments that indicate the env var was never set.
 */
function isValidGoogleClientId(id: string): boolean {
  if (!id) return false;
  if (!id.endsWith(".apps.googleusercontent.com")) return false;
  // Reject common placeholder patterns
  const placeholderPatterns = [
    "YOUR_GOOGLE", "CLIENT_ID_HERE", "REPLACE_ME",
    "TODO", "FIXME", "XXX", "http://", "https://",
    "example", "placeholder",
  ];
  const lower = id.toLowerCase();
  if (placeholderPatterns.some((p) => lower.includes(p.toLowerCase()))) return false;
  // Must look like a real client ID: starts with digits
  if (!/^\d{5,}/.test(id)) return false;
  return true;
}

export const isGoogleAuthConfigured = isValidGoogleClientId(GOOGLE_CLIENT_ID);

if (!isGoogleAuthConfigured) {
  console.warn(
    "[Google Auth] VITE_GOOGLE_CLIENT_ID is missing or invalid.\n" +
    "Current value:", GOOGLE_CLIENT_ID || "(empty)",
    "\nThe Google Sign-In button will be hidden.\n" +
    "Set a valid value in your Render environment variables."
  );
}
