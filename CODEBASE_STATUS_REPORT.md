# Go LineLess Codebase Status Report

Generated on: 2026-06-08  
Workspace: `/Users/ibnayfield/Downloads/golinelesszip 2`  
Audience: Product manager, founder, engineering lead

## 1. Executive Summary

Go LineLess is a multi-sided offline-assistance platform for the Ahmedabad pilot. The current codebase contains a React/Vite web app, an Express/Socket.IO API server, a shared Drizzle/Postgres data layer, generated API clients, a mockup preview sandbox, and operational scripts.

The product vision is well represented in code: booking, task tracking, runner/comrade workflows, family tracking, queue intelligence, proof photos, OTP completion, runner trust, admin operations, pilot dashboards, recruitment, training, support, incident management, and subscription plans all exist at some level.

However, the current state is not production-ready and not fully pilot-ready. The biggest blockers are build/type errors in the app and API packages, broken user/runner auth token plumbing, outdated OpenAPI/generated clients, unauthenticated sensitive API routes, raw admin fetches without auth headers, and missing production integrations for SMS, payments, photo storage, and operational monitoring.

Recommended starting point: make the workspace build clean, then fix auth/client plumbing, then secure the API ownership model before adding more product features.

## 2. Audit Coverage

I performed a full workspace inventory and full-content read pass for project-owned files.

Audited source/config/doc/asset files:

| Category | Count / Status |
| --- | --- |
| Project-owned files read | 343 files |
| Project-owned size | 3,083,496 bytes |
| Text lines counted | 44,261 lines |
| Main authored area | `artifacts/`, `lib/`, `scripts/`, root configs/docs |
| Third-party dependencies | Accounted for as artifacts, not audited as authored source |
| Build output | Accounted for as generated artifacts |
| Secret files | Metadata reviewed only; values intentionally not repeated |

Excluded from authored-source analysis but accounted for:

| Artifact | Status |
| --- | --- |
| `node_modules/` | Installed third-party dependencies, about 481 MB at root plus package-level links |
| `dist/` folders | Generated build output in API, frontend, and generated libraries |
| `.git/` | Repository metadata |
| `.local/` | Runtime/local state |
| `golineless-source.tar.gz` | Older source snapshot archive; listed, not extracted over current workspace |

Important note: current live files include many new files not present in `golineless-source.tar.gz`, especially operations routes, pricing, family tracking, runner onboarding/playbook, and newer admin pages. The live workspace is the current source of truth.

## 3. Current Product Status

Overall verdict: **feature-rich prototype with major integration and security blockers**.

Pilot readiness:

| Area | Status | Notes |
| --- | --- | --- |
| Product breadth | Strong | Most major user, runner, and admin workflows exist in code. |
| Build health | Blocked | API server, frontend app, and scripts fail direct package TypeScript checks. |
| Auth/session flow | Blocked | User/runner login stores one key while API client and pages expect different keys. |
| Backend security | Blocked | Several task, runner, notification, and incident endpoints expose or mutate data without enough auth/ownership checks. |
| Admin operations | Partial | Many pages exist, but new pages use raw `fetch` without auth headers. |
| API contract | Blocked | OpenAPI/generated clients are behind backend implementation. |
| Payments/SMS/storage | Missing/partial | No real SMS OTP, payment gateway, webhook flow, or durable media storage. |
| Branding/content | Partial | Go LineLess branding is present, but QBuddy/old colors and unsupported claims remain. |
| Testing/CI | Partial | Typecheck exists, test scripts exist, but scripts are not fully wired or passing. |

## 4. Architecture Found

### Root Workspace

The repo is a pnpm workspace with:

