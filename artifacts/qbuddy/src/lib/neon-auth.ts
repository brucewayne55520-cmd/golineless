/**
 * Neon Auth client — thin wrapper around the Neon Auth REST API.
 *
 * Neon Auth exposes a standard Better-Auth-compatible HTTP API at
 * `NEON_AUTH_URL`.  This module provides typed helpers so the
 * frontend can trigger a magic-link sign-in without pulling in the
 * full `@neondatabase/auth` bundle.
 */

const NEON_AUTH_URL =
  import.meta.env.VITE_NEON_AUTH_URL ||
  "https://ep-little-star-adoyze1m.neonauth.c-2.us-east-1.aws.neon.tech/neondb/auth";

/**
 * Request a magic link to be sent to the given email address.
 * Neon Auth's built-in shared SMTP delivers the email during dev.
 */
export async function requestMagicLink(
  email: string,
  callbackURL?: string,
  role?: string,
): Promise<{ success: boolean; error?: string }> {
  // Store the role in sessionStorage so MagicLinkCallback can read it back.
  // Neon Auth may strip query params from the callback URL during redirect,
  // so we can't rely on ?role= in the URL alone.
  if (role) {
    sessionStorage.setItem("golineless_magic_link_role", role);
  }

  try {
    const res = await fetch(`${NEON_AUTH_URL}/sign-in/magic-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        callbackURL: callbackURL || `${window.location.origin}/auth/magic-link/callback`,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        success: false,
        error: (body as { message?: string }).message || "Failed to send magic link",
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

/**
 * After the user clicks the magic link, Neon Auth redirects to the
 * callbackURL with `?token=<jwt>` in the query string.
 *
 * This function exchanges that token for a session by posting to our
 * backend which validates the JWT against Neon Auth's JWKS and
 * creates/returns a GoLineLess session token.
 */
export async function exchangeNeonToken(
  neonJwt: string,
  role: "user" | "runner" = "user",
): Promise<{ token: string; role: string; user?: unknown; runner?: unknown; error?: string }> {
  const API_BASE = import.meta.env.VITE_API_URL || "";

  try {
    const res = await fetch(`${API_BASE}/api/auth/neon-callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ neonToken: neonJwt, role }),
    });

    const body = await res.json();
    if (!res.ok) {
      return { token: "", role, error: (body as { error?: string }).error || "Authentication failed" };
    }

    return body as { token: string; role: string; user?: unknown; runner?: unknown };
  } catch (err) {
    return {
      token: "",
      role,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

