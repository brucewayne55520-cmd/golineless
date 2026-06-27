# Security & PII Handling

## Aadhaar Encryption Contract

### Overview
Go LineLess encrypts all Aadhaar-related PII (numbers, document images) at rest using AES-256-GCM before storing in the database. This document defines the contract for encryption, storage, and decryption.

### Encryption Details

| Field | Algorithm | Key Derivation | Storage Format |
|-------|-----------|---------------|----------------|
| `aadhaarNumber` | AES-256-GCM | scrypt from `ENCRYPTION_KEY` | `iv:authTag:ciphertext` (hex) |
| `aadhaarFront` (image URL) | AES-256-GCM | scrypt from `ENCRYPTION_KEY` | `iv:authTag:ciphertext` (hex) |
| `aadhaarBack` (image URL) | AES-256-GCM | scrypt from `ENCRYPTION_KEY` | `iv:authTag:ciphertext` (hex) |
| `selfie` (image URL) | AES-256-GCM | scrypt from `ENCRYPTION_KEY` | `iv:authTag:ciphertext` (hex) |

### Key Derivation
- **Algorithm**: `crypto.scryptSync(passphrase, "golineless-salt-v1", 32)`
- **Passphrase priority**: `ENCRYPTION_KEY` → `SESSION_SECRET` → hardcoded dev key (dev only)
- **Production requirement**: Must set `ENCRYPTION_KEY` env var. Server logs a fatal error if missing.

### Storage Locations
- **Images**: Uploaded to B2 cloud storage via `uploadDataUrl()` helper; encrypted URL stored in DB
- **Aadhaar number**: Encrypted directly in `runners.aadhaar_number` / `users.aadhaar_number` columns
- **Admin view**: Images are decrypted on-the-fly for admin KYC review endpoints

### API Endpoints

| Endpoint | Encryption Behavior |
|----------|-------------------|
| `POST /runners/me/kyc` | Encrypts number + uploads + encrypts URLs before DB insert |
| `POST /users/me/kyc` | Encrypts number + uploads + encrypts URLs before DB insert |
| `GET /admin/runners/:id/kyc` | Decrypts images for admin view; number is stripped (not returned) |
| `GET /admin/users/:id/kyc` | Decrypts images for admin view; number is stripped (not returned) |
| `POST /kyc-enhancements/resubmit` | Re-encrypts updated fields; preserves old fields if not changed |

### Security Rules
1. **Never return raw Aadhaar numbers** to any API consumer (admin or user-facing)
2. **Admin KYC view** decrypts images only; the Aadhaar number field is always stripped from responses
3. **Runner/user list endpoints** strip `aadhaarNumber`, `otp`, and `otpExpiresAt` from all responses
4. **Encryption is deterministic per-session** — same plaintext produces different ciphertext each time (random IV)
5. **Dev fallback key** is used when `ENCRYPTION_KEY` is not set — must not be used in production

### PII Data Flow
```
User submits KYC → Image uploaded to B2 → Encrypted URL stored in DB
                  → Aadhaar number encrypted → Stored in DB
                  → Admin reviews (decrypted on read) → Approve/Reject
                  → KYC status updated → User notified via Brevo email
```

### Audit Trail
All KYC actions (approve, reject, resubmit) are logged to `payment_audit_log` with:
- Actor (admin username)
- Action type
- Runner/User ID
- Timestamp
- Rejection reason (if applicable)