- `package.json`: root scripts for `build`, `typecheck`, `typecheck:libs`, `check`; no root `dev` script.
- `pnpm-workspace.yaml`: workspace packages under `artifacts/*`, `lib/*`, `lib/integrations/*`, `scripts`; catalog dependency versions; `minimumReleaseAge: 1440`.
- `tsconfig.json`: only references `lib/db`, `lib/api-client-react`, and `lib/api-zod`. It does not include `artifacts/api-server`, `artifacts/qbuddy`, `artifacts/mockup-sandbox`, or `scripts`.
- `replit.md`: product/brand instructions for Go LineLess, Ahmedabad pilot, navy/gold brand, legal disclaimer, and no fake stats.
- `.replit`: deployment and Replit config, ports 8080/8081/19043, post-merge script.
- `scripts/post-merge.sh`: runs `pnpm install --frozen-lockfile` and `pnpm --filter db push`; this likely targets the wrong package name because the DB package is `@workspace/db`.

### Shared DB Package

Path: `lib/db`

Implemented:

- Postgres pool and Drizzle client in `lib/db/src/index.ts`.
- Schema modules for users, runners, tasks, subscriptions, reviews, locations/admin settings, notifications, recruitments, trainings, quality reviews, support tickets, and incidents.
- Drizzle config requiring `DATABASE_URL`.

Critical issue:

- `lib/db/src/index.ts` exports `db` and `pool`, but not schema tables. The API server imports table names from `@workspace/db`, so the API package fails typecheck. Either `lib/db/src/index.ts` must re-export `./schema`, or API imports must be changed to `@workspace/db/schema`.

### API Server

Path: `artifacts/api-server`

Stack:

- Express 5
- Socket.IO
- Drizzle/Postgres
- pino logging
- multer local uploads
- express-rate-limit

Implemented route groups:

- `health.ts`: health endpoint.
- `auth.ts`: user/runner OTP login, logout, admin login.
- `users.ts`: current user profile/stats.
- `tasks.ts`: booking, list/detail, status updates, accept, cancel, review, proof photo, OTP completion, waiting timer, queue progress, family tracking.
- `runners.ts`: runner profile, online toggle, KYC, onboarding, readiness, active tasks, nearby/available runners, playbook.
- `subscriptions.ts`: subscription plans and user subscriptions.
- `notifications.ts`: notification list/read/read-all.
- `pricing.ts`: backend price preview.
- `admin.ts`: stats, activity, task/runners/users/subscriptions, analytics, map, settings, fraud flags.
- `operations.ts`: recruitment, training, quality, support, incidents, heatmap, pilot dashboards, ops center, founder report, leaderboard, area performance, KPI tracker.

Implemented service engines:

- `dispatch-engine.ts`: smart dispatch waves, distance/trust scoring, notifications.
- `gps-engine.ts`: GPS radius validation, duplicate proof detection, status transition validation.
- `revenue-engine.ts`: pricing/revenue/waiting fee calculations.
- `trust-engine.ts`: trust score and runner metrics.

Main API concerns:

- Several endpoints that should require auth are public or not ownership-scoped.
- Socket.IO events are not authenticated.
- OTP is returned in login response for dev.
- CORS is open by default.
- Uploads are local disk only.
- Some routes use fake/random/fallback coordinates.
- Some dynamic imports expect tables that the DB package does not export.

### Frontend App

Path: `artifacts/qbuddy`

Stack:

- React 19
- Vite
- Tailwind 4
- Wouter
- React Query
- Socket.IO client
- Leaflet
- Recharts
- Framer Motion
- shadcn/Radix-style UI primitives

Implemented public/user pages:

- Landing page and splash.
- User OTP login.
- User home.
- Book task flow.
- My tasks.
- Task detail with map, timeline, proof, queue info, family tracking, review.
- Senior care subscriptions.
- User profile.
- Public family tracking page.

Implemented runner pages:

- Runner OTP login.
- Runner feed and accept flow.
- Runner onboarding.
- Runner active task workflow.
- Proof upload with watermark/GPS attempt.
- Waiting timer.
- Queue update UI.
- OTP completion.
- Earnings.
- Runner profile and KYC upload.
- Playbook.

Implemented admin pages:

