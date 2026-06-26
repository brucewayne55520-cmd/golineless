# COMRADE SIDE — Complete Audit & TODO

> **Generated from full codebase read** — every `.tsx`, `.ts`, route, lib module, schema, and context file
> related to the runner/comrade experience has been inspected.

---

## 📊 Summary

| Category | Total | Completed | Remaining |
|----------|-------|-----------|-----------|
| 🔴 Critical Bugs / Broken Logic | 8 | 8 | 0 |
| 🟠 High Priority — Missing Features | 12 | 12 | 0 |
| 🟡 Medium Priority — Incomplete Logic | 14 | 14 | 0 |
| 🔵 Low Priority — Polish & UX | 15 | 15 | 0 |
| ⚙️ Backend — Incomplete Endpoints | 10 | 10 | 0 |
| 🗄️ DB Schema — Issues | 5 | 5 | 0 |
| **Total** | **64** | **64** | **0** |

---

## ✅ ALL 64 ITEMS COMPLETED

---

### Critical Fixes (8/8)
- **C1+C2+H1+M1**: Created shared `useGpsTracking` hook — emits runner_location via socket every 10s + updates API. Wired into both ActiveTask and RunnerFeed.
- **C3**: SHA-256 OTP hashing in task creation + verification
- **C4**: Removed duplicate useEffect for waiting timer
- **C5**: Early return for already-completed tasks in verify-otp
- **C6**: Specializations fetched from admin_settings
- **C7**: KYC status validation on accept
- **C8**: Query invalidation after task accept

### High Priority Features (12/12)
- **H2**: SOS/Emergency escalation endpoint (POST /tasks/:id/escalate) with severity validation, fraud flags, timeline events, and admin notifications
- **H3**: RunnerReviewsPage.tsx with rating distribution, filter chips, review cards
- **H4**: Dispatch audio cue using Audio API
- **H5**: Payout request with custom amount input
- **H6**: My Reviews + Performance Stats links in profile menu
- **H7**: Waiting timer re-sync from server every 30s
- **H8**: Selfie upload via uploadDataUrl (B2 cloud storage)
- **H9**: Active task banner in RunnerFeed (conditional on isOnline)
- **H10**: Typed payout state in RunnerEarnings
- **H11**: Cancel button for all active task states
- **H12**: Search/filter bar in RunnerPlaybook

### Medium Priority Fixes (14/14)
- **M2**: Photo upload progress overlay with percentage bar
- **M3**: Aadhaar formatting as XXXX XXXX XXXX
- **M4**: customFetch consistency in RunnerEarnings
- **M5**: GPS dependency array fix in RunnerOnboarding
- **M6**: confirm-cash status pre-check
- **M7**: Query invalidation after task accept
- **M8**: Socket disconnect amber banner with WifiOff icon
- **M9**: Real-time notification updates via socket (useNotificationSocket hook joins runner room, auto-refetches on events)
- **M10**: GET /tasks filters by runnerId
- **M11**: 10-digit phone validation for emergency contact
- **M12**: 9-18 digit bank account + IFSC validation
- **M13**: Dispatch failure notification to user when max radius reached with 0 comrades (dispatch-engine.ts)
- **M14**: Haversine distance on task cards

### Low Priority / Polish (15/15)
- **L1**: Structured loading skeletons
- **L2**: Share playbook via Web Share API (RunnerPlaybook.tsx)
- **L3**: Dark theme OTP styling
- **L4**: formatCurrency in chart tooltip
- **L5**: Share Playbook button with Web Share API + clipboard fallback
- **L6**: sessionStorage save/restore for in-progress task state
- **L7**: Delete account with password confirmation (soft-delete)
- **L8**: EmptyState component for no-tasks
- **L9**: Share Task Summary button on completed tasks via Web Share API
- **L10**: Notification filter chips
- **L11**: CSV earnings report export
- **L12**: Version check/update prompt (polls /api/health for etag + buildTime, shows floating Update banner)
- **L13**: Payment method chip on task cards
- **L14**: GPS accuracy indicator (> 50m warning)
- **L15**: Badge dot on Active tab in BottomNav

### Backend (10/10)
- **B1**: Extended PATCH /runners/me with bank, emergency, gender, fullName fields
- **B2**: POST /runners/me/gps-background endpoint
- **B3**: POST /tasks/:id/escalate endpoint with severity validation (whitelist: low/medium/high)
- **B4**: GET /runners/me/stats endpoint (covered by existing)
- **B5**: Drizzle update for specializations (no more raw SQL)
- **B6**: GET /tasks/available excludes dismissed tasks via fraudFlags runner_dismissed filter
- **B7**: Atomic accept with WHERE status='pending' + active task check
- **B8**: Rate limiting on gps-check + gps-background using getRateLimit helper
- **B9**: POST /auth/rotate-session — invalidates all other sessions, generates new token, sets httpOnly cookie
- **B10**: Dispatch socket emit wrapped in try/catch — DB notifications always persist as fallback

### Schema (5/5)
- **S1**: specializations in Drizzle types
- **S2**: Compound index runnerStatusIdx
- **S3**: taskTimeline reads from normalized taskTimelineEventsTable (dual-write complete)
- **S4**: lastActiveAt timestamp column on runners
- **S5**: Composite index on notifications

---

## 🔧 New Files Created

- `artifacts/qbuddy/src/hooks/useGpsTracking.ts` — Shared GPS tracking hook (C1+C2+H1+M1+B2)
- `artifacts/qbuddy/src/hooks/useNotificationSocket.ts` — Real-time notification updates via socket (M9)

---

## 📝 Notes

- All backend routes use `requireRunner` middleware for auth
- Socket.IO configured with `path: "/api/socket.io"` — consistent across all files
- Frontend uses `wouter` for routing, `@tanstack/react-query` for data fetching
- API client generated via Orval from OpenAPI spec (`lib/api-client-react`)
- Backend runs on Express 5 with `@workspace/db` (Drizzle ORM + Neon Postgres)
- GPS tracking is centralized in a single shared hook, used by both ActiveTask and RunnerFeed
- Notification socket accepts runnerId as parameter, joins comrade_{id} room on connect
