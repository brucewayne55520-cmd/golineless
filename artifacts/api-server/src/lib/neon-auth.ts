import { jwtVerify, createRemoteJWKSet } from 'jose';
import { logger } from './logger';

const NEON_AUTH_BASE_URL = process.env.NEON_AUTH_URL || 'https://ep-little-star-adoyze1m.neonauth.c-2.us-east-1.aws.neon.tech/neondb/auth';
const NEON_JWKS_URL = `${NEON_AUTH_BASE_URL}/.well-known/jwks.json`;
const JWKS = createRemoteJWKSet(new URL(NEON_JWKS_URL));

export interface NeonAuthUser {
  iat: number;
  name?: string;
  email?: string;
  phoneNumber?: string;
  emailVerified: boolean;
  image?: string;
  createdAt: string;
  updatedAt: string;
  role: string;
  banned: boolean;
  banReason?: string | null;
  banExpires?: string | null;
  id: string;
  sub: string;
  exp: number;
  iss: string;
  aud: string;
}

export async function validateNeonToken(token: string): Promise<NeonAuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: new URL(NEON_AUTH_BASE_URL).origin,
    });
    return payload as unknown as NeonAuthUser;
  } catch (error) {
    logger.error({ error }, 'Token validation failed');
    return null;
  }
}

/**
 * Exchange a Better Auth session verifier (e.g. "ml-xxx") for user/session data.
 * Called when the magic link callback returns ?neon_auth_session_verifier=ml-xxx.
 */
export async function exchangeSessionVerifier(verifier: string): Promise<NeonAuthUser | null> {
  // The verifier is not a JWT — it's a session token.  Better Auth exposes
  // GET /get-session which returns { user, session } when given valid
  // credentials.  We try a few auth strategies in order.

  const strategies = [
    // Strategy 1: Bearer token (some Better Auth builds accept this)
    async () => {
      try {
        const res = await fetch(`${NEON_AUTH_BASE_URL}/get-session`, {
          headers: { Authorization: `Bearer ${verifier}` },
        });
        if (!res.ok) return null;
        return parseSessionResponse(await res.json());
      } catch { return null; }
    },
    // Strategy 2: standard Better Auth session cookie
    async () => {
      try {
        const res = await fetch(`${NEON_AUTH_BASE_URL}/get-session`, {
          headers: { Cookie: `better-auth-session=${verifier}` },
        });
        if (!res.ok) return null;
        return parseSessionResponse(await res.json());
      } catch { return null; }
    },
    // Strategy 3: session cookie variant
    async () => {
      try {
        const res = await fetch(`${NEON_AUTH_BASE_URL}/get-session`, {
          headers: { Cookie: `neondb-session=${verifier}` },
        });
        if (!res.ok) return null;
        return parseSessionResponse(await res.json());
      } catch { return null; }
    },
    // Strategy 4: POST with verifier in body
    async () => {
      try {
        const res = await fetch(`${NEON_AUTH_BASE_URL}/get-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionVerifier: verifier }),
        });
        if (!res.ok) return null;
        return parseSessionResponse(await res.json());
      } catch { return null; }
    },
  ];

  for (const strategy of strategies) {
    const result = await strategy();
    if (result) return result;
  }

  logger.warn({ verifier: verifier.slice(0, 10) }, 'All session verifier exchange strategies failed');
  return null;
}

function parseSessionResponse(data: unknown): NeonAuthUser | null {
  if (!data) return null;
  const d = data as Record<string, unknown>;
  // Better Auth returns { user: {...}, session: {...} }
  const user = (d.user || d) as Record<string, unknown>;
  if (!user || (!user.email && !user.phoneNumber && !user.id)) return null;

  return {
    iat: 0,
    name: user.name as string || (user.email as string || '').split('@')[0] || '',
    email: user.email as string,
    phoneNumber: user.phoneNumber as string,
    emailVerified: user.emailVerified === true,
    image: user.image as string,
    createdAt: user.createdAt as string || '',
    updatedAt: user.updatedAt as string || '',
    role: user.role as string || 'user',
    banned: user.banned === true,
    banReason: user.banReason as string | null || null,
    banExpires: user.banExpires as string | null || null,
    id: user.id as string || '',
    sub: user.sub as string || user.id as string || '',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iss: '',
    aud: '',
  };
}
