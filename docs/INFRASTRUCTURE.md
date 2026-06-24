# Infrastructure Setup Guide

## I1: Uptime Monitoring

### Recommended: UptimeRobot (Free Tier)
1. Create account at [uptimerobot.com](https://uptimerobot.com)
2. Add 2 monitors:
   - **API Health Check**: `https://golineless.onrender.com/api/health`
     - Monitoring interval: 5 minutes
     - Alert contacts: your phone/email
   - **Frontend**: `https://golineless.vercel.app`
     - Monitoring interval: 5 minutes
3. Configure alerts:
   - SMS alerts for downtime > 2 minutes
   - Email alerts for all status changes
4. Optional: Add a status page (UptimeRobot Pro) at `status.golineless.com`

### Render Health Check (Built-in)
- Render automatically monitors the `/api/health` endpoint
- Configure in `render.yaml` under `healthCheckPath`
- Auto-restarts on failure (already configured)

---

## I2: Sentry Error Tracking

### Setup Steps
1. Create account at [sentry.io](https://sentry.io)
2. Create a new Node.js project
3. Copy the DSN from Settings → Client Keys
4. Add to Render environment:
   ```
   SENTRY_DSN=https://xxx@sentry.io/xxx
   ```
5. Sentry is already integrated in `src/lib/sentry.ts` — it will auto-initialize if `SENTRY_DSN` is set

### Verifying Sentry is Working
After deploying with `SENTRY_DSN` set:
1. Check Render logs for: `Sentry initialized successfully`
2. Trigger a test error (e.g., `GET /api/test-error`)
3. Check Sentry dashboard for the error event
4. Verify source maps are uploaded (see `render-build.sh`)

### Sentry Features Already Configured
- **Performance monitoring**: Traces HTTP requests and DB queries
- **Error tracking**: Catches unhandled exceptions and rejections
- **Release tracking**: Tags errors with git commit SHA
- **User context**: Attaches user ID to error reports

---

## I5: Database Backup Verification

### Neon Backup (Automatic)
Neon provides automatic backups for all paid plans:
- **Free tier**: Point-in-time recovery (7-day retention)
- **Pro tier**: Point-in-time recovery (30-day retention)

### Manual Backup Script
Run `scripts/backup.sh` to create a manual SQL dump:
```bash
./scripts/backup.sh
```
This exports the full database to `backups/backup_YYYYMMDD_HHMMSS.sql`.

### Verification Steps
1. Run backup: `./scripts/backup.sh`
2. Verify file exists: `ls -la backups/`
3. Test restore (on a staging DB):
   ```bash
   psql $STAGING_DATABASE_URL < backups/backup_YYYYMMDD_HHMMSS.sql
   ```
4. Check row counts match production

### Neon Console Backup
1. Go to [console.neon.tech](https://console.neon.tech)
2. Select your project → Branches
3. Click "Create branch" to snapshot the current state
4. Rename branch to `backup_YYYYMMDD` for reference

### Backup Schedule
- **Automatic**: Neon handles daily backups on paid plans
- **Manual**: Run `backup.sh` before any major migration
- **Pre-deploy**: Always backup before schema changes

---

## Environment Variables Checklist

Required for production deployment on Render:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `ADMIN_TOKEN` | ✅ | Legacy admin auth token |
| `ENCRYPTION_KEY` | ✅ | AES-256 key for Aadhaar encryption (64 hex chars) |
| `BREVO_API_KEY` | ✅ | Brevo transactional email API key |
| `SENTRY_DSN` | 🟡 | Sentry error tracking DSN |
| `B2_KEY_ID` | 🟡 | Backblaze B2 cloud storage key |
| `B2_APP_KEY` | 🟡 | Backblaze B2 application key |
| `B2_BUCKET_NAME` | 🟡 | B2 bucket for KYC/avatar uploads |
| `TWILIO_ACCOUNT_SID` | 🟡 | Twilio SMS account SID |
| `TWILIO_AUTH_TOKEN` | 🟡 | Twilio SMS auth token |
| `TWILIO_PHONE_NUMBER` | 🟡 | Twilio sender phone number |
| `GOOGLE_CLIENT_ID` | 🟡 | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | 🟡 | Google OAuth client secret |
| `RAZORPAY_KEY_ID` | 🟡 | Razorpay payment key |
| `RAZORPAY_KEY_SECRET` | 🟡 | Razorpay payment secret |
| `ALLOWED_ORIGINS` | 🟡 | Comma-separated CORS origins |

### Generating ENCRYPTION_KEY
```bash
openssl rand -hex 32
```
Add the output to Render as `ENCRYPTION_KEY=<output>`.