- Dashboard.
- Tasks.
- Runners/comrades/KYC.
- Users.
- Subscriptions.
- Analytics.
- Live map.
- Settings.
- Recruitment.
- Training.
- Quality.
- Support.
- Incidents.
- Heatmap.
- Pilot center.
- Operations center.
- Leaderboard.
- Area performance.
- Founder dashboard.
- Incident response.

Main frontend concerns:

- `main.tsx` hardcodes API base URL to `http://localhost:5001`.
- `AuthContext` stores `qbuddy_auth`, but generated fetch auth looks for `qbuddy_admin_token`, `qbuddy_user_token`, and `qbuddy_runner_token`.
- User and runner login do not set the role-specific token keys that many pages and the API client expect.
- Many newer admin pages use raw `fetch("/api/admin/...")` without an `Authorization` header.
- Several React Query generated hook calls use the wrong options shape for the generated client.
- Some pages import `customFetch`, but the package exports `apiFetch`, `setBaseUrl`, `setAuthTokenGetter`, and generated APIs, not `customFetch`.
- Booking display double-subtracts coupon discount: backend price preview already returns final price.
- Landing and senior-care pages include unsupported claims/testimonials that conflict with project notes.
- Old QBuddy strings and purple/orange styles remain.

### API Spec and Generated Clients

Paths:

- `lib/api-spec/openapi.yaml`
- `lib/api-spec/orval.config.ts`
- `lib/api-client-react`
- `lib/api-zod`

Implemented:

- Orval generates React Query client and Zod schemas.
- API client has a fetch wrapper with token getter and localStorage fallback.
- Generated client libraries typecheck cleanly by themselves.

Main issue:

The OpenAPI spec is outdated versus the backend. It misses newer routes and fields including:

- `/pricing/preview`
- upload/proof-photo routes
- waiting timer routes
- queue progress routes
- family tracking routes
- runner onboarding/readiness/playbook/nearby routes
- operations/recruitment/training/quality/support/incidents/pilot/founder/leaderboard/area routes
- newer task statuses like `reached_pickup`, `reached_task_location`, `waiting_started`
- many new task/admin settings fields

Result: frontend developers are mixing generated hooks and raw fetches, causing type errors and auth gaps.

### Mockup Sandbox

Path: `artifacts/mockup-sandbox`

Implemented:

- Vite preview server.
- Plugin discovers `src/components/mockups/**/*.tsx` and writes `src/.generated/mockup-components.ts`.
- Standard UI primitives are duplicated here.

Current status:

- No actual mockup components are currently discovered; generated module is empty.
- Package typecheck passes.

### Scripts

Path: `scripts`

Implemented:

- `seed.ts`: seeds subscription plans.
- `queue-engine-test.ts`: DB-backed queue intelligence test harness.
- `dispatch-stress-test.ts`: creates many tasks and simulates runner assignments.
- `otp-security-test.ts`: tests OTP lockout logic against DB state.
- `e2e-pilot-validation.ts`: checks route existence and pilot workflow readiness.
- `hello.ts`: smoke script.

Main issues:

- Script package does not declare `drizzle-orm` even though scripts import it.
- E2E validation imports API engine files from the wrong relative path.
- Scripts assume seeded test users/runners that are not created by `seed.ts`.
- Scripts are not included in root `tsconfig.json` references.

## 5. Verification Results

Commands run:

| Command | Result |
| --- | --- |
| `pnpm run typecheck` | Failed to start: `pnpm` is not on shell PATH |
| `./node_modules/.bin/tsc -p tsconfig.json --noEmit` | Passed, but root config only checks shared libraries |
| `./node_modules/.bin/tsc -p lib/db/tsconfig.json --noEmit` | Passed |
| `./node_modules/.bin/tsc -p lib/api-client-react/tsconfig.json --noEmit` | Passed |
| `./node_modules/.bin/tsc -p lib/api-zod/tsconfig.json --noEmit` | Passed |
| `./node_modules/.bin/tsc -p artifacts/mockup-sandbox/tsconfig.json --noEmit` | Passed |
| `./node_modules/.bin/tsc -p artifacts/api-server/tsconfig.json --noEmit` | Failed |
| `./node_modules/.bin/tsc -p artifacts/qbuddy/tsconfig.json --noEmit` | Failed |
| `./node_modules/.bin/tsc -p scripts/tsconfig.json --noEmit` | Failed |

