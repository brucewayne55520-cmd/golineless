# 🛠️ Go LineLess — 48-Issue Production Readiness Fix List

Generated from full codebase audit (User + Runner perspectives).

---

## 🔴 CRITICAL (Issues 1–10) — Fix First

| # | Issue | File(s) to Fix | Description |
|---|-------|----------------|-------------|
| 1 | ✅ **Fixed: Broken nav: "View All Notifications"** | `UserHome.tsx` | Button now navigates to `/app/notifications` correctly |
| 2 | ✅ **Fixed: Dead PayRetry page** | `PayRetry.tsx` | Completely rewritten — removed dead Razorpay code, functional cash payment page with task summary, amount breakdown, contact Comrade, and CTA to task detail |
| 3 | **No email verification on signup** | `Signup.tsx`, `auth.ts` | Email+password signup stores unverified emails. Add email verification step or remove email field if magic link is primary auth |
| 4 | ✅ **Fixed: No cancel from MyTasks list** | `MyTasks.tsx` | Added cancel button on each task card for pending/assigned/on_the_way/at_location/in_progress/waiting_started tasks |
| 5 | ✅ **Fixed: SeniorCare subscription disabled** | `SeniorCare.tsx` | Added real subscription flow — calls POST /api/subscriptions API, shows processing state, handles success/fallback to admin approval message |
| 6 | **Phone update OTP may fail** | `UserProfile.tsx` | If user's old phone is inactive, they can't receive OTP to verify new number. Add email-based phone change verification as fallback |
| 7 | ✅ **Fixed: Runner Help & Support missing** | `RunnerProfile.tsx` → new `RunnerHelpSupport.tsx` | Created runner-specific Help & Support page with FAQs, contact info, safety info, and support hours |
| 8 | ✅ **Fixed: Runner Terms of Service missing** | `RunnerProfile.tsx` → new `RunnerTermsOfService.tsx` | Created runner-specific Terms of Service page with 10 sections covering responsibilities, payments, trust score, safety |
| 9 | ✅ **Fixed: Onboarding phone step is fake** | `RunnerOnboarding.tsx` | Removed fake phone verification step entirely (phone is already verified at login), re-indexed all remaining steps 0-4 |
| 10 | ✅ **Fixed: Performance Stats links to self** | `RunnerProfile.tsx` | Changed to navigate to `/runner/earnings` (which has full stats dashboard). Also fixed Help, Terms, and Privacy links to actual pages |

---

## 🟡 MAJOR (Issues 11–21) — Core Feature Gaps

| # | Issue | File(s) to Fix | Description |
|---|-------|----------------|-------------|
| 11 | ✅ **Fixed: No maps in BookTask** | `BookTask.tsx` | Added interactive Leaflet map with Ahmedabad pilot zone markers (Navrangpura, Satellite, CG Road, Bopal). Replaces static gray placeholder on step 2. |
| 12 | ✅ **Fixed: No active task dashboard on UserHome** | `UserHome.tsx` | Added persistent green card at top showing active task with runner name, status badge, location, and "Track →" CTA. Uses `useGetActiveTask` hook. |
| 13 | **No in-app chat** | New: `Chat.tsx`, `chat.ts` route | Currently uses WhatsApp links. Build Socket.IO-based in-app messaging for user↔runner communication |
| 14 | ✅ **Fixed: No repeat booking** | `MyTasks.tsx` | Added "Rebook this service →" button on completed task cards that navigates to `/app/book?category={category}` to pre-fill the booking form. |
| 15 | ✅ **Fixed: No task rescheduling** | `TaskDetail.tsx`, `RescheduleModal.tsx` | Added "Reschedule Task" button for pending tasks. Created `RescheduleModal` component with date/time pickers. Calls `POST /api/tasks/:id/reschedule`. |
| 16 | ✅ **Fixed: No runner ETA for users** | `TaskDetail.tsx` | Added runner ETA display when runner is `on_the_way`: calculates GPS distance using shared `haversineDistance`, shows "X km away" and ETA in minutes (3 min/km estimate). |
| 17 | ✅ **Fixed: No decline/dismiss for runners** | `RunnerFeed.tsx` | Added "Not Interested" decline button on task cards with `handleDecline` handler calling `POST /api/tasks/:id/dismiss`. Added `decliningRef` debounce guard. |
| 18 | **No automated payout** | `runners.ts` API, admin flow | Runner payout requests require manual admin processing. Build automated weekly payout or UPI auto-transfer |
| 19 | **No weekly earnings email** | New: `email.ts` template, cron job | Send runners a weekly summary email with tasks completed, earnings, rating changes |
| 20 | ✅ **Fixed: No past task detail for runners** | `RunnerEarnings.tsx` | Task history items are now clickable, navigating to `/app/tasks/:id` to show full task detail with proof photos, timeline, and earnings. |
| 21 | ✅ **Fixed: No task map view for runners** | `RunnerFeed.tsx` | Added `RunnerTaskMap` Leaflet component showing runner position + task markers with popups. Added map/list toggle button in header. Task count shown when online. |

---

## 🟠 MODERATE (Issues 22–37) — Important Improvements

