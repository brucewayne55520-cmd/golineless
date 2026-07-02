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

/** Runtime type guard for string values from untyped API responses */
function isStr(v: unknown): v is string {
  return typeof v === 'string';
}

function parseSessionResponse(data: unknown): NeonAuthUser | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  // Better Auth returns { user: {...}, session: {...} }
  const raw = (d.user ?? d) as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.email && !raw.phoneNumber && !raw.id) return null;

  return {
    iat: 0,
    name: isStr(raw.name) ? raw.name : (isStr(raw.email) ? raw.email.split('@')[0] : ''),
    email: isStr(raw.email) ? raw.email : undefined,
    phoneNumber: isStr(raw.phoneNumber) ? raw.phoneNumber : undefined,
    emailVerified: raw.emailVerified === true,
    image: isStr(raw.image) ? raw.image : undefined,
    createdAt: isStr(raw.createdAt) ? raw.createdAt : '',
    updatedAt: isStr(raw.updatedAt) ? raw.updatedAt : '',
    role: isStr(raw.role) ? raw.role : 'user',
    banned: raw.banned === true,
    banReason: isStr(raw.banReason) ? raw.banReason : null,
    banExpires: isStr(raw.banExpires) ? raw.banExpires : null,
    id: isStr(raw.id) ? raw.id : '',
    sub: isStr(raw.sub) ? raw.sub : (isStr(raw.id) ? raw.id : ''),
    exp: Math.floor(Date.now() / 1000) + 3600,
    iss: '',
    aud: '',
  };
}