API server typecheck blockers:

- `@workspace/db` does not export expected tables like `tasksTable`, `usersTable`, `runnersTable`, `runnerLocationsTable`, `adminSettingsTable`, sessions, reviews, operations tables, etc.
- `tasks.ts` references `runnerLocationsTable` without importing it.
- Dynamic imports expect `reviewsTable` and session tables on the DB package root.
- `trust-engine.ts` has implicit `any` callback parameters.

Frontend typecheck blockers:

- Generated React Query hook options are being passed as `{ query: { refetchInterval } }` but generated types require a complete `UseQueryOptions` shape.
- `useListTasks` is called with `{ params: ... }` where generated signature expects params directly.
- Several pages import or dynamically access `customFetch`, but the package does not export it.
- Some values pass `null` where generated types require `undefined` or `string`.

Scripts typecheck blockers:

- `drizzle-orm` missing from script package resolution.
- E2E script imports `../lib/gps-engine`, `../lib/revenue-engine`, and `../lib/trust-engine`, but those files live under `artifacts/api-server/src/lib`.
- OTP script passes `boolean | null` into a boolean-only assertion.

## 6. Critical Risks and Missing Pieces

### P0: Build and Package Wiring

The current app/API/script packages do not typecheck. This must be fixed before any reliable QA, deployment, or production planning.

Start here:

1. Re-export schemas from `lib/db/src/index.ts` or adjust imports to `@workspace/db/schema`.
2. Add API, frontend, scripts, and mockup package references to root `tsconfig.json` or root typecheck scripts.
3. Fix generated client usage patterns in frontend pages.
4. Export the intended fetch helper from `lib/api-client-react/src/index.ts` or update pages to use the exported helper.
5. Add missing script dependencies and correct script import paths.

### P0: Auth Flow Is Broken for Users and Runners

Current behavior:

- Login stores `{ token, role, user/runner }` in `localStorage["qbuddy_auth"]`.
- Generated fetch wrapper reads `qbuddy_runner_token`, `qbuddy_user_token`, or `qbuddy_admin_token`.
- Many runner/user pages also read role-specific token keys manually.
- User and runner login pages do not set those role-specific keys.

Impact:

- Booking, runner feed, accepting tasks, profile, subscriptions, and generated API calls can fail authorization after login.
- Logout clears `qbuddy_auth` but not all role-specific keys if they are later introduced.

Start here:

- Make one canonical auth storage model.
- Either teach `apiFetch` to read `qbuddy_auth`, or write role-specific keys during login.
- Remove direct `localStorage.getItem("qbuddy_runner_token")`/`qbuddy_user_token` calls from pages.

### P0: API Security and Ownership

High-risk endpoints:

- `GET /api/tasks` can return broad task data without auth if no token is supplied.
- `GET /api/tasks/:id` is public and returns user/runner relations.
- `PATCH /api/tasks/:id/status` is not properly authenticated for sensitive status updates.
- `POST /api/tasks/:id/cancel` is not properly authenticated.
- `GET /api/tasks/:id/timeline` is public.
- `POST /api/tasks/:id/review` does not verify the current user owns the task.
- `PATCH /api/notifications/:id/read` does not verify notification ownership.
- `GET /api/runners/:id` is public and strips only Aadhaar, while other sensitive runner details can still leak.
- `POST /api/admin/incidents` appears under admin path but lacks admin protection.
- Socket.IO accepts raw IDs without socket authentication.

Impact:

