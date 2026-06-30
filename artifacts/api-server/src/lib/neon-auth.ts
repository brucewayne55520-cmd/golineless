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
