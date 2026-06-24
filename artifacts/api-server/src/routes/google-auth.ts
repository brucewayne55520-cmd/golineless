import { Router, type IRouter } from "express";
import { db, usersTable, userSessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateToken } from "../lib/auth";

const router: IRouter = Router();

interface GoogleTokenPayload {
  sub: string;
  email: string;
  name: string;
  picture: string;
  email_verified: boolean;
}

import { OAuth2Client } from "google-auth-library";

// Instantiate the Google Auth Client using the environment variable
const clientId = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(clientId);

/**
 * Verify a Google ID token securely using google-auth-library
 */
async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload | null> {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });
    
    const payload = ticket.getPayload();
    if (!payload) return null;
    if (!payload.email_verified) return null;

    return {
      sub: payload.sub,
      email: payload.email || "",
      name: payload.name || payload.email?.split("@")[0] || "",
      picture: payload.picture || "",
      email_verified: payload.email_verified,
    };
  } catch (err) {
    console.error("[Google Auth] Token verification failed", err);
    return null;
  }
}

// POST /auth/google
// Body: { token: string }  — the credential from Google Sign-In
router.post("/auth/google", async (req, res): Promise<void> => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ error: "Google token is required" });
    return;
  }

  const payload = await verifyGoogleToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired Google token" });
    return;
  }

  // Upsert user — find by googleId first, then by email
  let user = (await db.select().from(usersTable).where(eq(usersTable.googleId as any, payload.sub)).limit(1))[0];

  if (!user && payload.email) {
    user = (await db.select().from(usersTable).where(eq(usersTable.email, payload.email)).limit(1))[0];
  }

  if (user) {
    // Update googleId and name/picture if missing
    await db.update(usersTable).set({
      googleId: payload.sub,
      name: user.name || payload.name,
    } as any).where(eq(usersTable.id, user.id));
    // Re-fetch updated
    user = (await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1))[0];
  } else {
    // Create new user
    [user] = await db.insert(usersTable).values({
      email: payload.email,
      name: payload.name,
      googleId: payload.sub,
    } as any).returning();
  }

  // Create session
  const sessionToken = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await db.insert(userSessionsTable).values({ userId: user.id, token: sessionToken, expiresAt });

  // Return safe user (strip internal fields)
  const { passwordHash, otp, otpExpiresAt, passwordResetToken, passwordResetExpiresAt, ...safeUser } = user as any;

  res.json({
    token: sessionToken,
    role: "user",
    user: safeUser,
  });
});

export default router;
