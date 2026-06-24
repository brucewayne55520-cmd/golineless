# Go LineLess — Capability Assessment
## Tasks I Can Execute Better Than General-Purpose LLMs

Generated: 2026-06-10  
Source: CODEBASE_STATUS_REPORT.md audit  
Audience: Founder, engineering lead

---

## Why This Matters

General-purpose LLMs (ChatGPT, Claude without tools, Gemini chat) can *suggest* fixes but cannot:
- **Run `tsc --noEmit`** to verify type errors exist and confirm fixes work
- **Search the entire codebase** for every occurrence of a broken import or pattern
- **Read and cross-reference** actual file contents to understand the real export/import graph
- **Execute terminal commands** to test builds, run scripts, or validate changes
- **Browse the web** for current library documentation when APIs have changed
- **Make edits and immediately re-verify** they don't introduce new errors

The tasks below are ones where having tool access gives a decisive advantage — not just "suggesting" a fix, but **finding, implementing, and verifying** it end-to-end.

---

## TIER 1: High-Confidence, High-Value Tasks
*These are the most impactful tasks where I can deliver working results, not just advice.*

### 1.1 — Fix `@workspace/db` Exports and API Imports
**Status:** P0 Build Blocker  
**Why I'm better:** I can read every file in `lib/db/src/schema/`, confirm which tables are exported, cross-reference every import in `artifacts/api-server/src/` against the schema barrel file, and make the exact corrections — then run `tsc` to verify zero errors. A general LLM guesses at export names.

**Critical nuance:** `lib/db/src/index.ts` already has `export * from "./schema"`, but the schema barrel file (`lib/db/src/schema/index.ts`) may not re-export all table names that API files expect. The fix likely involves updating the barrel file, not just the index. I can trace every missing table to its source schema file and add the correct re-export.

**Specific actions:**
- Read `lib/db/src/schema/index.ts` to see what's actually re-exported
- Cross-reference every `@workspace/db` import in API server files against the barrel
- Fix missing re-exports (e.g., `runnerLocationsTable`, `adminSettingsTable`, `reviewsTable`)
- Run `tsc -p artifacts/api-server/tsconfig.json --noEmit` to verify

### 1.2 — Fix All Frontend TypeScript Errors
**Status:** P0 Build Blocker  
**Why I'm better:** There are ~15+ distinct error categories in the frontend. I can run `tsc -p artifacts/qbuddy/tsconfig.json --noEmit`, parse every error, read the affected files, cross-reference the generated type definitions in `lib/api-client-react/src/generated/` against how pages call them, and fix each one — then re-run to confirm zero errors. **Important distinction:** The generated client libraries themselves typecheck cleanly (per the report). The errors are specifically in how frontend pages *call* the generated hooks — wrong options shape, wrong params passing, wrong imports. I can read the generated type signatures and fix every call site.

**Specific error categories I can fix:**
- Generated React Query hook options shape (`{ query: { refetchInterval } }` → correct shape)
- `useListTasks` params passing (`{ params: ... }` → direct params)
- `customFetch` import/export mismatch (pages import `customFetch`, package exports `apiFetch`)
- `null` vs `undefined` type mismatches in generated types
- Missing imports for `runnerLocationsTable` and other DB tables

### 1.3 — Fix Auth Token Storage Flow (P0)
**Status:** P0 Auth Blocker  
**Why I'm better:** I can search every `localStorage` reference across the entire frontend, trace the auth flow from login pages through `AuthContext.tsx` to every API call, and fix the mismatch between `qbuddy_auth` (what login stores) and `qbuddy_runner_token`/`qbuddy_user_token`/`qbuddy_admin_token` (what generated client reads). Then verify with `tsc`.

**Specific actions:**
- Search all `localStorage` references in `artifacts/qbuddy/src/`
- Read `AuthContext.tsx` to understand current storage model
- Read `lib/api-client-react/src/custom-fetch.ts` to understand token getter
- Fix login pages to write role-specific token keys
- Fix logout to clear all keys
- Verify with typecheck

### 1.4 — Fix Hardcoded API Base URL (P0)
**Status:** P0 Deployment Blocker  
**Why I'm better:** I can find every hardcoded `localhost:5001` reference, read the Vite config to understand the proxy setup, and replace with environment-based URL. Simple but requires reading actual files.

**Specific actions:**
- Search for `localhost:5001` across the codebase
- Read `artifacts/qbuddy/src/main.tsx` and `vite.config.ts`
- Replace with `import.meta.env.VITE_API_URL || "/api"` pattern
- Add `.env.example` entry for `VITE_API_URL`