- PII exposure.
- Unauthorized task mutation.
- Fake status/proof/queue events.
- Potential admin or incident pollution.

Start here:

- Require user/runner/admin auth consistently.
- Apply ownership checks per task, notification, review, and family tracking token.
- Redact runner/user sensitive fields by default.
- Authenticate Socket.IO and validate room membership.

### P0: Production API Base URL

`artifacts/qbuddy/src/main.tsx` hardcodes:

```ts
setBaseUrl("http://localhost:5001");
```

Impact:

- Deployed frontend will call a developer machine URL instead of production API.
- Vite proxy `/api` is bypassed by generated clients.

Start here:

- Use environment-based base URL.
- In same-origin deployments, use `/api`.
- Keep local dev override in `.env` only.

### P1: OpenAPI and Client Drift

The backend has advanced beyond the OpenAPI spec. New routes are manually fetched from UI pages, causing inconsistent auth and type safety.

Start here:

- Update `lib/api-spec/openapi.yaml` to match the current backend.
- Regenerate `lib/api-client-react` and `lib/api-zod`.
- Remove raw admin/user/runner fetches where generated hooks can be used.
- Add missing enums/fields for task status, queue, waiting, proof, family tracking, runner onboarding, operations, and admin settings.

### P1: Payments, SMS, Media, and External Integrations

Missing or dev-only:

- OTP is returned to the client response; no real SMS integration is active.
- No payment gateway checkout, capture, refund, or webhook verification.
- Subscriptions are local DB records only.
- Proof/KYC photos are base64/local disk; no durable object storage, virus scanning, lifecycle, or access-control model.
- Map marker assets and tiles rely on external URLs.

Start here:

- Add SMS provider integration and stop returning OTP outside dev.
- Add payment provider with webhook-based payment status.
- Move photos to secure object storage.
- Add signed URLs or protected media access.

### P1: Dispatch and GPS Accuracy

Implemented:

- Dispatch engine supports waves and scoring.
- Runner GPS updates via Socket.IO.
- GPS proof validation exists.

Gaps:

- Booking flow does not capture actual lat/lng, so dispatch often cannot do real distance matching.
- Nearby runner endpoint tries to use `haversineKm` from dispatch engine, but that function is not exported.
- Some map/location routes use random/fallback Ahmedabad coordinates.
- Proof GPS validation allows success when task coordinates are missing.

Start here:

- Capture task geolocation at booking.
- Export or centralize geo helpers.
- Remove fake/random location fallbacks from operational views.
- Treat missing task GPS as partial verification, not fully valid proof.

### P1: Admin Operations Auth

Newer admin pages use raw `fetch` without `Authorization`.

Affected examples:

- Dashboard widgets for SLA, daily ops, fraud flags.
- Recruitment.
- Training.
- Quality.
- Support.
- Incidents.
- Heatmap.
- Pilot center.
- Operations center.
- Leaderboard.
- Area performance.
- Founder dashboard.
- Incident response.

Impact:

- If backend auth is enforced, these pages fail.
- If backend auth is not enforced, sensitive operations data is exposed.

Start here:

- Create one authenticated admin fetch helper.
- Replace all raw admin fetches.
- Add generated client coverage for all admin/ops endpoints.

### P1: Content, Brand, and Claims Cleanup

Project notes require:

- Go LineLess brand.
- "Life Without Waiting".
- Ahmedabad pilot wording.
- No fake stats.
- Required disclaimer.

Current issues:

- Some pages still use QBuddy names/keys/old color palette.
- Landing and senior care pages contain named testimonials and broad trust claims.
- Runner earning claims like "Earn Rs 500-1,500 Daily" or similar need evidence or removal.
- Some admin/default settings still include legacy names.

Start here:

- Sweep strings for `QBuddy`, unsupported testimonials, unsupported stats, and outdated colors.
- Keep all public claims pilot-safe and evidence-backed.
- Ensure disclaimer appears where booking/legal expectation is created.

