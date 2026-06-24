# Go LineLess — App Flow Documentation

> Last Updated: June 23, 2026
> This document covers all user flows: authentication, task booking, runner operations, and payment.

---

## Table of Contents

1. [User Login Flow](#1-user-login-flow)
2. [User Signup Flow](#2-user-signup-flow)
3. [Runner Login Flow](#3-runner-login-flow)
4. [Forgot Password Flow](#4-forgot-password-flow)
5. [Offline Task Booking Flow](#5-offline-task-booking-flow)
6. [Runner Task Execution Flow](#6-runner-task-execution-flow)
7. [Cash Payment Flow (Offline)](#7-cash-payment-flow-offline)
8. [Real-time Communication (Socket.IO)](#8-real-time-communication-socketio)
9. [API Endpoints Reference](#9-api-endpoints-reference)
10. [Session Management](#10-session-management)

---

## 1. User Login Flow

**Route:** `/login`

```
Landing Page → "Get Started" → /login
                                  │
                    ┌──────────────┼──────────────┐
                    ▼              ▼               ▼
              Google Sign-In   Email+Password    "Create one" → /signup
                    │              │
                    ▼              ▼
           POST /api/auth/google   POST /api/auth/login
                    │              { email, password, role: "user" }
                    ▼              ▼
           Backend validates    Backend checks usersTable
           Google JWT           Verifies password hash (scrypt)
                    │              │
                    ▼              ▼
           Creates/finds user   Creates session token
           in usersTable       (30-day expiry)
                    │              │
                    ▼              ▼
           login(token,        Stores in localStorage:
            "user", user)      - golineless_user_token
                    │          - golineless_auth
                    ▼              │
              Navigate to          ▼
              /app/home        custom-fetch auto-attaches
                               Bearer token to all API calls
```

**Files:**
- `src/pages/auth/UserLogin.tsx` — Login page UI
- `src/contexts/AuthContext.tsx` — Session state management
- `src/routes/auth.ts` — Backend auth routes
- `src/lib/auth.ts` — Token generation & verification

---

## 2. User Signup Flow

**Route:** `/signup`

```
/login → "Create one" → /signup
                          │
                ┌─────────┴─────────┐
                ▼                   ▼
          Google Sign-Up        Email+Password
                │                { name, email, password }
                ▼                   │
         POST /api/auth/google      ▼
                │            POST /api/auth/signup
                ▼                   │
         Backend:                Backend:
         1. Validates Google JWT  1. Checks if email exists
         2. Creates usersTable   2. Hashes password (scrypt)
            row if new           3. Creates usersTable row
         3. Creates session      4. Creates session token
            token (30 days)         (30 days)
                │                   │
                ▼                   ▼
         login(token,         login(token,
          "user", user)        "user", user)
                │                   │
                ▼                   ▼
         Navigate to /app/home
```

**Backend:** `POST /api/auth/signup`
- Rate limited: max 10 per hour (signupLimiter in app.ts)
- Validates: email (valid format), password (min 6 chars), role
- Returns: `{ token, role, user }`

---

## 3. Runner Login Flow

**Route:** `/runner/login`

```
Landing Page → "Join as Runner" → /runner/login
                                    │
                      ┌─────────────┼─────────────┐
                      ▼             ▼              ▼
                  Phone OTP    Email Magic Link   Email+Password
                      │             │              │
                      ▼             ▼              ▼
            POST /auth/send-otp  Neon Auth API   POST /auth/login
            (Twilio sends SMS)   sends email     { email, password,
                      │             │             role: "runner" }
                      ▼             ▼                   │
            POST /auth/verify-otp  User clicks         ▼
            { phone, otp }        magic link     Backend checks
                      │             │            runnersTable
                      ▼             ▼            Verifies password
              Backend:          POST /auth/neon-callback
              1. Looks up       exchanges JWT
                 runnersTable        │
              2. Creates             ▼
                 session token  Creates session
              3. Returns        token (30 days)
                 { token,
                   runner }          │
                      │              ▼
                      ▼         login(token,
              login(token,       "runner")
               "runner")              │
                      │              ▼
                      ▼         Navigate to
              Navigate to       /runner/feed
              /runner/feed
```

**Runner Auth Options:**
1. **Phone OTP** — Twilio Verify (production) or in-memory OTP (dev)
2. **Email Magic Link** — Neon Auth magic link → callback → session exchange
3. **Email + Password** — Standard email/password login

---

## 4. Forgot Password Flow

**Routes:** `/forgot-password` → `/reset-password`

```
/login → "Forgot password?" → /forgot-password
                                │
                                ▼
                    Enter email
                    POST /api/auth/forgot-password
                    { email, role: "user" }
                                │
                                ▼
                    Backend:
                    1. Finds user by email
                    2. Generates reset token (crypto.randomBytes)
                    3. Stores token + expiry (1 hour) in usersTable
                    4. Sends email via Brevo with reset link
                       Link: /reset-password?token=xxx&role=user
                    5. Always returns success (prevents email enumeration)
                                │
                                ▼
                    "Check your email" confirmation page
                                │
                                ▼
                    User clicks link → /reset-password?token=xxx
                                │
                                ▼
                    Enter new password + confirm password
                    POST /api/auth/reset-password
                    { token, password }
                                │
                                ▼
                    Backend:
                    1. Finds record by reset token
                    2. Checks token not expired
                    3. Hashes new password (scrypt)
                    4. Updates password, clears reset token
                                │
                                ▼
                    "Password reset!" → Navigate to /login
```

---

## 5. Offline Task Booking Flow

**Route:** `/app/book` (3-step wizard)

```
┌─────────────────────────────────────────────────────────────┐
│                     STEP 1: What & When                     │
├─────────────────────────────────────────────────────────────┤
│  - Select category (hospital, medicine, bank, etc.)         │
│  - Describe task in detail                                  │
│  - Choose urgency: Normal (scheduled) or Urgent (+Rs 50)   │
│  - Toggle: Senior/differently-abled involved?               │
│  - Special instructions (gate code, contact name, etc.)     │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     STEP 2: Where                           │
├─────────────────────────────────────────────────────────────┤
│  - Place name (e.g., Civil Hospital)                        │
│  - Task area / locality (e.g., Navrangpura)                 │
│  - City: Ahmedabad (locked for pilot)                       │
│  - From → To area (route info for runner)                   │
│  - Pickup required? (multi-location task)                   │
│  - Estimated duration (15min to 2hrs)                       │
│  - Distance band (0-2km / 2-5km / 5+km)                    │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  STEP 3: Review & Pay                       │
├─────────────────────────────────────────────────────────────┤
│  - Task summary with category, date, time, area             │
│  - Price breakdown:                                         │
│    • Base service fee (category-based)                      │
│    • Distance charge (+Rs 0/20/50)                          │
│    • Urgency charge (+Rs 50 if urgent)                      │
│    • Priority fee (if applicable)                           │
│    • Coupon discount (GOLINELESS10 = 10% off)              │
│  - Payment method: "Pay Cash on Completion"                 │
│  - Expected token number (hospital/bank/govt tasks)         │
│  - Nearby available comrades preview                        │
│  - Terms & conditions checkbox                              │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
                    "Confirm & Book"
                           │
                           ▼
                    POST /api/tasks
                    { category, description, urgency,
                      locationName, locationArea,
                      distanceBand, scheduledDate,
                      scheduledTime, paymentMethod: "cash",
                      couponCode, seniorInvolved,
                      specialInstructions, ... }
                           │
                           ▼
                    Backend:
                    1. Validates pilot mode (category + zone)
                    2. Checks max concurrent tasks per user
                    3. Calculates price via revenue engine
                    4. Creates task in DB with status "pending"
                    5. Generates OTP (for task completion)
                    6. Triggers Smart Dispatch
                    7. Notifies user via Socket.IO
                    8. Creates in-app notification
                           │
                           ▼
                    Success modal: "Request Confirmed!"
                    "Pay your Comrade directly — cash on completion"
                           │
                           ▼
                    Navigate to /app/tasks/:id (track runner)
```

**Backend:** `POST /api/tasks` → `requireUser` middleware

---

## 6. Runner Task Execution Flow

**Route:** `/runner/feed` → `/runner/active`

```
┌─────────────── RUNNER SIDE ────────────────┐
│                                            │
│  /runner/feed (available tasks list)       │
│       │                                    │
│       │  Smart Dispatch notifies comrades  │
│       │  in waves (radius-based)           │
│       ▼                                    │
│  POST /tasks/:id/accept                    │
│  (runner accepts a pending task)           │
│       │                                    │
│       ▼                                    │
│  Task: pending → assigned                  │
│  Socket: task_accepted → user, admin       │
│  Runner starts navigation                  │
│       │                                    │
│       ▼                                    │
│  POST /tasks/:id/status                    │
│  { status: "on_the_way" }                  │
│       │                                    │
│       ▼                                    │
│  POST /tasks/:id/status                    │
│  { status: "at_location" }                 │
│       │                                    │
│       ▼                                    │
│  POST /tasks/:id/status                    │
│  { status: "in_progress" }                 │
│       │                                    │
│       ▼                                    │
│  Runner performs the task                  │
│  (picks up medicine, waits in queue, etc.) │
│       │                                    │
│       ▼                                    │
│  POST /tasks/:id/proof-photo               │
│  { imageUrl, proofType, lat, lng }         │
│  (uploads proof of task progress)          │
│       │                                    │
│       ▼                                    │
│  Task completed — runner shows OTP         │
│  to user verbally / via screen             │
│       │                                    │
│       ▼                                    │
│  POST /tasks/:id/verify-otp                │
│  { otp: "123456" }                         │
│  (runner enters user's OTP)                │
│       │                                    │
│       ▼                                    │
│  Backend:                                  │
│  1. Validates OTP (6 attempts max)         │
│  2. Validates state transition             │
│  3. Marks task: completed                  │
│  4. For cash tasks: paymentStatus = "paid" │
│  5. Updates runner earnings                │
│  6. Recalculates trust score               │
│  7. Notifies user + admin via Socket       │
│       │                                    │
│       ▼                                    │
│  Runner confirms cash received             │
│  POST /tasks/:id/confirm-cash              │
│  → paymentStatus: paid → cash_pending      │
│  (24hr dispute window starts)              │
│                                            │
└────────────────────────────────────────────┘
```

**Runner Page States:**
- `/runner/feed` — List of available pending tasks
- `/runner/active` — Current active task with status controls
- `/runner/earnings` — Earnings history and payouts
- `/runner/profile` — Profile and KYC status

---

## 7. Cash Payment Flow (Offline)

```
                    ┌─────────────────────┐
                    │ Task Completed      │
                    │ OTP Verified        │
                    └──────────┬──────────┘
                               │
                               ▼
                    Runner confirms cash:
                    POST /tasks/:id/confirm-cash
                    { } (runner auth required)
                               │
                               ▼
                    paymentStatus: "paid" → "cash_pending"
                    (24-hour dispute window starts)
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                 ▼
        User confirms     User disputes     Auto-finalize
        within 24hrs      within 24hrs      after 24hrs
              │                │                 │
              ▼                ▼                 ▼
        POST /confirm-cash-user  POST /confirm-cash-user   Cron job
        { action: "confirm" }    { action: "dispute",      auto-sets
              │                  disputeReason: "..." }    paymentStatus
              ▼                │                │          to "paid"
        paymentStatus          ▼                 │
        → "paid"          paymentStatus          │
        (finalized)        → "pending"           │
                           (flagged for          │
                            admin review)        │
              │                │                 │
              ▼                ▼                 ▼
        Runner notified   Admin notified     Payment finalized
        Payment audit     Payment audit      Payment audit
        log created       log created        log created

    ─────────────────────────────────────────────────────

    User can also pay via UPI:
    GET /tasks/:id/upi-qr
    → Returns UPI QR code data (upi://pay?pa=...&am=...)
    → User scans QR and pays via any UPI app
```

**Email + SMS Receipts:**
- Runner confirms cash → Brevo sends email receipt to user
- Runner confirms cash → Twilio sends SMS receipt to user
- User confirms payment → Runner gets notification

---

## 8. Real-time Communication (Socket.IO)

```
┌─────────────────────────────────────────────────────────────┐
│                    Socket.IO Events                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  RUNNER → SERVER:                                            │
│  ├── runner_location    (broadcasts GPS to task room +       │
│  │                       admin fleet room)                   │
│  ├── join_task          (joins task-specific room)           │
│  ├── join_comrades_room (joins dispatch notification room)   │
│  ├── waiting_timer_start/pause (queue waiting updates)      │
│  └── queue_progress_update (current token / counter)        │
│                                                              │
│  USER → SERVER:                                              │
│  ├── join_task          (joins task-specific room)           │
│  └── join_user_room     (joins personal notification room)  │
│                                                              │
│  ADMIN → SERVER:                                             │
│  └── join_admin_map     (joins admin fleet monitoring room) │
│                                                              │
│  SERVER → CLIENTS (broadcasts):                              │
│  ├── task_status_changed     → task room + admin fleet       │
│  ├── runner_location_update  → task room + admin fleet       │
│  ├── new_proof_photo         → task room + admin fleet       │
│  ├── task_accepted           → user room + admin fleet       │
│  ├── task_booked             → user room                    │
│  ├── cash_payment_confirmed  → user room + admin fleet       │
│  ├── task_cancelled          → comrades room                 │
│  ├── task_taken              → comrades room                 │
│  ├── queue_updated           → task room + admin fleet       │
│  └── waiting_timer_update    → task room + admin fleet       │
│                                                              │
│  Rooms:                                                      │
│  ├── task_{taskId}     — task-specific viewers              │
│  ├── user_{userId}     — individual user notifications      │
│  ├── comrades_room     — all online runners                 │
│  ├── comrade_{id}      — individual runner dispatch         │
│  └── admin_fleet       — admin monitoring dashboard         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. API Endpoints Reference

### Authentication

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/send-otp` | POST | None | Send OTP via Twilio SMS |
| `/api/auth/verify-otp` | POST | None | Verify OTP, create session |
| `/api/auth/signup` | POST | None | Create account (email+password) |
| `/api/auth/login` | POST | None | Login (email+password) |
| `/api/auth/forgot-password` | POST | None | Send password reset email |
| `/api/auth/reset-password` | POST | None | Reset password with token |
| `/api/auth/neon-callback` | POST | None | Exchange Neon JWT for session |
| `/api/auth/logout` | POST | Bearer | Delete session |

### Tasks

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/tasks` | POST | User | Create new task (book) |
| `/api/tasks` | GET | User/Runner | List tasks (filtered by role) |
| `/api/tasks/available` | GET | Runner | List pending tasks for feed |
| `/api/tasks/:id` | GET | User/Runner/Admin | Get task details |
| `/api/tasks/:id/status` | PATCH | Runner/Admin | Update task status |
| `/api/tasks/:id/accept` | POST | Runner | Accept a pending task |
| `/api/tasks/:id/proof-photo` | POST | Runner | Upload proof photo |
| `/api/tasks/:id/verify-otp` | POST | Runner | Verify OTP → complete task |
| `/api/tasks/:id/cancel` | POST | User/Runner/Admin | Cancel task |
| `/api/tasks/:id/review` | POST | User | Submit review & rating |
| `/api/tasks/:id/timeline` | GET | User/Runner/Admin | Get task timeline |
| `/api/tasks/:id/family-tracking` | POST | User | Generate family tracking link |
| `/api/tasks/:id/upi-qr` | GET | User | Generate UPI QR code |

### Payments

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/payments/create-order` | POST | User | Create payment order (cash mode) |
| `/api/payments/webhook` | POST | None | Razorpay webhook (disabled) |
| `/api/tasks/:id/confirm-cash` | POST | Runner | Runner confirms cash received |
| `/api/tasks/:id/confirm-cash-user` | POST | User | User confirms/disputes cash |
| `/api/tasks/:id/refund` | POST | Admin | Admin refunds payment |

### Admin

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/admin/login` | POST | None | Admin login |
| `/api/admin/stats` | GET | Admin | Dashboard statistics |
| `/api/admin/tasks` | GET | Admin | List all tasks |
| `/api/admin/runners` | GET | Admin | List all runners |
| `/api/admin/users` | GET | Admin | List all users |
| `/api/admin/reconciliation` | GET | Admin | Cash reconciliation report |
| `/api/admin/tasks/:id` | PATCH | Admin | Update task (status, notes, etc.) |

---

## 10. Session Management

```
┌─────────────────────────────────────────────────────────────┐
│                    Session Lifecycle                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CREATION:                                                   │
│  1. User authenticates (OTP / email+password / Google)      │
│  2. Backend generates crypto.randomBytes(32) token          │
│  3. Token stored in DB (user_sessions / runner_sessions)    │
│  4. Token + role returned to frontend                       │
│  5. Frontend stores in localStorage:                        │
│     - golineless_auth (full state JSON)                     │
│     - golineless_user_token / runner_token / admin_token    │
│                                                              │
│  USAGE:                                                      │
│  1. custom-fetch.ts auto-attaches Authorization: Bearer     │
│  2. Backend requireUser/requireRunner middleware validates   │
│  3. Checks: token exists in DB? expired? user active?       │
│                                                              │
│  EXPIRY:                                                     │
│  - User/Runner sessions: 30 days                            │
│  - Admin sessions: 7 days                                   │
│  - Password reset tokens: 1 hour                            │
│                                                              │
│  CLEANUP:                                                    │
│  - Cron job every 6 hours deletes expired sessions          │
│  - Data retention: runner locations (90 days),               │
│    notifications (60 days)                                   │
│                                                              │
│  LOGOUT:                                                     │
│  1. POST /api/auth/logout deletes session from DB           │
│  2. Frontend clears localStorage keys                       │
│  3. AuthContext resets state to null                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Task State Machine

```
pending → assigned → on_the_way → at_location → in_progress → completed
   │                                                                  │
   └── cancelled (from any non-completed state)                       │
                                                                      ▼
                                                              OTP verified
                                                                      │
                                                              paymentStatus:
                                                              ├─ paid (cash auto)
                                                              ├─ pending (online)
                                                              └─ cash_pending (24h window)
                                                                      │
                                                              ┌───────┼───────┐
                                                              ▼       ▼       ▼
                                                            paid   pending  refunded
                                                          (confirmed) (disputed) (admin)
```

---

*This document is auto-generated from the Go LineLess codebase. Update it when flows change.*