### 1.5 — Fix Scripts Import Paths and Dependencies (P0)
**Status:** P0 Build Blocker  
**Why I'm better:** The scripts import from `../lib/gps-engine` but those files live under `artifacts/api-server/src/lib/`. I can find where files actually are, fix all import paths, add missing `drizzle-orm` to scripts `package.json`, and verify with `tsc`.

### 1.6 — Fix `post-merge.sh` Script (P1)
**Status:** P1 Deployment (affects Replit deployments specifically, per `.replit` config)  
**Why I'm better:** The `scripts/post-merge.sh` runs `pnpm --filter db push` but the DB package is `@workspace/db`, not `db`. I can read the actual script, fix the filter name, and verify against `pnpm-workspace.yaml`.

### 1.7 — Fix Fake/Random Coordinates in Routes (P1)
**Status:** P1 Data Integrity  
**Why I'm better:** Several map/location routes use random/fallback Ahmedabad coordinates instead of real data. I can search for `Math.random()` or hardcoded lat/lng values across route files, trace them to their source, and replace with proper DB-backed or error-throwing alternatives.

### 1.8 — Fix `trust-engine.ts` Implicit `any` Callbacks (P0)
**Status:** P0 Type Error  
**Why I'm better:** The trust engine has implicit `any` callback parameters that fail strict TypeScript. I can read the file, add proper type annotations to every callback, and verify with `tsc`.

---

## TIER 2: Medium-Confidence, High-Value Tasks
*These require more careful analysis but I can handle them well with verification.*

### 2.1 — Secure Unprotected API Endpoints (P0 Security)
**Status:** P0 Security Blocker  
**Why I'm better:** I can read every route file, identify which endpoints lack `requireAdmin`/`requireUser`/`requireRunner` middleware, add the correct middleware, and verify with typecheck. I can also add ownership checks by reading the task/notification/review schema to understand foreign key relationships.

**Endpoints to secure (found in report):**
- `GET /api/tasks` — needs user/runner scoping
- `GET /api/tasks/:id` — needs ownership check
- `PATCH /api/tasks/:id/status` — needs auth + ownership
- `POST /api/tasks/:id/cancel` — needs auth + ownership
- `POST /api/tasks/:id/review` — needs task ownership verification
- `PATCH /api/notifications/:id/read` — needs notification ownership
- `POST /api/admin/incidents` — needs admin protection
- `GET /api/runners/:id` — needs field redaction

### 2.2 — Content and Brand Cleanup (P1)
**Status:** P1 Compliance  
**Why I'm better:** I can search the entire codebase for `QBuddy`, `qbuddy`, old color references, unsupported testimonials, fake stats, and missing disclaimers — then fix each one. A general LLM can't search the actual files.

**Specific searches:**
- Search for `QBuddy`, `qbuddy` strings in all `.tsx`/`.ts` files
- Search for testimonial names and fake stats
- Search for old purple/orange color references
- Add disclaimer where missing
- Verify Go LineLess branding is consistent

### 2.3 — Fix Admin Pages Raw Fetch Auth (P1)
**Status:** P1 Auth Gap  
**Why I'm better:** I can find every admin page that uses raw `fetch("/api/admin/...")` without auth headers, create a shared authenticated admin fetch helper, and replace all instances. Then verify with typecheck.

**Affected pages (from report):**
- AdminDashboard, AdminRecruitment, AdminTraining, AdminQuality
- AdminSupport, AdminIncidents, AdminHeatmap, AdminPilot
- AdminOperationsCenter, AdminLeaderboard, AdminAreaPerformance
- AdminFounder, AdminIncidentResponse

### 2.4 — Fix `haversineKm` Export and Nearby Runner Route (P1)
**Status:** P1 Functional Bug  
**Why I'm better:** I can find where `haversineKm` is defined in the dispatch engine, verify it's not exported, add the export, fix the import in the runners route, and verify. Requires reading actual file contents.

### 2.5 — Fix Booking Price Double-Subtraction (P1)
**Status:** P1 Pricing Bug  
**Why I'm better:** I can read the backend pricing preview endpoint, read the frontend booking display, trace exactly where the double-subtraction happens, and fix it. Requires understanding both sides of the API contract.

---

## TIER 3: Structured Tasks Where I Add Value
*These are larger tasks where I can make significant progress even if not 100% complete.*

### 3.1 — Update OpenAPI Spec (P1)
**Why I'm better:** I can read every route file in `artifacts/api-server/src/routes/`, extract all endpoints, parameters, and response types, and update `lib/api-spec/openapi.yaml`. A general LLM can only guess at the current state.