### P2: Testing and CI

Current:

- TypeScript checks exist.
- Some DB-backed validation scripts exist.
- No test runner, no CI config, no reliable seed for all script assumptions.

Gaps:

- Root typecheck does not include app/API/scripts.
- No endpoint integration tests.
- No ownership/security regression tests.
- No payment/SMS/storage test mocks.
- No browser E2E for booking, runner accept, OTP completion, admin review.

Start here:

- Fix root typecheck coverage.
- Add a deterministic seed for test users/runners/tasks.
- Convert scripts into repeatable tests or CI smoke checks.
- Add Playwright E2E for critical pilot workflow.

## 7. What Is Done

### Product and UX

Done or mostly done:

- Brand shell for Go LineLess exists across key pages.
- Public landing page exists.
- User and runner OTP login screens exist.
- User dashboard exists.
- Booking flow is rich and multi-step.
- Task list/detail pages exist.
- Public family tracking link exists.
- Runner task feed exists.
- Runner active task workflow exists.
- Runner onboarding/KYC/profile/earnings/playbook exist.
- Admin console is broad and operationally ambitious.
- Senior care subscriptions UI exists.

Partial:

- Auth integration blocks many flows.
- Pricing UI and backend disagree on coupon handling.
- Backend and generated API client disagree.
- Some admin pages are display-only or depend on unauthed raw fetches.
- Branding/content still needs cleanup.

### Backend

Done or mostly done:

- Express API is structured by route.
- DB schema is broad and supports the desired domain.
- Dispatch, GPS, revenue, and trust engines exist.
- Socket.IO event model exists.
- Admin operations endpoints exist.
- Family tracking token endpoint exists.
- Queue and waiting timer backend support exists.

Partial:

- Route authorization/ownership is inconsistent.
- Transaction/race protection is limited.
- Production integrations are missing.
- DB package exports are miswired.
- API docs/spec are incomplete.

### Data Model

Done:

- Users and sessions.
- Runners and runner sessions.
- Tasks with queue, waiting, proof, OTP, GPS, pricing, fraud, and family tracking fields.
- Subscription plans/subscriptions.
- Reviews and quality reviews.
- Notifications.
- Runner locations and admin settings.
- Recruitment, training, support tickets, and incidents.

Partial:

- Some settings default to legacy names.
- Schema is ahead of generated API spec.
- Migration/deployment flow needs verification.

## 8. Recommended Roadmap

### Phase 0: Stabilize the Build

Goal: every package typechecks from one root command.

Tasks:

- Add schema exports from `@workspace/db`.
- Fix missing `runnerLocationsTable` import and `haversineKm` export/import.
- Fix frontend generated-hook call signatures.
- Fix `customFetch` export/import mismatch.
- Fix script dependencies/import paths.
- Update root `tsconfig.json` references.
- Fix `pnpm` availability or document exact setup.

Exit criteria:

- `pnpm run typecheck` works.
- Direct package checks all pass.
- Build commands complete for API and frontend.

### Phase 1: Fix Auth and API Base URL

Goal: logged-in user, runner, and admin can use all expected pages.

Tasks:

- Standardize localStorage/session model.
- Use one API fetch helper for all authenticated calls.
- Remove `localhost:5001` hardcoding.
- Add auth headers to all admin raw fetches or replace with generated hooks.

Exit criteria:

- User can login, book, view task, share family tracking.
- Runner can login, go online, accept task, update status, upload proof, complete OTP.
- Admin can login and all admin pages load protected data.

### Phase 2: Secure Backend Ownership

Goal: no unauthorized task/user/runner/admin data access.

Tasks:

- Lock down task list/detail/timeline/status/cancel/review.
- Add notification ownership checks.
- Redact runner public detail.
- Protect incident creation and all admin operations.
- Authenticate sockets.
- Add security regression tests.

Exit criteria:

