# Go LineLess — Production Setup & External Services

This document lists every **external service** the app uses, **all environment variables**, and a **go-live checklist** to take the website to production.

> Stack: Express 5 API server + React (Vite) frontend + PostgreSQL (Drizzle ORM) + Socket.IO realtime.

---

## 1. External Services We Use

| Purpose | Service | Required for launch? | Notes |
|---|---|---|---|
| **Database** | PostgreSQL | ✅ **Required** | Any Postgres host (Neon, Supabase, RDS, Railway, self-hosted). |
| **Photo / proof storage** | **Backblaze B2** (S3-compatible) | ⚠️ Strongly recommended | Code uses the AWS S3 SDK pointed at B2. Without it, proof photos fall back to **local disk** which is **ephemeral** (lost on redeploy). Any S3-compatible store works (AWS S3, Cloudflare R2, Wasabi) by changing the endpoint. |
| **Payments** | **Razorpay** (India) | ✅ Required (for online payments) | Order creation + webhook signature verification. Without keys, the app runs in "mock/cash" mode only. |
| **Authentication** | Self-hosted or Neon Auth | ✅ **Required** | Use email/password (self-hosted, built-in) or enable Neon Auth (managed, from Neon Console). |
| **Error monitoring** | **Sentry** | ⛔ Optional | If `SENTRY_DSN` is unset, all Sentry calls are no-ops. Recommended for production observability. |
| **Realtime** | Socket.IO | ✅ (built-in) | Self-hosted within the API server. No external account needed. |

> The app **degrades gracefully**: if payments / storage / Sentry aren't configured, those features turn off but the server still boots.

---

## 2. Complete Environment Variable List

These are read by the **API server** (`artifacts/api-server`). Source of truth: `src/lib/env-check.ts`.

### 🔴 Required (server will not start without these)

| Variable | Example | Description |
|---|---|---|
| `PORT` | `3001` | HTTP server port. |
| `DATABASE_URL` | `postgres://user:pass@host:5432/golineless` | PostgreSQL connection string. |
| `ADMIN_TOKEN` | `openssl rand -hex 32` | Legacy/bootstrap admin API token. Used for first login before per-admin accounts exist. Keep this secret and rotate it. |

### 🟡 Recommended for a real production launch

| Variable | Used by | Description |
|---|---|---|
| `NODE_ENV` | core | Set to `production` in prod. Enables strict Socket.IO auth, hides error details, sends real SMS. |
| `ALLOWED_ORIGINS` | CORS + Socket.IO | Comma-separated frontend origins, e.g. `https://golineless.com,https://www.golineless.com`. |
| `LOG_LEVEL` | logger | `trace`/`debug`/`info`/`warn`/`error`/`fatal` (default `info`). |

### 💳 Payments — Razorpay

| Variable | Description |
|---|---|
| `RAZORPAY_KEY_ID` | Razorpay key ID. |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret. |
| `RAZORPAY_WEBHOOK_SECRET` | Secret used to verify webhook signatures. **Without it, webhooks are not verified.** Set the webhook URL in Razorpay dashboard to `https://<api-host>/api/payments/webhook`. |

### 📱 WhatsApp OTP — Twilio (Optional)

| Variable | Description |
|---|---|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID. Without it, OTPs are only logged, not sent. |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token. |
| `TWILIO_WHATSAPP_FROM` | Twilio WhatsApp sender number (default `whatsapp:+14155238886`). |
| `TWILIO_CONTENT_SID` | Twilio WhatsApp template Content SID (default `HX229f5a04fd0510ce1b071852155d3e75`). |

### 🔐 Authentication — Neon Auth (Optional, Managed)

| Variable | Description |
|---|---|
| `NEON_AUTH_URL` | Neon Auth URL from Neon Console. |
| `NEON_AUTH_COOKIE_SECRET` | Secret for signing cookies (generate with: openssl rand -hex 32). |
| `NEON_DATA_API_URL` | Neon Data API URL (optional, for database queries). |
| `AUTH_MODE` | `self` (default, self-hosted email/password) or `neon` (managed Neon Auth). |

### 🖼️ Photo Storage — Backblaze B2 (S3-compatible)

| Variable | Description |
|---|---|
| `B2_KEY_ID` | B2 application key ID. |
| `B2_APPLICATION_KEY` | B2 application key. |
| `B2_BUCKET_NAME` | B2 bucket name. |
| `B2_ENDPOINT` | S3 endpoint (default `https://s3.us-west-004.backblazeb2.com` — match your bucket region). |

> All three of `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET_NAME` must be set for cloud storage to activate. Otherwise photos go to local disk.

### 🐞 Error Monitoring — Sentry (optional)

| Variable | Description |
|---|---|
| `SENTRY_DSN` | Sentry DSN. If unset, Sentry is disabled. |
| `SENTRY_AUTH_TOKEN` | Optional — for uploading source maps. |

### 🔧 Rate limiting (optional overrides — sensible defaults exist)

| Variable | Default | Window |
|---|---|---|
| `RATE_LIMIT_GLOBAL` | `100` | per 1 min |
| `RATE_LIMIT_OTP` | `5` | per 30 min |
| `RATE_LIMIT_BOOKING` | `20` | per 60 min |
| `RATE_LIMIT_DISPATCH` | `30` | per 60 min |

### 🌐 Frontend (`artifacts/qbuddy`) — Vite build-time vars

