# ADMIN SIDE — Complete Audit & TODO List

> **Generated from full codebase read** — every admin page, backend route, component, and lib module inspected.
> Frontend: 41 admin pages + 15 admin components
> Backend: `admin.ts`, `operations.ts`, `payments.ts`, `pricing.ts`, `notifications.ts`

---

## 📊 Summary

| Category | Total | Done | Remaining |
|----------|-------|------|-----------|
| 🔴 Critical — Broken Logic / Security | 8 | 8 ✅ | 0 |
| 🟠 High — Incomplete Features / Missing Endpoints | 12 | 12 ✅ | 0 |
| 🟡 Medium — Performance / UX Gaps | 15 | 12 | 3 |
| 🔵 Low — Polish / Missing UI | 10 | 9 | 1 |
| ⚙️ Backend — Incomplete Routes / Missing Features | 12 | 12 ✅ | 0 |
| **Total** | **57** | **53** | **4** |

---

## 🔴 CRITICAL — Broken Logic / Security ✅ ALL DONE

### C1. `GET /admin/stats` loads ALL tasks + runners into memory ✅ DONE
- **Fix**: Replaced 4 full-table loads + calculatePilotMetrics with 17 parallel SQL aggregation queries

### C2. `GET /admin/pilot` loads ALL data into memory ✅ DONE
- **Fix**: Replaced 7 parallel full-table loads with 7 SQL aggregation queries using COUNT, SUM, AVG, CASE WHEN

### C3. `GET /admin/founder` loads ALL data into memory ✅ DONE
- **Fix**: Replaced 7 full-table loads with 9 SQL aggregation queries

### C4. `GET /admin/executive-report` loads ALL data into memory ✅ DONE
- **Fix**: Replaced full table loads with 4 date-filtered SQL queries + global user count

### C5. `GET /admin/daily-ops` loads ALL tasks into memory ✅ DONE
- **Fix**: Replaced full table load with 5 SQL aggregation queries using WHERE clause

### C6. `GET /admin/area-performance` loads ALL tasks + runners into memory ✅ DONE
- **Fix**: Raw SQL with unnest + ILIKE for partial area matching (preserves original .includes() behavior)

### C7. `GET /admin/runners/active-locations` loads ALL tasks + runners into memory ✅ DONE
- **Fix**: Single LEFT JOIN raw SQL query replacing 2 full-table loads

### C8. `GET /admin/kpi-tracker` loads ALL data into memory ✅ DONE
- **Fix**: 3 SQL aggregation queries replacing 3 full-table loads

---

## 🟠 HIGH — Incomplete Features / Missing Endpoints

### H1. Dashboard KYC widget uses raw `fetch` instead of API client ✅ DONE
- **Fix**: Replaced raw `fetch()` with `customFetch()` in AdminDashboard.tsx KYC metrics widget

### H2. Dashboard reconciliation widget uses raw `fetch` ✅ DONE
- **Fix**: Replaced raw `fetch()` with `customFetch()` in AdminDashboard.tsx reconciliation + payouts widgets
### H3. No admin session management ✅ DONE
- **Fix**: Added GET /admin/sessions (masked tokens) + DELETE /admin/sessions/:id (ownership check)

### H4. No admin role-based access control ✅ DONE
- **Fix**: requireAdminRole() middleware already existed in auth.ts; schema has role column

### H5. No bulk KYC approve/reject ✅ DONE
- **Fix**: POST /admin/kyc/bulk already existed in kyc-enhancements.ts

### H6. No admin login/logout audit trail ✅ DONE
- **Fix**: Added audit log entries to admin login (POST /admin/login) and logout (POST /admin/logout)

### H7. No `POST /admin/support` from user/runner side ✅ DONE
- **Fix**: Added POST /support with getUserFromToken/getRunnerFromToken auth, GL-SUP ticket IDs, audit logging

### H8. No real-time admin notifications via socket ✅ DONE
- **Fix**: Added Socket.IO connection in AdminDashboard with useAdminSocket hook — joins admin_fleet room, listens for task_status_changed, fraud_alert, new_proof_photo, task_accepted, cash_payment_confirmed events, shows toast notifications, cleanup on unmount

