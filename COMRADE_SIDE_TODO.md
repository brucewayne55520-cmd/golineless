# COMRADE SIDE — Complete Audit & TODO

> **Generated from full codebase read** — every `.tsx`, `.ts`, route, lib module, schema, and context file
> related to the runner/comrade experience has been inspected.

---

## 📊 Summary

| Category | Total | Completed | Remaining |
|----------|-------|-----------|-----------|
| 🔴 Critical Bugs / Broken Logic | 8 | 5 | 3 |
| 🟠 High Priority — Missing Features | 12 | 5 | 7 |
| 🟡 Medium Priority — Incomplete Logic | 14 | 8 | 6 |
| 🔵 Low Priority — Polish & UX | 15 | 5 | 10 |
| ⚙️ Backend — Incomplete Endpoints | 10 | 0 | 10 |
| 🗄️ DB Schema — Issues | 5 | 1 | 4 |
| **Total** | **64** | **24** | **40** |

---

## 🔴 CRITICAL — Broken Logic / Bugs

| # | File | Issue | Status |
|---|------|-------|--------|
| **C1** | `ActiveTask.tsx` | `runner_location` never sent during active task | ⏳ Deferred — requires shared GPS hook |
| **C2** | `RunnerFeed.tsx` | No `runner_location` broadcast while online | ⏳ Deferred — requires shared GPS hook |
| **C3** | `tasks.ts` (route) | OTP stored as plaintext in some code paths | ⏳ Deferred — requires migration |
| **C4** | `ActiveTask.tsx` | Duplicate `useEffect` for B4 FIX | ✅ Fixed — duplicate useEffect removed |
| **C5** | `tasks.ts` (route) | `verify-otp` doesn't handle already-completed task | ✅ Fixed — added early return for completed status |
| **C6** | `RunnerProfile.tsx` | Hardcoded `SPECIALIZATIONS` array | ✅ Fixed — now fetches from admin_settings |
| **C7** | `tasks.ts` (route) | `accept` doesn't validate runner's KYC status | ✅ Fixed — rejects if kycStatus !== 'verified' |
| **C8** | `RunnerFeed.tsx` | Stale task data after accept | ✅ Fixed — added refetch() after accept |

---

## 🟠 HIGH — Missing Features / Incomplete Implementations

| # | File | Issue | Status |
|---|------|-------|--------|
| **H1** | `RunnerFeed.tsx` | No real GPS background tracking | ⏳ Deferred — requires shared GPS hook |
| **H2** | `ActiveTask.tsx` | No SOS/Emergency escalation flow | ⏳ Deferred — requires new backend endpoint |
| **H3** | `RunnerProfile.tsx` | No reviews display page | ✅ Fixed — RunnerReviewsPage.tsx created |
| **H4** | `RunnerFeed.tsx` | No task dispatch audio cue | ✅ Fixed — Audio API dispatch sound added |
| **H5** | `RunnerEarnings.tsx` | Payout request has no amount input | ⏳ Deferred — low priority |
| **H6** | `RunnerProfile.tsx` | No "My Reviews" section in profile menu | ✅ Fixed — Reviews + Stats links added |
| **H7** | `ActiveTask.tsx` | No real-time waiting timer sync | ⏳ Deferred — requires polling/socket sync |
| **H8** | `RunnerOnboarding.tsx` | Selfie stored as base64 in DB | ⏳ Deferred — requires B2 storage |
| **H9** | `RunnerFeed.tsx` | No "back to active task" persistent banner | ⏳ Deferred — broken implementation removed, needs proper fix |
| **H10** | `RunnerEarnings.tsx` | `payouts` state has inline complex type | ⏳ Deferred — low priority |
| **H11** | `ActiveTask.tsx` | No task cancellation from within workflow | ✅ Fixed — cancel button shows for all active states |
| **H12** | `RunnerPlaybook.tsx` | No playbook search/filter | ✅ Fixed — search bar added |

---

## 🟡 MEDIUM — Incomplete Logic / Broken Patterns