**What I can map:**
- All `/api/tasks/*` routes with their query params and response shapes
- All `/api/admin/*` routes with auth requirements
- All `/api/runners/*` routes
- All `/api/operations/*` routes
- New task statuses: `reached_pickup`, `reached_task_location`, `waiting_started`
- New admin settings fields
- Subscription, notification, review, and family tracking endpoints

### 3.2 — Fix Test Scripts (P2)
**Why I'm better:** I can read each script, fix import paths, add missing dependencies, create deterministic seed data, and verify they run. The `e2e-pilot-validation.ts` script imports from wrong paths — I can fix all of them.

### 3.3 — Add Root TypeScript References (P0)
**Why I'm better:** The root `tsconfig.json` only references `lib/db`, `lib/api-client-react`, and `lib/api-zod` — which is why `pnpm run typecheck` passes at root while individual packages fail. I can read the current config, add missing references for `artifacts/api-server`, `artifacts/qbuddy`, `artifacts/mockup-sandbox`, and `scripts`, then verify `pnpm run typecheck` covers everything. This is a simple config change that has massive impact on the build.

### 3.4 — Fix Socket.IO Authentication (P2)
**Why I'm better:** I can read the Socket.IO setup in `artifacts/api-server/src/index.ts`, understand the current unauthenticated connection model, add token validation middleware, and fix room membership checks.

---

## TIER 4: Tasks That Need External Services
*These I can set up but cannot fully complete without user-provided credentials.*

### 4.1 — SMS OTP Integration
**What I can do:** Research SMS providers via Gravity Index, install SDK, create integration layer, stop returning OTP in responses, add environment variable configuration.  
**What I need from you:** API credentials from your chosen SMS provider.

### 4.2 — Payment Gateway Integration
**What I can do:** Research payment providers (Razorpay for India), install SDK, create checkout/capture/refund flow, add webhook verification endpoint.  
**What I need from you:** API credentials and webhook secret.

### 4.3 — Object Storage for Photos
**What I can do:** Research storage providers, create upload abstraction layer, generate signed URLs for access control.  
**What I need from you:** Storage bucket credentials.

---

## Tasks I Cannot Do (Or Should Not)
*These require human judgment, physical actions, or external access.*

| Task | Why |
|------|-----|
| Deploy to production | Requires Replit/cloud access and deployment decisions |
| Set up database migrations | Requires DATABASE_URL and production DB access |
| Design new UI screens | Can implement but needs product/design decisions |
| Write legal disclaimers | Needs legal review |
| Negotiate with vendors | Business decision |
| Test on real mobile devices | Needs physical devices |
| Configure CI/CD pipelines | Needs GitHub/Replit CI access |
| Set up monitoring/alerting | Needs external service credentials |

---

## Recommended Execution Order

If you want me to start working through these, here's the optimal sequence:

```
Phase 0 (Build Stabilization) — I do this first
├── 1.5  Fix scripts import paths
├── 1.1  Fix @workspace/db exports  
├── 1.2  Fix frontend TypeScript errors
├── 3.3  Add root tsconfig references
└── Verify: pnpm run typecheck passes

Phase 1 (Auth & Config) — I do this second
├── 1.3  Fix auth token storage flow
├── 1.4  Fix hardcoded API base URL
├── 2.3  Fix admin raw fetch auth
└── Verify: tsc passes, login flow works

Phase 2 (Security) — I do this third
├── 2.1  Secure unprotected endpoints
├── 3.4  Add Socket.IO auth
└── Verify: tsc passes, manual endpoint check

Phase 3 (Contract Alignment) — I do this fourth
├── 3.1  Update OpenAPI spec
├── 2.4  Fix haversineKm export
├── 2.5  Fix booking price bug
└── Verify: tsc passes

Phase 4 (Content & Polish) — I do this fifth
├── 2.2  Content and brand cleanup
├── 3.2  Fix test scripts
└── Verify: no QBuddy references remain

Phase 5 (Integrations) — Needs your credentials
├── 4.1  SMS OTP (needs provider)
├── 4.2  Payments (needs provider)
└── 4.3  Object storage (needs provider)
```

---

## Bottom Line

**I can handle Phases 0–4 entirely on my own** — that's roughly 80% of the work described in the status report. These are all code-level fixes that require reading, searching, editing, and verifying. No general-purpose LLM without tools can do this reliably.

**Phase 5 requires your input** — API credentials, deployment decisions, and vendor choices.

**Total estimated scope:** ~30 discrete code changes across ~50 files, all verifiable with `tsc --noEmit`.
