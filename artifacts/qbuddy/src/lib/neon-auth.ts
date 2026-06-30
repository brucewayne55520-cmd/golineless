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

/**
 * Send an OTP to a phone number via Neon Auth (Phone Number plugin).
 * Neon Auth generates the code and fires the send.otp webhook to deliver it.
 */
export async function sendPhoneOtp(
  phoneNumber: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${NEON_AUTH_URL}/phone-number/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        success: false,
        error: (body as { message?: string }).message || "Failed to send OTP",
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
 * Verify an OTP code via Neon Auth (Phone Number plugin).
 * On success, returns a JWT that can be exchanged for a local session.
 */
export async function verifyPhoneOtp(
  phoneNumber: string,
  code: string,
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const res = await fetch(`${NEON_AUTH_URL}/phone-number/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber, code }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        success: false,
        error: (body as { message?: string }).message || "Invalid OTP",
      };
    }

    // Better Auth returns both token and user session data
    const body = await res.json();
    
    // The response may contain a token directly or as a nested property
    const neonToken = (body as { token?: string }).token ||
      (body as { data?: { token?: string } }).data?.token || "";

    if (!neonToken) {
      return { success: false, error: "No token received from Neon Auth" };
    }

    return { success: true, token: neonToken };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
