import crypto from "crypto";

/**
 * AES-256-GCM encryption for sensitive PII (Aadhaar numbers, etc.)
 * Uses a key derived from ENCRYPTION_KEY env var via scrypt.
 * Format: iv:authTag:ciphertext (all hex-encoded)
 */

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

let _derivedKey: Buffer | null = null;

function getDerivedKey(): Buffer {
  if (_derivedKey) return _derivedKey;
  const passphrase = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET || "golineless-default-dev-key";
  if (!process.env.ENCRYPTION_KEY && !process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
    throw new Error("[CRYPTO] ENCRYPTION_KEY or SESSION_SECRET must be set in production");
  }
  _derivedKey = crypto.scryptSync(passphrase, "golineless-salt-v1", KEY_LENGTH);
  return _derivedKey;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns `iv:authTag:ciphertext` (all hex).
 */
export function encrypt(plaintext: string): string {
  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a ciphertext string encrypted with `encrypt()`.
 * Input format: `iv:authTag:ciphertext` (all hex).
 * Returns the original plaintext.
 */
export function decrypt(ciphertext: string): string {
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid ciphertext format");
  }
  const key = getDerivedKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Check if a string is already encrypted (has iv:authTag:ciphertext format).
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  return parts.length === 3 && parts[0].length === IV_LENGTH * 2 && parts[1].length === 32;
}