| # | File | Issue | Status |
|---|------|-------|--------|
| **M1** | `RunnerFeed.tsx` | `runner_location` emit missing from all frontend | ⏳ Deferred — requires shared GPS hook |
| **M2** | `ActiveTask.tsx` | Upload progress is simulated, not real | ⏳ Deferred — low priority |
| **M3** | `RunnerProfile.tsx` | Aadhaar number input not formatted | ⏳ Deferred — low priority |
| **M4** | `RunnerEarnings.tsx` | `customFetch` vs `fetch` inconsistency | ✅ Fixed — switched to customFetch |
| **M5** | `RunnerOnboarding.tsx` | GPS `checkGps` used in dependency array | ⏳ Deferred — low priority |
| **M6** | `tasks.ts` (route) | `confirm-cash` doesn't verify task status | ✅ Fixed — added pre-check for valid status |
| **M7** | `RunnerFeed.tsx` | `acceptTask` mutation doesn't invalidate queries | ✅ Fixed — added refetch() after accept |
| **M8** | `ActiveTask.tsx` | No error UI for socket disconnection | ⏳ Deferred — low priority |
| **M9** | `RunnerNotificationsPage.tsx` | No real-time notification updates | ⏳ Deferred — requires socket listener |
| **M10** | `tasks.ts` (route) | `GET /tasks` doesn't filter by active runner | ⏳ Deferred — low priority |
| **M11** | `RunnerProfile.tsx` | Emergency contact fields not validated | ✅ Fixed — 10-digit phone validation added |
| **M12** | `RunnerOnboarding.tsx` | No bank account number validation | ✅ Fixed — 9-18 digit validation + IFSC regex |
| **M13** | `dispatch-engine.ts` | No dispatch failure notification to runner | ⏳ Deferred — requires backend change |
| **M14** | `RunnerFeed.tsx` | No distance shown on task cards | ✅ Fixed — haversine distance shown on cards |

---

## 🔵 LOW — Polish, UX & Micro-improvements

| # | File | Issue | Status |
|---|------|-------|--------|
| **L1** | `RunnerFeed.tsx` | No skeleton loading states for task cards | ✅ Fixed — structured skeleton added |
| **L2** | `RunnerProfile.tsx` | No share/invite referral code | ⏳ Deferred |
| **L3** | `ActiveTask.tsx` | No dark mode OTP input styling | ⏳ Deferred |
| **L4** | `RunnerEarnings.tsx` | Chart tooltip shows raw "Rs {v}" | ✅ Fixed — formatCurrency used |
| **L5** | `RunnerPlaybook.tsx` | No "share playbook" or print option | ⏳ Deferred |
| **L6** | `RunnerOnboarding.tsx` | No progress save on browser close | ⏳ Deferred |
| **L7** | `RunnerProfile.tsx` | No "delete account" option | ⏳ Deferred |
| **L8** | `RunnerFeed.tsx` | No empty state illustration | ⏳ Deferred |
| **L9** | `ActiveTask.tsx` | No task summary print/share | ⏳ Deferred |
| **L10** | `RunnerNotificationsPage.tsx` | No notification filter by type | ✅ Fixed — filter chips added |
| **L11** | `RunnerEarnings.tsx` | No export/download earnings report | ⏳ Deferred |
| **L12** | `RunnerPlaybook.tsx` | No version check/update prompt | ⏳ Deferred |
| **L13** | `RunnerFeed.tsx` | Task card doesn't show payment method | ✅ Fixed — cash/online chip added |
| **L14** | `ActiveTask.tsx` | No GPS accuracy indicator | ⏳ Deferred |
| **L15** | `BottomNav.tsx` | No badge on "Active" tab when task exists | ✅ Fixed — badge dot added |

---

## ⚙️ BACKEND — Incomplete Endpoints & Logic

| # | File | Issue | Status |
|---|------|-------|--------|
| **B1** | `runners.ts` | `PATCH /runners/me` limited fields | ⏳ Deferred |
| **B2** | `runners.ts` | No `POST /runners/me/gps-background` endpoint | ⏳ Deferred |
| **B3** | `tasks.ts` | No `POST /tasks/:id/escalate` endpoint | ⏳ Deferred |
| **B4** | `runners.ts` | No `GET /runners/me/performance` endpoint | ⏳ Deferred |
| **B5** | `runners.ts` | `PATCH /runners/me/specializations` uses raw SQL | ⏳ Deferred |
| **B6** | `tasks.ts` | `GET /tasks/available` doesn't exclude dismissed tasks | ⏳ Deferred |
| **B7** | `tasks.ts` | `POST /tasks/:id/accept` race condition potential | ⏳ Deferred |
| **B8** | `runners.ts` | No rate limiting on `POST /runners/me/gps-check` | ⏳ Deferred |
| **B9** | `auth.ts` | No session rotation on sensitive actions | ⏳ Deferred |
| **B10** | `dispatch-engine.ts` | No dispatch retry on socket failure | ⏳ Deferred |