- User sees only own tasks.
- Runner sees only assigned/available tasks allowed by dispatch.
- Admin routes require admin token.
- Public family tracking only exposes intentionally limited read-only data.

### Phase 3: Align API Contract

Goal: frontend uses generated clients for all backend routes.

Tasks:

- Update OpenAPI spec.
- Regenerate React Query and Zod clients.
- Remove manual endpoint duplication.
- Add enum and schema coverage for all current task/admin/ops fields.

Exit criteria:

- No raw admin fetches except through a shared wrapper.
- No generated-client TypeScript errors.
- API documentation reflects current product.

### Phase 4: Production Integrations

Goal: real pilot operations can run safely.

Tasks:

- SMS OTP provider.
- Payment gateway and webhook verification.
- Object storage for proof/KYC photos.
- Secrets management and rotation.
- Observability, logs, alerts.
- Backup and migration process.

Exit criteria:

- No OTP returned to client in production.
- Payment state is backend-verified.
- Proof/KYC media is securely stored and access-controlled.
- Ops has logs/alerts for failed dispatch, auth errors, and payment errors.

### Phase 5: Pilot Polish and Content Compliance

Goal: public-facing app matches Go LineLess pilot promise.

Tasks:

- Remove QBuddy naming and old palette leftovers.
- Remove unsupported testimonials/stats/earning claims.
- Apply required disclaimer consistently.
- Tighten admin navigation and mobile layout.
- Replace fake/random operational data.

Exit criteria:

- Public pages are pilot-safe.
- No fake social proof.
- No legacy naming in visible UI.
- Admin data reflects real DB state only.

## 9. File Inventory and Status Appendix

### Root Files

| File | Status |
| --- | --- |
| `.agents/agent_assets_metadata.toml` | Asset metadata present. |
| `.DS_Store`, `artifacts/.DS_Store`, package `.DS_Store` files | Local macOS artifacts; should not be committed. |
| `.env`, `artifacts/api-server/.env`, `artifacts/qbuddy/.env` | Local env files exist; contain secret-like local values and must not be committed. Rotate before production. |
| `.env.example` | Env template present. |
| `.gitattributes`, `.gitignore`, `.npmrc` | Repo config present. |
| `.replit`, `.replitignore`, `replit.nix`, `replit.md` | Replit/product docs present. |
| `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` | Workspace config present. |
| `tsconfig.base.json`, `tsconfig.json` | Root TS config present but incomplete coverage. |
| `golineless-source.tar.gz` | Older source archive artifact; current live workspace has newer files. |

### API Server Files

| Path | Status |
| --- | --- |
| `artifacts/api-server/package.json` | API package config present. |
| `artifacts/api-server/build.mjs` | esbuild bundle script present. |
| `artifacts/api-server/tsconfig.json` | Package TS config present; direct typecheck fails. |
| `artifacts/api-server/src/app.ts` | Express app, middleware, rate limits, uploads. |
| `artifacts/api-server/src/index.ts` | HTTP/Socket.IO server and realtime events. |
| `artifacts/api-server/src/lib/auth.ts` | Session/admin auth helpers; blocked by DB export issue. |
| `artifacts/api-server/src/lib/logger.ts` | pino logger. |
| `artifacts/api-server/src/lib/dispatch-engine.ts` | Smart dispatch engine; helper export issue for nearby route. |
| `artifacts/api-server/src/lib/gps-engine.ts` | GPS/proof/transition helper. |
| `artifacts/api-server/src/lib/revenue-engine.ts` | Revenue/waiting/priority pricing helper. |
| `artifacts/api-server/src/lib/trust-engine.ts` | Runner trust scoring; minor implicit any errors. |
| `artifacts/api-server/src/routes/*.ts` | Main route modules; broad implementation, security and type blockers remain. |
| `.replit-artifact/artifact.toml`, `.tsbuildinfo`, `dist/` | Generated/build metadata. |

### Frontend Product Files