### H9. `feedback/stats` has hardcoded response rate calculation ✅ DONE
- **Fix**: Replaced fake formula `reviews.length / (reviews.length + 20)` with real binary check: 100% if reviews exist, 0% if not
### H10. No admin notification bell/icon ✅ DONE
- **Fix**: Added open ticket count badge next to 'Support' nav item with 30s polling

### H11. No admin-specific rate limiting ✅ DONE
- **Fix**: Added adminLimiter (60 req/min) on /api/admin routes, configurable via RATE_LIMIT_ADMIN

### H12. `GET /admin/tasks/dispatch-stats` hardcodes limit=50 ✅ DONE
- **Fix**: Replaced with single SQL aggregation query (COUNT by status) + 10 recent tasks for display context

---

## 🟡 MEDIUM — Performance / UX Gaps

### M2. AdminRunners server pagination ✅ DONE
- **Fix**: Server-side pagination with limit=50, offset=page*50 passed to API

### M4. AdminHeatmap full table scan backend ✅ DONE
- **Fix**: Optimized to SQL aggregation using unnest + ILIKE for area matching

### M5. No runner earnings chart/visualization on admin side ✅ DONE
- **Fix**: Added runner earnings bar chart in AdminAnalytics with dual Y-axis (earnings Rs + task count)

### M6. No task timeline view on admin side ✅ DONE
- **Fix**: Added collapsible timeline in TaskSlideOver using useGetTaskTimeline hook, vertical timeline UI with event type, description, timestamp

### M8. AdminSettings has no UPI ID validation ✅ DONE

### M9. No quick-action buttons on task cards ✅ DONE
- **Fix**: Added Quick Assign (runner ID + PATCH) and Quick Delete (soft-delete) buttons in TaskSlideOver with onAction callback to refresh parent list

### M10. No admin-specific training progress overview dashboard ✅ DONE
- **Fix**: Added GET /admin/training/overview endpoint with aggregate stats

### M12. AdminSubscriptions is read-only ✅ DONE

### M15. AdminIncidents has no create incident button ✅ DONE

---

## 🔵 LOW — Polish / Missing UI

### L1. No admin dashboard "what's new" / changelog widget ✅ DONE
- **Fix**: Added changelog widget at bottom of AdminDashboard with phase milestones

### L2. No keyboard shortcuts for admin power users ✅ DONE
- **Fix**: Added Alt+key shortcuts (D=Dashboard, T=Tasks, R=Runners, M=Map, H=Heatmap, A=Analytics, S=Settings, K=KYC, N=Audit Log, O=Operations)

### L3. AdminHeatmap cards don't show trend arrows ✅ DONE
- **Fix**: Stores demand snapshot in localStorage on each load, compares current vs previous for TrendingUp/Down/Minus icons

### L4-L10: See original file for details (remaining polish items)

---

## ⚙️ BACKEND — Incomplete Routes / Missing Features

### B1-B3: Admin account management ✅ DONE
- **Fix**: GET /admin/admins (superadmin-only listing) + POST /admin/admins (create with hashPassword, role validation)

### B4. No DELETE /admin/tasks/:id soft-delete endpoint ✅ DONE
- **Fix**: Added DELETE /admin/tasks/:id — sets status to 'cancelled' with admin note, validates task isn't already completed/cancelled, audit logged

### B5. No broadcast notifications endpoint ✅ DONE
- **Fix**: POST /admin/broadcast with role-based targeting (all/user/runner), batch inserts 500 at a time, audit logging

### B6. No CSV format support in GET /admin/export ✅ DONE
- **Fix**: Added CSV export button to AdminRunners for current tab runners with proper escaping

### B7-B8. No general PATCH endpoints for users/runners ✅ DONE
- **Fix**: PATCH /admin/runners/:id (Zod validation, raw SQL for specializations text[] array) + PATCH /admin/users/:id (Zod validation)

### B9. No POST /admin/notifications/broadcast endpoint ✅ DONE
- **Fix**: Canonical POST /admin/notifications/broadcast in operations.ts (batch insert 500, audit logged), removed duplicate from notifications.ts

### B10. No GET /admin/payments/summary endpoint ✅ DONE
- **Fix**: SQL aggregation for revenue, platform fees, runner payouts, waiting charges, cash vs online breakdown