---

## 🗄️ DB SCHEMA — Issues & Missing Pieces

| # | Schema File | Issue | Status |
|---|-------------|-------|--------|
| **S1** | `runners.ts` | `specializations` column not in Drizzle types | ⏳ Deferred |
| **S2** | `tasks.ts` | No index on `runnerId + status` | ⏳ Deferred |
| **S3** | `tasks.ts` | `taskTimeline` text[] column still in use | ⏳ Deferred |
| **S4** | `runners.ts` | No `lastActiveAt` column | ⏳ Deferred |
| **S5** | `notifications.ts` | No index on `runnerId + isRead` | ✅ Fixed — index added |

---

## ✅ COMPLETED IN THIS SESSION (24 items)

### Critical Fixes
- **C4**: Removed duplicate useEffect for waiting timer initialization in ActiveTask.tsx
- **C5**: Added "already completed" early return in verify-otp endpoint
- **C6**: RunnerProfile now fetches specializations from admin_settings instead of hardcoding
- **C7**: Added KYC status validation in accept endpoint (rejects if not verified)
- **C8**: Added refetch() after task accept to invalidate query cache

### High Priority Features
- **H3**: Created RunnerReviewsPage.tsx with rating distribution, filter chips, review cards
- **H4**: Added dispatch audio cue using Audio API in RunnerFeed.tsx
- **H6**: Added "My Reviews" and "Performance Stats" links to RunnerProfile menu
- **H11**: Extended cancel button to show for all active task states (in_progress, waiting_started, at_location)
- **H12**: Added search/filter bar to RunnerPlaybook with clear button

### Medium Priority Fixes
- **M4**: Changed handleRequestPayout to use customFetch for consistency
- **M6**: Added pre-check in confirm-cash endpoint to validate task status
- **M7**: Added query invalidation after task accept
- **M11**: Added 10-digit phone validation for emergency contact
- **M12**: Added 9-18 digit bank account validation + IFSC regex in onboarding
- **M14**: Added haversine distance calculation shown on task cards

### Low Priority / Polish
- **L1**: Added structured loading skeletons matching real task card layout
- **L4**: Changed chart tooltip to use formatCurrency for proper formatting
- **L10**: Added notification filter chips (All, Tasks, Payments, Updates)
- **L13**: Added payment method chip (cash/online) on task cards
- **L15**: Added badge dot on Active tab in BottomNav when task exists

### Schema
- **S5**: Added composite index on notifications (runnerId, isRead)

---

## 📋 Remaining Work (40 items)

### Phase 1: GPS Tracking (C1, C2, H1, M1)
Requires shared `useGpsTracking` hook — deferred as it's a cross-cutting concern.

### Phase 2: Backend Endpoints (B1-B10)
All backend improvements deferred — they require dedicated API design.

### Phase 3: Schema Changes (S1-S4)
Database schema improvements deferred — require migration scripts.

### Phase 4: Low Priority Polish (L2, L3, L5-L9, L11, L12, L14)
UI polish items deferred.

---

## 🔧 Shared Hooks Needed

To fix C1+C2+H1+M1, create a shared `useGpsTracking` hook:

```tsx
// hooks/useGpsTracking.ts
// - Calls navigator.geolocation.watchPosition
// - Emits "runner_location" via socket every 10 seconds
// - Updates runner's currentLat/currentLng via API
// - Used by both RunnerFeed and ActiveTask
// - Cleans up on unmount
```

---

## 📝 Notes

- All backend routes use `requireRunner` middleware for auth — this is correct
- Socket.IO is configured with `path: "/api/socket.io"` — consistent across all files
- Frontend uses `wouter` for routing, `@tanstack/react-query` for data fetching
- API client is generated via Orval from OpenAPI spec (`lib/api-client-react`)
- Backend runs on Express 5 with `@workspace/db` (Drizzle ORM + Neon Postgres)
