# 🚀 Go LineLess — Roadmap to 100% Completion

**Current Score:** 74% (as of June 11, 2026)  
**Target Score:** 100%  
**Target State:** Production-ready Ahmedabad pilot system, fully deployed, monitored, and operational

---

## ⚡ Quick Summary

| Phase | Focus | Estimated Effort | Score After | Credits Needed |
|-------|-------|-----------------|-------------|----------------|
| **0** | Remaining Type Safety | 1-2 hours | 78% | ~500 |
| **1** | Console & Code Cleanup | 30 min | 80% | ~100 |
| **2** | Brand & Content | 1 hour | 82% | ~200 |
| **3** | Testing & CI | 3-4 hours | 87% | ~800 |
| **4** | SMS Integration | 1-2 hours | 90% | ~400 |
| **5** | Payments Integration | 2-3 hours | 93% | ~600 |
| **6** | Photo Storage | 1-2 hours | 95% | ~400 |
| **7** | Production Hardening | 2-3 hours | 98% | ~500 |
| **8** | Deployment & Monitoring | 2-3 hours | 100% | ~600 |

**Total estimated effort (after this session):** ~15-20 hours of AI-assisted work  
**Total estimated credits:** ~4,000 (subject to model costs)

---

## Table of Contents

1. [Phase 0: Remaining Type Safety](#phase-0-remaining-type-safety)
2. [Phase 1: Console & Code Cleanup](#phase-1-console--code-cleanup)
3. [Phase 2: Brand & Content](#phase-2-brand--content)
4. [Phase 3: Testing & CI](#phase-3-testing--ci)
5. [Phase 4: SMS OTP Integration](#phase-4-sms-otp-integration)
6. [Phase 5: Payment Gateway Integration](#phase-5-payment-gateway-integration)
7. [Phase 6: Photo Storage Migration](#phase-6-photo-storage-migration)
8. [Phase 7: Production Hardening](#phase-7-production-hardening)
9. [Phase 8: Deployment & Monitoring](#phase-8-deployment--monitoring)
10. [Appendix: Scoring Methodology](#appendix-scoring-methodology)
11. [Appendix: Key Files Reference](#appendix-key-files-reference)

---

## Phase 0: Remaining Type Safety

**Score impact:** 74% → 78% (+4%)  
**Estimated effort:** 1-2 hours  
**Packages affected:** `artifacts/qbuddy`, `artifacts/api-server`

### 0.1 — Fix 11 App Page Loose Types (P0)

| File | Count | Problem | Fix |
|------|-------|---------|-----|
| `UserProfile.tsx` | 6 | `(stats as any).totalTasks`, `(stats as any).hoursSaved`, `(stats as any).valueSaved`, `(sub as any).planName`, `(sub as any).tasksUsed`, `(sub as any).tasksPerMonth` | Import `UserStats` and `Subscription` types from generated schemas, cast individually instead of whole-object cast |
| `BookTask.tsx` | 5 | `as any` on mutate payloads x2, `(data: any)` success callback, `(err: any)` error callback, `(opt.val as any)` urgency selection | Use mutation generics, type callbacks with `{ price?: number }`, narrow the opt cast |
| `TaskDetail.tsx` | 2 | `let map: any;` (Leaflet map), `L.Icon.Default.prototype as any` | Type as `L.Map | null`, use proper Leaflet type |

**Pattern to follow from RunnerProfile.tsx:**
```typescript
// Before:
stats: { Icon: LucideIcon; val: string | number; label: string; color: string; bg: string }[]
// After: Use generated type + inline narrow cast
{(stats as UserStats).totalTasks ?? 0}
```

### 0.2 — Fix 9 Remaining `(req as any).user/runner` Casts (P0)

**Infrastructure already exists:** `types/express.d.ts` with Express Request augmentation

| File | Line | Current Code | Fix |
|------|------|--------------|-----|
| `routes/runners.ts` | 40 | `(req as any).runner` | `req.runner!` |
| `routes/runners.ts` | 63 | `(req as any).runner` | `req.runner!` |
| `routes/tasks.ts` | 878 | `(req as any).user` | `req.user!` |
| `routes/tasks.ts` | 908 | `(req as any).runner` | `req.runner!` |
| `routes/tasks.ts` | 935 | `(req as any).runner` | `req.runner!` |
| `routes/tasks.ts` | 972 | `(req as any).runner` | `req.runner!` |
| `routes/tasks.ts` | 1057 | `(req as any).runner` | `req.runner!` |
| `routes/tasks.ts` | 1101 | `(req as any).user` | `req.user!` |
| `routes/users.ts` | 10 | `(req as any).user` | `req.user!` |

**Files to edit:** `runners.ts`, `tasks.ts`, `users.ts`

### 0.3 — Fix 5 Backend Function `any` Params (P0)

| File | Line | Current | Fix |
|------|------|---------|-----|
| `routes/tasks.ts` | 75 | `conditions: any[]` | `conditions: (SQL | undefined)[]` or infer from drizzle types |
| `routes/tasks.ts` | 848 | `existing: any` | `typeof tasksTable.$inferSelect` |
| `routes/tasks.ts` | 848 | `res: any` | `Response` |
| `routes/tasks.ts` | 1138 | `runnerLocation: any` | Proper interface or `null` |
| `routes/admin.ts` | KYC handler | `updates: any` | `Record<string, any>` or `Partial<typeof runnersTable.$inferInsert>` |
| `index.ts` | 79 | `proof: any` (Socket.IO) | `proof: ProofPhotoInput` or `Record<string, unknown>` |

### 0.4 — Fix 3 Backend `catch(err: any)` (P0)

| File | Line | Fix |
|------|------|-----|
| `routes/tasks.ts` | 259 | `catch (err: unknown)` — access `err instanceof Error ? err.message : String(err)` |
| `routes/pricing.ts` | 82 | `catch (err: unknown)` — same pattern |

### 0.5 — Fix Test File Types (P1)

| File | Problem | Fix |
|------|---------|-----|
| `integration.test.ts` | 10+ `any` annotations in mock chain | Create proper mock interfaces for `$data`, `chain`, callbacks |
| `auth.test.ts` | 3 `any` annotations | Use proper Express types for mock req/res |
| `runners.test.ts` | 2 `any` annotations | Use proper Express types for mock req/res |

---

## Phase 1: Console & Code Cleanup

**Score impact:** 78% → 80% (+2%)  
**Estimated effort:** 30 minutes  
**Packages affected:** `artifacts/api-server`

### 1.1 — Replace Backend `console.error` with Logger (P1)

**12 occurrences across 2 files:**

| File | Line | Context | Recommended Action |
|------|------|---------|-------------------|
| `routes/tasks.ts` | 260-265 | Booking error logging (6 lines) | Replace with structured `logger.error({ err, ... })` |
| `routes/tasks.ts` | 492 | Fraud alert warning | Keep as `logger.warn` with structured data |
| `routes/tasks.ts` | 527 | Photo save failure | `logger.error({ err }, "Failed to save photo to disk")` |
| `routes/tasks.ts` | 776 | Trust score update failure | `logger.error({ err }, "Trust score update failed")` |
| `routes/tasks.ts` | 864 | Trust score on cancel | Same pattern |
| `routes/tasks.ts` | 901 | Trust score on review | Same pattern |
| `routes/pricing.ts` | 83 | Pricing preview error | `logger.error({ err }, "Pricing preview error")` |

**Note:** `pino` logger instance already exists at `lib/logger.ts`.

### 1.2 — Remove QBuddy Migration Code (P1)

**6 occurrences in 3 files:**

| File | Line | Current Code | Action |
|------|------|-------------|--------|
| `AuthContext.tsx` | 53-56 | `localStorage.removeItem("qbuddy_*")` | Remove — migration complete after first load |
| `AdminSidebar.tsx` | 39 | `localStorage.removeItem("qbuddy_admin_token")` | Remove — migration complete |
| `main.tsx` | 1-8 | Migration comments + key list | Keep comments for historical reference but code can be removed after all users have migrated |

**Note:** The migration code runs on every page load. After the project has been running for a while, ALL users' browsers will have been migrated, making this dead code. Remove after confirming.

---

## Phase 2: Brand & Content

**Score impact:** 80% → 82% (+2%)  
**Estimated effort:** 1 hour  
**Packages affected:** `artifacts/qbuddy`

### 2.1 — Landing Page Compliance (P1)

- **Verify testimonials**: Check `Landing.tsx` for fake testimonials or unverified user quotes
- **Verify stats**: Check for made-up numbers (e.g., "10,000+ users", "99.9% satisfaction")
- **Add legal disclaimer**: If no disclaimer exists, add standard pilot-phase disclaimer
- **Review claims**: No claim should imply production-level scale for a pilot

### 2.2 — Accessibility Audit (P2)

- Ensure all interactive elements have accessible labels
- Add `aria-label` to icon-only buttons
- Ensure sufficient color contrast ratios
- Add focus indicators for keyboard navigation

### 2.3 — SEO & Metadata (P2)

- Update page titles from "QBuddy" to "Go LineLess"
- Add meta descriptions to all pages
- Add Open Graph tags for social sharing
- Add `robots.txt` and `sitemap.xml` for production

---

## Phase 3: Testing & CI

**Score impact:** 82% → 87% (+5%)  
**Estimated effort:** 3-4 hours  
**Packages affected:** `scripts`, new CI config files

### 3.1 — Fix Existing Test Scripts (P1)

| Script | Problem | Fix |
|--------|---------|-----|
| `scripts/src/seed.ts` | Import paths from wrong locations | Fix imports to reference `@workspace/db` and `artifacts/api-server/src/lib/` |
| `scripts/src/dispatch-stress-test.ts` | Same import path issues | Fix imports |
| `scripts/src/queue-engine-test.ts` | Same import path issues | Fix imports |
| `scripts/src/otp-security-test.ts` | Same import path issues | Fix imports |
| `scripts/src/e2e-pilot-validation.ts` | Same import path issues | Fix imports + verify all 12 modules pass |

**Dependencies to add to `scripts/package.json`:**
```json
{
  "dependencies": {
    "@workspace/db": "workspace:*",
    "drizzle-orm": "catalog:",
    "dotenv": "^16.4.0"
  }
}
```

### 3.2 — Add Unit Tests for Core Engines (P2)

**Target 80%+ coverage on these critical modules:**

| Module | File | Test Areas |
|--------|------|------------|
| Revenue Engine | `lib/revenue-engine.ts` | Pricing calculation, waiting charges, priority fees, urgency multipliers |
| Dispatch Engine | `lib/dispatch-engine.ts` | Wave dispatch, distance scoring, radius expansion |
| Trust Engine | `lib/trust-engine.ts` | Score calculation, badge assignment, metrics update |
| GPS Engine | `lib/gps-engine.ts` | GPS validation, duplicate proof detection, timeline validation |

### 3.3 — Add Browser E2E Tests (P2)

**Recommended tool:** Playwright (best TypeScript support, works with Vite)

**Critical flows to cover:**
1. User OTP login → Book a task → View task details → Cancel task
2. Runner OTP login → Complete onboarding → View available tasks → Accept a task → Complete task workflow
3. Admin login → View dashboard → Manage tasks → Approve KYC
4. Family tracking: Book family task → Generate tracking link → View tracking as family member

### 3.4 — Fix post-merge.sh Script (P2)

**File:** `scripts/post-merge.sh`

**Problem:** The script uses `--filter db` but the correct pnpm workspace filter is `--filter @workspace/db`.

```bash
# Current:
pnpm --filter db push

# Fix:
pnpm --filter @workspace/db push
```

This affects Replit deployments via `.replit` config. Fix in 30 seconds.

---

### 3.5 — Set Up CI Pipeline (P2)

**Recommended approach:** GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm run typecheck
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: golineless_test
          POSTGRES_PASSWORD: postgres
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm --filter @workspace/api-server run test
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm dlx playwright install
      - run: pnpm --filter @workspace/scripts run e2e-pilot-validation
```

---

## Phase 4: SMS OTP Integration

**Score impact:** 87% → 90% (+3%)  
**Estimated effort:** 1-2 hours  
**Service:** [MessageBird (Bird)](https://bird.com) — recommended for India OTP delivery  
**Credentials needed:** `MESSAGEBIRD_API_KEY`

### 4.1 — Implementation Steps

```
1. Create MessageBird account → Get API key
2. Install SDK: pnpm --filter @workspace/api-server add messagebird
3. Create lib/sms.ts wrapper with sendOtp(phone, otp) function
4. Update auth.ts routes:
   - POST /auth/send-otp: Replace direct OTP return with SMS send
   - Keep OTP in response ONLY in dev mode (NODE_ENV check)
5. Remove OTP from all API responses in production
6. Add .env.example entry: MESSAGEBIRD_API_KEY=
```

### 4.2 — Verification

- Test OTP flow with a real phone number (dev mode)
- Verify OTP is NOT returned in production API responses
- Verify error handling when SMS delivery fails

---

## Phase 5: Payment Gateway Integration

**Score impact:** 90% → 93% (+3%)  
**Estimated effort:** 2-3 hours  
**Service:** [Razorpay](https://razorpay.com) — recommended for Indian market (UPI, cards, net banking)  
**Credentials needed:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`

### 5.1 — Backend Implementation

```
1. Create Razorpay account → Get API keys
2. Install SDK: pnpm --filter @workspace/api-server add razorpay
3. Create lib/payments.ts with:
   - createOrder(amount, currency, receipt) — for task payment
   - capturePayment(paymentId, amount) — for payment confirmation
   - verifyWebhook(body, signature) — for webhook verification
4. Add POST /api/payments/create-order endpoint
5. Add POST /api/payments/webhook endpoint (Razorpay webhook)
6. Update booking flow: collect payment before dispatch
```

### 5.2 — Frontend Integration

```
1. Install @workspace/api-client-react: pnpm add razorpay
   (or use Razorpay's Checkout.js directly)
2. Create Razorpay checkout component
3. Update BookTask.tsx: after price confirmation, open Razorpay checkout
4. On payment success: proceed with task dispatch
```

### 5.3 — Subscription Payments

```
1. Create subscription plans in Razorpay
2. Update AdminSubscriptions.tsx to manage plans
3. Link UserProfile subscription to Razorpay subscription
```

---

## Phase 6: Photo Storage Migration

**Score impact:** 93% → 95% (+2%)  
**Estimated effort:** 1-2 hours  
**Service:** [Backblaze B2](https://backblaze.com) — S3-compatible, 1/4 price of AWS S3  
**Credentials needed:** `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET_NAME`

### 6.1 — Implementation

```
1. Create Backblaze B2 account → Create bucket + app key
2. Install SDK: pnpm --filter @workspace/api-server add @backblaze/b2-sdk-js
3. Create lib/storage.ts with:
   - uploadFile(buffer, filename, contentType) — upload to B2
   - getSignedUrl(filename, expirySeconds) — generate time-limited access URLs
   - deleteFile(filename) — for cleanup
4. Update routes/tasks.ts proof-photo endpoint:
   - Replace local disk save with B2 upload
   - Store B2 URL instead of /uploads/ path
   - Add signed URL generation for photo viewing
5. Update rate limiting: reduce multer limits since B2 handles scale
```

### 6.2 — Photo Display Updates

```
1. Update ActiveTask.tsx to display photos from B2 URLs instead of local /uploads/
2. Update Admin pages to load photos from B2 signed URLs
3. Add loading states for photo components
```

---

## Phase 7: Production Hardening

**Score impact:** 95% → 98% (+3%)  
**Estimated effort:** 2-3 hours  
**Packages affected:** `artifacts/api-server`, `artifacts/qbuddy`

### 7.1 — Rate Limiting Tuning (P2)

| Endpoint | Current | Recommended | Rationale |
|----------|---------|-------------|-----------|
| Global | 100/min | 200/min | More generous for pilot users |
| OTP send | None | 3/30min | Prevent SMS bombing |
| OTP verify | 5/30min (brute-force lockout) | Keep as-is | Already hardened |
| Booking | 20/hour | Keep as-is | Reasonable |
| Dispatch | 30/hour | 50/hour | Allow more dispatch test volume |
| Login | None | 5/min | Prevent brute force |

### 7.2 — Fake Coordinate Fix (P2)

**Backend file:** `routes/admin.ts` lines 421-422

```typescript
// Current (fakes random Ahmedabad coords):
lat: r.currentLat ? Number(r.currentLat) : (23.0225 + (Math.random() - 0.5) * 0.1),
lng: r.currentLng ? Number(r.currentLng) : (72.5714 + (Math.random() - 0.5) * 0.1),

// Fix (omit or use null):
lat: r.currentLat ? Number(r.currentLat) : null,
lng: r.currentLng ? Number(r.currentLng) : null,
```

**Frontend file:** `AdminMap.tsx` — The fleet map renders markers from runner location data. After the backend fix, some markers will have `null` lat/lng instead of random coordinates. Update the map component to skip markers with null coordinates:

```typescript
// Before:
runners.filter(r => r.lat && r.lng).map(r => ...)
// No change needed — already filters, but verify null handling
```

Also verify that the map doesn't crash when ALL runners have null coordinates (should show an empty state message instead).

### 7.3 — Socket.IO Auth Hardening (P2)

Current state: Socket.IO has basic token acceptance but no enforcement.

**Steps:**
1. Validate token on connection (check against `userSessionsTable` / `runnerSessionsTable`)
2. Reject unauthenticated connections in production mode
3. Add room membership validation (prevent listening to other people's task rooms)
4. Add rate limiting on Socket.IO events (max 100 events/min per socket)

### 7.4 — Secrets & Env Management (P2)

- Move from `.env` files to environment variables in production
- For Replit: use Replit Secrets
- For self-hosted: use process.env with a `.env.production` file (gitignored)
- Add validation on startup: check all required env vars are present

```typescript
// Add to index.ts start-up:
const REQUIRED_ENV_VARS = ["DATABASE_URL", "ADMIN_TOKEN", "ALLOWED_ORIGINS"];
for (const v of REQUIRED_ENV_VARS) {
  if (!process.env[v]) {
    logger.fatal({ envVar: v }, "Missing required environment variable");
    process.exit(1);
  }
}
```

### 7.5 — Error Handling Improvements (P2)

- Add a global Express error handler middleware
- Return structured error responses consistently (`{ error, detail, code }`)
- Add request IDs to all error responses for debugging
- Sanitize error messages in production (don't leak stack traces)

---

## Phase 8: Deployment & Monitoring

**Score impact:** 98% → 100% (+2%)  
**Estimated effort:** 2-3 hours  
**Requires:** Deployment environment access, monitoring service credentials

### 8.1 — Production Monitoring (P2)

**Recommended:** [Sentry](https://sentry.io) (free tier available) for error tracking

```
1. Create Sentry account → Get DSN
2. Install: pnpm --filter @workspace/api-server add @sentry/node
3. Initialize Sentry in index.ts
4. Add SENTRY_DSN to .env.example
5. Configure source maps for stack traces
```

**Additional:**
- Add [express-status-monitor](https://github.com/RafalWilinski/express-status-monitor) for live server metrics
- Set up [Better Stack](https://betterstack.com) or [UptimeRobot](https://uptimerobot.com) for uptime monitoring
- Add health check endpoint: `GET /api/health` (already exists at `routes/health.ts`)

### 8.2 — Database Migration Strategy (P2)

Current state: Schema changes via Drizzle push (development only).

**Production approach:**
```
1. Use `drizzle-kit generate` to create migration SQL files
2. Store migrations in lib/db/migrations/ directory
3. Run migrations at startup with drizzle-orm's migrate() function
4. Document rollback procedure
```

### 8.3 — Deployment Configuration

**Option A — Replit Deploy (simplest for pilot):**
- Connect GitHub repo to Replit
- Configure Replit Secrets (env vars)
- Set up Replit Autoscale for production
- Use Replit's built-in PostgreSQL

**Option B — Self-Hosted (more control):**
```
1. Set up reverse proxy (Nginx/Caddy)
2. Configure SSL certificates (Let's Encrypt)
3. Set up PostgreSQL database
4. Configure systemd service for api-server
5. Build frontend: cd artifacts/qbuddy && pnpm build
6. Deploy dist/ to CDN or static file server
7. Configure Vite proxy for API server in production
```

### 8.4 — Logging & Audit Trail (P2)

- Ensure Pino logging is structured (JSON format) for log aggregation
- Add audit logging for sensitive operations (KYC approval, refunds, account changes)
- Set log retention policy (30 days minimum)
- Configure log shipping to a central service (e.g., [Axiom](https://axiom.co), [Logtail](https://logtail.com))

### 8.5 — Backup & Recovery (P2)

- Configure automated PostgreSQL backups (daily minimum)
- Document recovery procedure
- Test backup restoration in a staging environment
- Store backups in a separate location/region

---

## 📈 Score Progression Visualization

```
100% ┤                                                    ●── (target)
 95% ┤                                          ●── (Phase 6)
 90% ┤                               ●── (Phase 5)
 85% ┤                    ●── (Phase 3+4)
 80% ┤         ●── (Phase 0-2)
 74% ┤●── (current)
      └────┬────┬────┬────┬────┬────┬────┬────┬────
          Ph0  Ph1  Ph2  Ph3  Ph4  Ph5  Ph6  Ph7  Ph8
```

---

## 🎯 Recommended Execution Order (Optimized)

```
Week 1: Code Quality (Phases 0-1)
  ├── [AI] Fix 11 app page loose types
  ├── [AI] Fix 9 backend (req as any) casts
  ├── [AI] Fix 5 backend function signatures
  ├── [AI] Fix 3 catch(err: any)
  ├── [AI] Replace 12 console.error with pino logger
  └── Verify: pnpm run typecheck passes (all 8 packages)

Week 1-2: Content & Tests (Phases 2-3)
  ├── [AI] Landing page compliance review
  ├── [AI] Fix test scripts and add dependencies
  ├── [AI] Add core engine unit tests
  ├── [AI] Set up Playwright + add 5 E2E test files
  ├── [AI] Create .github/workflows/ci.yml
  └── Verify: pnpm test passes, Playwright tests pass

Week 2-3: External Integrations (Phases 4-6) — NEEDS YOUR CREDENTIALS
  ├── [AI] SMS OTP integration (MessageBird)   ← Needs MESSAGEBIRD_API_KEY
  ├── [AI] Payment gateway (Razorpay)          ← Needs RAZORPAY_KEY_ID/SECRET
  ├── [AI] Photo storage (Backblaze B2)        ← Needs B2_KEY_ID/KEY/BUCKET
  └── Verify: Full E2E flow works with real SMS, payments, photos

Week 3-4: Production Hardening (Phases 7-8)
  ├── [AI] Rate limit tuning
  ├── [AI] Fix fake coordinates in admin map
  ├── [AI] Socket.IO auth hardening
  ├── [AI] Secrets validation + error handler
  ├── [AI] Sentry error monitoring
  ├── [AI] Database migration setup
  ├── [AI] Nginx/Caddy config + SSL
  └── Verify: Full production deployment test
```

---

## 🔑 Services & Credentials Needed

| Service | Purpose | What You Need | Setup Link | Estimated Cost |
|---------|---------|---------------|------------|----------------|
| **MessageBird** | SMS OTP delivery | `MESSAGEBIRD_API_KEY` | [Setup](https://index.trygravity.ai/go/3605fb6c-9c10-49b7-af3d-d936de9809e4) | ~$0.005/SMS in India |
| **Razorpay** | Payment processing | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | [Setup](https://index.trygravity.ai/go/d3d66743-0b46-4407-b028-461e6cd36617) | 2% + GST per transaction |
| **Backblaze B2** | Photo storage | `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET_NAME` | [Setup](https://index.trygravity.ai/go/ce024f59-a904-446a-9561-981e36bda3c1) | ~$0.006/GB/month |
| **Sentry** | Error monitoring | `SENTRY_DSN` | [sentry.io](https://sentry.io) | Free tier: 5k events/month |
| **GitHub Actions** | CI/CD | GitHub repo (already have one) | Built-in | Free for public repos |

---

## 📁 Key Files Reference

| File Path | Purpose | Phase |
|-----------|---------|-------|
| `artifacts/qbuddy/src/pages/app/UserProfile.tsx` | 6 loose types to fix | 0.1 |
| `artifacts/qbuddy/src/pages/app/BookTask.tsx` | 5 loose types to fix | 0.1 |
| `artifacts/qbuddy/src/pages/app/TaskDetail.tsx` | 2 loose types to fix | 0.1 |
| `artifacts/api-server/src/routes/tasks.ts` | 6 `(req as any)` + 4 function sigs + 2 catch | 0.2-0.4 |
| `artifacts/api-server/src/routes/runners.ts` | 2 `(req as any)` | 0.2 |
| `artifacts/api-server/src/routes/users.ts` | 1 `(req as any)` | 0.2 |
| `artifacts/api-server/src/routes/admin.ts` | 1 `updates: any` + fake coordinates | 0.3, 7.2 |
| `artifacts/api-server/src/routes/pricing.ts` | 1 `catch(err: any)` | 0.4 |
| `artifacts/api-server/src/__tests__/*.test.ts` | 10+ loose types in tests | 0.5 |
| `artifacts/api-server/src/lib/logger.ts` | Pino logger instance | 1.1 |
| `artifacts/api-server/src/index.ts` | Server entry — Socket.IO, secret validation | 7.3, 7.4 |
| `artifacts/qbuddy/src/pages/landing/Landing.tsx` | Landing page claims | 2.1 |
| `scripts/src/*.ts` | 5 test scripts with broken imports | 3.1 |
| `lib/db/drizzle.config.ts` | Drizzle config for migrations | 8.2 |
| `.env.example` | Template for required env vars | 7.4 |

---

## 🏁 Getting Started

To begin working through this roadmap:

1. **Start with Phase 0** — these are the highest-impact, zero-credential items
2. **Send the prompt:** *"Fix the 11 loose type annotations in app pages (UserProfile, BookTask, TaskDetail)"*
3. After each phase completes, request the next one
4. For Phases 4-6, have your service credentials ready before beginning

**Ready to start?** Sending *"Start Phase 0: Fix the 11 app page loose types"* will kick off the first work item.