| # | Issue | File(s) to Fix | Description |
|---|-------|----------------|-------------|
| 22 | **Verify all nav links work** | All page files | Audit every `navigate()` call and menu item across User, Runner, Admin to ensure no broken links |
| 23 | **Remove hardcoded city** | `BookTask.tsx`, `UserHome.tsx` | Replace `"Ahmedabad"` with dynamic city selector or geolocation-based city detection |
| 24 | ✅ **Fixed: Add user dark mode** | `UserHome.tsx` | Added dark mode toggle (Sun/Moon icon) in header. Uses `golineless_user_theme` localStorage key. Toggles `document.documentElement.classList.dark`. |
| 25 | ✅ **Fixed: Add map to FamilyTrack** | `FamilyTrack.tsx` | Added `FamilyTrackingMap` Leaflet component with real-time runner position (green marker) and task location (blue marker). Listens to `runner_location` socket events and polls API as fallback. |
| 26 | **Add review reminder** | `notifications.ts` API | After task completion, send a push/notification reminder to rate the runner within 24h |
| 27 | ✅ **Fixed: Fix hardcoded coupon** | `BookTask.tsx` | Dynamic coupon validation: fetches active coupons from `/api/admin/settings` on mount. Falls back to hardcoded `GOLINELESS10` if API unavailable. |
| 28 | **Add push notifications** | New: FCM integration, service worker | Both sides only have in-app Socket.IO notifications. Add FCM for background push on Android/Web |
| 29 | ✅ **Fixed: Add geofence auto-status** | `ActiveTask.tsx` | Watches runner GPS position via `watchPosition`. Detects when within 500m of task location while status is `on_the_way`. Shows haptic feedback + toast notification to prompt arrival confirmation. |
| 30 | **Show task count when online** | `RunnerFeed.tsx` | Add count badge "X tasks available" next to "Available Tasks" heading |
| 31 | ✅ **Fixed: Enhance active task banner** | `RunnerFeed.tsx` | Added `CategoryIcon`, status badge, and distance ETA (`locationLat`/`locationLng`) to the active task banner. |
| 32 | ✅ **Fixed: Add offline indicator for runners** | `RunnerFeed.tsx` | Added `socketConnected` state tracking. Shows amber "Connection lost. Reconnecting to dispatch..." banner when Socket.IO disconnects while runner is online. |
| 33 | ✅ **Fixed: Add decline reason UI** | `RunnerFeed.tsx` | Added decline reason picker modal with 6 options (too_far, not_interested, time_conflict, unclear_instructions, low_payout, safety_concern) + "Other" fallback. Uses `AnimatePresence` for smooth animation. |
| 34 | ✅ **Fixed: Better error messages** | `lib/api-client-react/src/custom-fetch.ts` | Added `FRIENDLY_MESSAGES` map for HTTP 400-504 with user-friendly text (e.g. 401 → "Your session has expired. Please sign in again."). Backend detail messages are preserved when available. |
| 35 | **Runner completion email** | `email.ts` template | Send runners an email after each completed task with earnings summary |
| 36 | **Invoice PDF generation** | New: `invoice.ts` utility | Generate downloadable PDF invoice from `invoiceNumber` and task details |
| 37 | **Referral system** | New: referral schema, API, UI | Add invite codes, referral tracking, and rewards for both users and runners |

---

## 🔵 MINOR / POLISH (Issues 38–48)

| # | Issue | File(s) to Fix | Description |
|---|-------|----------------|-------------|
| 38 | ✅ **Fixed: Step connector CSS** | `UserHome.tsx` | Replaced invalid `right-[-calc(50%-20px)]` with `w-8` class for proper connector line |
| 39 | **Dynamic location in header** | `UserHome.tsx` | Replace hardcoded "Ahmedabad, GJ" with user's city from profile or geolocation |
| 40 | **Real map in BookTask placeholder** | `BookTask.tsx` | Replace static gray box with Leaflet map showing Ahmedabad pilot zones |
| 41 | **KYC loading state** | `RunnerProfile.tsx` | Add loading spinner/progress indicator during multi-step KYC submission |
| 42 | ✅ **Fixed: Review filter chip colors** | `RunnerReviewsPage.tsx` | Added `color: DARK` to active filter chips for proper contrast on blue gradient |
| 43 | ✅ **Fixed: Empty notification CTA** | `RunnerNotificationsPage.tsx` | Added "Go to Tasks" button to empty notifications state for quick navigation |
| 44 | **Tooltip date in earnings chart** | `RunnerEarnings.tsx` | Recharts tooltip only shows amount. Add date label |
| 45 | **Task list pagination** | `MyTasks.tsx` | Add infinite scroll or "Load More" button for users with many tasks |
| 46 | **Offline confirmation dialog** | `RunnerFeed.tsx` | Add "Are you sure?" before toggling offline (prevent accidental disconnect) |
| 47 | **Last Active timestamp** | `RunnerProfile.tsx` (user view) | Show "Last active X ago" on runner profiles visible to users |
| 48 | **Category icon audit** | `CategoryIcon.tsx` | Verify every category key has a corresponding icon, add fallback for missing ones |

---

## 📋 Implementation Phases

### Phase 1: Critical Fixes (Days 1–2)
Issues #1–10 — Fix broken links, dead pages, missing auth steps

### Phase 2: Core Features (Days 3–7)
Issues #11–21 — Maps, chat, decline button, task rescheduling, map view

### Phase 3: Important Improvements (Days 8–12)
Issues #22–37 — Dark mode, push notifications, geofence, error messages, invoices

### Phase 4: Polish (Days 13–14)
Issues #38–48 — CSS fixes, loading states, tooltips, pagination, edge cases

### Phase 5: Validation
- Run `pnpm typecheck` across all packages
- Run `pnpm test` for all test suites
- Full code review with code-reviewer-mimo
- Manual QA walkthrough of User + Runner flows

---

## 📊 Summary

| Severity | Count | Est. Effort |
|----------|-------|-------------|
| 🔴 Critical | 10 | 2 days |
| 🟡 Major | 11 | 5 days |
| 🟠 Moderate | 16 | 5 days |
| 🔵 Minor | 11 | 2 days |
| **Total** | **48** | **~14 days** |
