# Go LineLess — Production Deployment Guide

> **Readiness Score:** 76% — Ready for Closed Pilot, Not for Public Launch
> **Last Updated:** June 16, 2026

This guide covers deploying Go LineLess to production, including configuring all four external integrations: **Twilio (WhatsApp OTP)**, **Razorpay (Payments)**, **Backblaze B2 (Storage)**, and **Sentry (Error Monitoring)**.

---

## Prerequisites

- **Node.js** >= 20 (LTS recommended)
- **pnpm** >= 9 (`npm install -g pnpm`)
- **PostgreSQL** >= 15 (managed service recommended: Neon, Aiven, or AWS RDS)
- **Systemd** (for Linux deployment) or Docker
- **Caddy** or **Nginx** (reverse proxy) — Caddyfile provided in `deploy/`

---

## Quick Start (Production)

```bash
# 1. Clone and install dependencies
git clone <repo-url> /opt/golineless
cd /opt/golineless
pnpm install

# 2. Configure environment
cp .env.example /opt/golineless/.env
# Edit .env with your production values (see sections below)

# 3. Build the API server
cd /opt/golineless/artifacts/api-server
pnpm run build

# 4. Run database migrations
cd /opt/golineless/db
pnpm run migrate

# 5. Start the server (via systemd)
sudo cp /opt/golineless/deploy/golineless.service /etc/systemd/system/
sudo systemctl enable golineless
sudo systemctl start golineless
```

---

## 1. WhatsApp OTP — Twilio

### Sign Up