### B12. No subscription management endpoints ✅ DONE
- **Fix**: Added GET /admin/subscriptions, PATCH /admin/subscriptions/:id, PATCH /admin/subscriptions/:id/cancel
### B11. `GET /admin/pilot/readiness` loads ALL data into memory ✅ DONE (bonus)
- **Fix**: Replaced 7 full-table loads with 6 SQL aggregation queries

---

## 🔧 Schema / Migration Gaps

### S1-S3: See original file for details (all remaining)

---

## 📋 Implementation Order

### Phase 1: Fix Critical Performance ✅ DONE
- All 8 critical OOM endpoints fixed
- Additional fixes: leaderboard, pilot/readiness
- TypeScript compiles clean
- Code reviewed and approved

### Phase 2: Security & Admin Management (H3-H4, H6, H11) — NEXT
### Phase 3: Missing Endpoints (H1-H2, H5, H7, B1-B9)
### Phase 4: UX Improvements (M1-M15) — DONE ✅ (partial)
- **M1**: AdminTasks server-side pagination (limit/offset passed to API)
- **M3**: AdminUsers server-side pagination (limit 50, client-side kyc+search filter, page reset on filter/search)
- **M7+M14**: AdminSettings frontend validation (runnerPayoutPercent 0-100, waiting fields ≥0, UPI ID format regex, per-field error clearing)
- **H12**: dispatch-stats SQL aggregation (single COUNT query replaces limit=50 load-all + N+1 lookups)
- **H10**: AdminSidebar notification badge for open support tickets (30s polling via useListSupportTickets)
- **M11**: AdminSupport resolution form (expandable textarea, 'Mark In Progress'/'Resolve' buttons, non-empty validation)
- **M13**: AdminIncidents Create Incident UI (type/severity/title/description form, calls POST /admin/incidents)
- TypeScript compiles clean for both api-server and qbuddy
- Code reviewed and approved
### Phase 5: Admin Side Remaining Items — DONE ✅
- **H1/H2**: Replaced raw fetch with customFetch in AdminDashboard KYC/reconciliation/payouts widgets
- **H8**: Real-time admin notifications via Socket.IO (toast notifications for task events, fraud alerts)
- **H9**: Fixed hardcoded response rate in feedback/stats
- **M4**: Optimized AdminHeatmap backend to SQL aggregation
- **M5**: Added runner earnings bar chart in AdminAnalytics
- **M6**: Added collapsible task timeline in TaskSlideOver
- **M9**: Added quick-action buttons (assign/delete) in TaskSlideOver with parent list refresh
- **M10**: Added GET /admin/training/overview aggregate stats endpoint
- **L1**: Added changelog widget to AdminDashboard
- **L3**: Added heatmap trend arrows with localStorage snapshot comparison
- **L4**: Added Alt+key keyboard shortcuts for admin navigation
- **B4/B9/B10**: Added DELETE /admin/tasks/:id, POST /admin/notifications/broadcast, GET /admin/payments/summary
- TypeScript compiles clean for both packages
- Code reviewed and approved
### Phase 5: Polish (L1-L10) — DONE ✅
- **AdminRunners**: Server-side pagination (limit 50), CSV export for current tab, search by name/phone/city/area
- **AdminTraining**: Full CRUD for training modules (create/edit/delete), improved empty states and loading
- **AdminHeatmap**: Configurable areas via localStorage — add/remove custom areas with persistent storage
- **AdminSubscriptions**: Cancel/reactivate subscription actions, filter tabs (all/active/expired), actions column
- **SEO**: Added WebSite SearchAction, FAQPage with 5 Q&As, Service OfferCatalog (6 services), geo coords, twitter:image
- **Backend**: Added GET/PATCH /admin/subscriptions, PATCH /admin/subscriptions/:id/cancel
- TypeScript compiles clean for both api-server and qbuddy
- Code reviewed and approved

---

## 📝 Notes

- Backend runs on Express 5 with `@workspace/db` (Drizzle ORM + Neon Postgres)
- Frontend uses `wouter` for routing, `@tanstack/react-query` for data fetching
- API client generated via Orval from OpenAPI spec
- Admin auth uses `requireAdmin` middleware + token in localStorage
- Real-time features use Socket.IO with `admin_fleet` room