These are baked into the JS bundle at build time. On Render, `VITE_GOOGLE_CLIENT_ID` and `VITE_NEON_AUTH_URL` must be set as **environment variables** so the build picks them up.

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the API server. If unset, the frontend uses same-origin `/api` (correct for unified Render deployment). |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID for the sign-in button. |
| `VITE_NEON_AUTH_URL` | Neon Auth endpoint for magic-link sign-in (optional). |

---

## 3. Example `.env` (API server)

```bash
# --- Required ---
PORT=3001
DATABASE_URL=postgres://user:pass@host:5432/golineless
ADMIN_TOKEN=replace_with_openssl_rand_hex_32

# --- Core production ---
NODE_ENV=production
ALLOWED_ORIGINS=https://golineless.com,https://www.golineless.com
LOG_LEVEL=info

# --- Authentication ---
# AUTH_MODE=self  # Default: self-hosted email/password auth
# NEON_AUTH_URL=https://ep-xxxxx.neonauth.xxxxx.aws.neon.tech/neondb/auth
# NEON_AUTH_COOKIE_SECRET=replace_with_openssl_rand_hex_32
# NEON_DATA_API_URL=https://ep-xxxxx.apirest.xxxxx.aws.neon.tech/neondb/rest/v1

# --- Razorpay (payments) ---
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# --- Twilio WhatsApp OTP (optional) ---
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_CONTENT_SID=HX229f5a04fd0510ce1b071852155d3e75

# --- Backblaze B2 (photo storage) ---
B2_KEY_ID=
B2_APPLICATION_KEY=
B2_BUCKET_NAME=
B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com

# --- Sentry (optional) ---
SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

---

## 4. What You Need To Go Live (Checklist)

### A. Accounts to create
- [ ] **PostgreSQL** database (Neon / Supabase / RDS / Railway).
- [ ] **Backblaze B2** account + bucket + application key (for proof photos).
- [ ] **Razorpay** account (KYC-verified for live mode) + API keys + webhook secret.
- [ ] **Sentry** project (optional but recommended).
- [ ] A **host** for the API server and frontend. The app is deployed on **Render** (unified: API + SPA served from the same service). A `deploy/Caddyfile` and `deploy/golineless.service` also exist in the repo for a VM + Caddy setup.
- [ ] (Optional) Enable **Neon Auth** in Neon Console if using managed authentication.

### B. Database
- [ ] Set `DATABASE_URL` and push the schema: `bash scripts/migrate.sh push`.
- [ ] Seed subscription plans / training modules as needed (see `scripts/src/seed.ts`).
- [ ] Upload `neon_db_schema.sql` to Neon DB if using Neon.

### C. Admin access (per-admin accounts were just added)
- [ ] Set a strong `ADMIN_TOKEN` (used for bootstrap login).
- [ ] Create your first real admin: hash a password with the `hashPassword()` helper (`src/lib/auth.ts`) and insert a row into the `admins` table. After that, log in via `POST /api/admin/login` with `{ username, password }`.

### D. Payments
- [ ] Switch Razorpay to **Live mode**, set `RAZORPAY_KEY_ID/SECRET`.
- [ ] Register the webhook `https://<api-host>/api/payments/webhook` and set `RAZORPAY_WEBHOOK_SECRET`.
- [ ] Test a real ₹1 transaction end-to-end.

### E. Authentication
- [ ] Choose auth mode: `self` (default, email/password) or `neon` (managed Neon Auth).
- [ ] (Optional) Enable Neon Auth in Neon Console and set `NEON_AUTH_URL`, `NEON_AUTH_COOKIE_SECRET` in `.env`.
- [ ] Test signup/login with email/password:
  - `POST /api/auth/signup`: { email, password, role ("user" or "runner"), name, phone }
  - `POST /api/auth/login`: { email, password, role ("user" or "runner") }

### F. Security / config
- [ ] `NODE_ENV=production` (enables strict Socket.IO auth + hides internal error details).
- [ ] Set `ALLOWED_ORIGINS` to your real domains (CORS + websocket).
- [ ] Serve everything over **HTTPS** (Caddy config provided).
- [ ] Confirm rate limits are appropriate for expected traffic.

### G. Frontend
- [ ] Set `VITE_API_URL` to the production API URL and build (`pnpm --filter @workspace/qbuddy build`).
- [ ] Deploy the static build.

### H. Verify
- [ ] `GET /api/healthz` returns `{ status: "ok" }`.
- [ ] Server logs show the **Feature status** line with `payments/storage/monitoring = configured`.
- [ ] Run `pnpm run typecheck` and `pnpm --filter @workspace/api-server test` (currently 119 tests pass).

---

## 5. Known Limitations Before Heavy Scale

These are safe for an Ahmedabad pilot but should be addressed before large scale:

- **Dispatch engine state is in-memory** (`setTimeout`/`Map`) — does not survive restarts or run across multiple server instances. Single-instance only for now.
- **Hot admin analytics endpoints** load whole tables into memory and aggregate in JS — fine for thousands of rows, slow at large scale (move to SQL aggregation).
- **Schema is applied via `drizzle-kit push`**, not versioned migration files — consider generating versioned migrations for safer production schema changes.
- **`join_task` socket room** authorization is coarse (any authenticated socket can join any task room).
- **Coupon `GOLINELESS10`** is hardcoded; make it data-driven before running campaigns.