1. Go to [twilio.com](https://www.twilio.com/) and create an account.
2. Set up a WhatsApp sender or use the Twilio WhatsApp Sandbox for testing.
3. Obtain a WhatsApp template Content SID (e.g., `HX229f5a04fd0510ce1b071852155d3e75`) configured with `{"1":"OTP"}` template parameters.

### Get API Keys

- Dashboard → Copy the **Account SID** and **Auth Token** from your console.

### Env Vars

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_CONTENT_SID=HX229f5a04fd0510ce1b071852155d3e75
```

### Verification

```bash
# The server logs "OTP sent via Twilio WhatsApp" on successful send.
# Check the API startup logs for:
#   { "features": { "sms": "configured" } }
```

---

## 2. Payments — Razorpay

### Sign Up

1. Go to [razorpay.com](https://razorpay.com/) and create a merchant account
2. Complete KYC verification (required for live payments)
3. Activate your account for production

### Get API Keys

- Dashboard → [Settings → API Keys](https://dashboard.razorpay.com/app/keys)
- Click **Generate Key** — you'll get **Key ID** and **Key Secret**
- These are shown only once — save them securely

### Webhook Setup

1. Dashboard → Settings → Webhooks → **Add Webhook**
2. **Webhook URL:** `https://yourdomain.com/api/payments/webhook`
3. **Events:** Select `payment.captured` and `payment.failed`
4. **Secret:** Generate a strong random string (e.g., `openssl rand -hex 32`)
5. Set this secret as `RAZORPAY_WEBHOOK_SECRET` in your `.env`

### Env Vars

```env
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Verification

```bash
# Create a test order:
curl -X POST https://yourdomain.com/api/payments/create-order \
  -H "Authorization: Bearer <user-token>" \
  -H "Content-Type: application/json" \
  -d '{"taskId": 1}' | jq

# Expected output includes: { "orderId": "order_xxxxx", "amount": 14900 }
```

---

## 3. Cloud Storage — Backblaze B2

### Sign Up

1. Go to [backblaze.com/cloud-storage](https://www.backblaze.com/cloud-storage) and sign up
2. Add a payment method (free tier: 10GB storage + 1GB download/day)

### Create a Bucket

1. Dashboard → **B2 Cloud Storage** → **Create a Bucket**
2. **Bucket Name:** `golineless-uploads` (or your choice)
3. **Bucket Type:** **Public** (so uploaded photos are directly accessible)
   - *For private mode:* Set to Private and use signed URLs (the app supports both)

### Get Application Keys

1. Dashboard → **B2 Cloud Storage** → **App Keys** → **Generate New Key**
2. **Bucket:** Select your bucket (restrict access)
3. **Capabilities:** Read, Write, Delete
4. Copy the **Key ID** and **Application Key** immediately

### CORS Setup (if using browser uploads)

Create a `b2-cors-rules.json`:

```json
{
  "corsRules": [
    {
      "allowedOrigins": ["https://yourdomain.com"],
      "allowedMethods": ["GET", "HEAD"],
      "allowedHeaders": ["authorization"],
      "maxAgeSeconds": 3600
    }
  ]
}
```

Apply via [B2 CLI](https://www.backblaze.com/docs/cloud-storage-command-line-tools) or the Dashboard.

### Env Vars

```env
B2_KEY_ID=004xxxxxxxxxxxxxxxxxxxxxxxxxxxx
B2_APPLICATION_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
B2_BUCKET_NAME=golineless-uploads
B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
```

> **Note:** If your bucket is in a different region, update `B2_ENDPOINT` accordingly (e.g., `s3.us-east-005.backblazeb2.com`). The region is the third-to-last segment of your bucket's S3 URL.

### Verification

```bash
# Upload a test photo via the API:
curl -X POST https://yourdomain.com/api/upload \
  -F "photo=@/path/to/test.jpg"

# Expected response:
# { "url": "https://s3.us-west-004.backblazeb2.com/golineless-uploads/...", "key": "uploads/...", "filename": "test.jpg" }
```

---

## 4. Error Monitoring — Sentry

### Sign Up

1. Go to [sentry.io](https://sentry.io/) and create an account
2. Create a new **Node.js / Express** project

### Get DSN

- Dashboard → Your Project → **Client Keys (DSN)**
- Copy the DSN string (e.g., `https://xxxxx@xxxxx.ingest.us.sentry.io/xxxxx`)

### Auth Token (for source maps)

1. Settings → **Developer Settings** → **Auth Tokens**
2. **Create New Token** with scopes:
   - `org:read`
   - `project:releases`
3. This token is used during the build process to upload source maps

### Env Vars

```env
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@xxxxx.ingest.us.sentry.io/xxxxxx
SENTRY_AUTH_TOKEN=sntrys_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Verification

```bash
# The server logs "Sentry initialized" on successful connection.
# Force a test error:
curl -X GET https://yourdomain.com/api/admin/founder \
  -H "Authorization: Bearer <admin-token>"

# Check Sentry Dashboard → Issues — errors should appear within seconds.
```

---

## Server Setup

### Systemd Service

The file `deploy/golineless.service` is pre-configured for systemd.

```bash
sudo cp /opt/golineless/deploy/golineless.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable golineless
sudo systemctl start golineless
sudo systemctl status golineless  # Verify it's running
```

**Important:** The service file reads the `.env` file from `/opt/golineless/.env`. Ensure the path in the `EnvironmentFile` directive matches your setup.

### Reverse Proxy (Caddy)

A Caddyfile is provided at `deploy/Caddyfile`. It handles:
- TLS/HTTPS automatically (Let's Encrypt)
- WebSocket proxying (for Socket.IO)
- Static file caching
- Security headers
- Gzip compression
- Rate limiting

```bash
# Install Caddy (if not installed):
sudo apt install caddy  # Debian/Ubuntu
# OR: brew install caddy  # macOS

# Copy and enable config:
sudo cp /opt/golineless/deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

> **Replace `DOMAIN_NAME`** in the Caddyfile with your actual domain before deploying.

### Database Migrations

```bash
cd /opt/golineless/db
pnpm run generate  # Generate migration files (if schema changed)
pnpm run migrate   # Apply migrations to the database
```

**For production**, consider:
- Running migrations as part of your CI/CD pipeline
- Using a dedicated migration user with limited permissions
- Taking a DB snapshot before running migrations

### Health Check

```bash
# API health endpoint (no auth required):
curl https://yourdomain.com/api/health

# Expected response:
# { "status": "ok", "timestamp": "2026-06-16T...", "version": "1.0.0" }
```

---

## Integration Checklist

Use this checklist to track which integrations are configured:

| Integration  | Env Vars Needed                           | Status     | Verified |
|-------------|--------------------------------------------|------------|----------|
| WhatsApp OTP| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `TWILIO_CONTENT_SID` | ☐ | ☐ |
| Payments    | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | ☐ | ☐ |
| Storage     | `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET_NAME` | ☐ | ☐ |
| Monitoring  | `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`          | ☐          | ☐        |

### Quick Verification

After starting the server, check the logs for the feature status summary:

```json
{
  "features": {
    "sms": "configured",
    "payments": "configured",
    "storage": "configured",
    "monitoring": "configured"
  }
}
```

Any feature showing `"missing"` means its env vars are not set.

---

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Generate a strong `ADMIN_TOKEN` (`openssl rand -hex 32`)
- [ ] Configure all 4 integrations above
- [ ] Set `ALLOWED_ORIGINS` to your frontend domain(s)
- [ ] Configure rate limiting (review `RATE_LIMIT_*` defaults)
- [ ] Run database migrations
- [ ] Set up Caddy/Nginx reverse proxy with HTTPS
- [ ] Enable systemd service with auto-restart
- [ ] Set up database automated backups
- [ ] Configure log aggregation (e.g., Papertrail, Logtail, or Grafana Loki)
- [ ] Set up uptime monitoring (e.g., UptimeRobot, Better Stack)
- [ ] Create a non-root deploy user (avoid running as root)