| Path | Status |
| --- | --- |
| `artifacts/qbuddy/package.json` | Frontend package config. |
| `artifacts/qbuddy/vite.config.ts` | Vite config; requires `PORT` and `BASE_PATH`, proxies `/api` in dev. |
| `artifacts/qbuddy/src/main.tsx` | App bootstrap; hardcoded API URL blocker. |
| `artifacts/qbuddy/src/App.tsx` | Route map for public, user, runner, admin surfaces. |
| `artifacts/qbuddy/src/contexts/AuthContext.tsx` | Auth context; token storage mismatch blocker. |
| `artifacts/qbuddy/src/lib/utils.ts` | Category/pricing/status helpers and watermark utility. |
| `artifacts/qbuddy/src/components/*.tsx` | Shared app navigation/category/admin components. |
| `artifacts/qbuddy/src/pages/landing/Landing.tsx` | Public marketing page; content claims need cleanup. |
| `artifacts/qbuddy/src/pages/auth/*.tsx` | User/runner login pages; do not set role-specific token keys. |
| `artifacts/qbuddy/src/pages/app/*.tsx` | User app pages; booking/detail/family tracking implemented, auth/pricing issues remain. |
| `artifacts/qbuddy/src/pages/runner/*.tsx` | Runner app pages; workflow implemented, auth token usage broken. |
| `artifacts/qbuddy/src/pages/admin/*.tsx` | Admin/ops pages; many raw fetch auth gaps. |
| `artifacts/qbuddy/src/components/ui/*.tsx` | Standard UI primitives; duplicated/generated-style component library. |
| `artifacts/qbuddy/public/*` | Logo, favicon, OG image, robots. |
| `.replit-artifact`, `.tsbuildinfo`, `dist/` | Generated/build metadata. |

### Shared Libraries

| Path | Status |
| --- | --- |
| `lib/db/src/schema/*.ts` | Broad DB schema implemented. |
| `lib/db/src/index.ts` | DB client only; needs schema re-exports or import strategy change. |
| `lib/api-spec/openapi.yaml` | Outdated API spec. |
| `lib/api-spec/orval.config.ts` | Codegen config present. |
| `lib/api-client-react/src/custom-fetch.ts` | Robust fetch wrapper exists but export/name mismatch with pages. |
| `lib/api-client-react/src/generated/*` | Generated client present; library typechecks. |
| `lib/api-zod/src/generated/*` | Generated Zod validators/types present; library typechecks. |

### Scripts and Sandbox

| Path | Status |
| --- | --- |
| `scripts/src/seed.ts` | Seeds subscription plans only. |
| `scripts/src/*test.ts` | Useful test harnesses, but typecheck/dependency/path issues remain. |
| `artifacts/mockup-sandbox/*` | Preview tooling; typechecks; no mockups currently discovered. |
| `artifacts/mockup-sandbox/src/components/ui/*.tsx` | Duplicated UI primitive set for sandbox. |

## 10. Immediate Start Checklist

Use this as the first engineering sprint:

1. Fix `@workspace/db` exports and API imports.
2. Add all packages to root typecheck/build coverage.
3. Fix frontend generated client usage and `customFetch` export mismatch.
4. Standardize auth token storage and update all fetches.
5. Remove hardcoded API base URL.
6. Protect public task/runner/notification/admin endpoints.
7. Update OpenAPI and regenerate clients.
8. Remove unsupported public claims and legacy QBuddy UI strings.
9. Wire deterministic seed/test data.
10. Add a minimal E2E path: login, book task, runner accepts, proof upload, OTP complete, admin sees it.

## 11. Bottom Line

The codebase shows substantial implementation effort and a clear product direction. It is more than a mockup: there is a real backend, schema, app UI, operations console, and domain logic.

The missing work is not mainly "more screens." The missing work is integration hardening: build consistency, auth consistency, API contract consistency, secure ownership, real integrations, and pilot-safe content. Fixing those first will turn this from an impressive prototype into a controllable Ahmedabad pilot system.
