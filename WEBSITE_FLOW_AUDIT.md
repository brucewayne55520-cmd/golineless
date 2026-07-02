# Website Flow Audit

This audit is based on the source code only. Existing Markdown and text documentation files were not used.

## Application Overview

The website has three main operational flows:

1. User/customer flow
2. Runner/comrade flow
3. Admin/operator flow

The product is a task-booking platform where a user creates a task, a runner/comrade accepts and completes it, and admins monitor operations, KYC, payments, support, quality, incidents, and pilot readiness.

Core areas:

- Frontend: React/Vite app in `artifacts/qbuddy`
- Backend: Express API in `artifacts/api-server`
- Database: Drizzle/Postgres schemas in `lib/db`
- Shared API client: `lib/api-client-react`
- Realtime: Socket.IO
- Payments: cash-first flow, with Razorpay code partially present
- Dispatch: nearby verified runners are notified in waves

## Public Website Flow

### Public Routes

The public user can access:

- Landing page
- User login
- User signup
- Runner login
- Magic-link callback
- Forgot password
- Reset password
- Privacy page
- Terms page
- Help page
- About page
- Public family task tracking by token

### Public Entry Flow

1. Visitor lands on the website.
2. Visitor chooses customer login/signup or runner login.
3. User or runner authenticates through password, magic link, or Google where supported.
4. Auth state is saved in localStorage.
5. Route guards redirect based on role:
   - User -> `/app/home`
   - Runner -> `/runner/feed`
   - Admin -> `/admin`

## User / Customer Flow

### 1. User Authentication

User can:

- Sign up
- Log in with email/password
- Log in with Google
- Use magic-link callback
- Request password reset
- Reset password

After login:

1. Auth token is stored as user auth.
2. User role is stored as `user`.
3. User can access protected `/app/*` routes.

### 2. User Home Dashboard

After login, the user reaches `/app/home`.

Main dashboard responsibilities:

- Show user summary
- Show recent tasks
- Show service categories
- Show notifications
- Show senior-care entry points
- Show payment/task history links

### 3. Booking Flow

User books from `/app/book`.

Booking flow:

1. Select service category.
2. Enter task description.
3. Select urgency.
4. Optionally mark senior involvement.
5. Enter location, area, city, coordinates, from/to areas.
6. Enter pickup details if pickup is required.
7. Select date/time.
8. Enter expected queue token if relevant.
9. Pricing preview is requested from backend.
10. User reviews price.
11. User submits task.

Backend task creation:

1. Requires authenticated user.
2. Validates request body.
3. Blocks senior-care tasks unless user KYC is verified.
4. If pilot mode is enabled, validates city, zone, and category.
5. Checks maximum concurrent active tasks for the user.
6. Validates coordinates.
7. Calculates base price, distance charge, urgency charge, priority fee, runner earning, and platform fee.
8. Applies coupon if valid.
9. Generates OTP.
10. Stores hashed OTP.
11. Creates task with status `pending`.
12. Creates task timeline event.
13. Generates invoice number.
14. Triggers smart dispatch.
15. Notifies nearby eligible runners/comrades.

### 4. Task List Flow

User opens `/app/tasks`.

User can:

- See all own tasks
- Filter tasks
- Search tasks
- Sort tasks
- Open task detail
- See payment state
- See status state

### 5. Task Detail Flow

User opens `/app/tasks/:id`.

User can see:

- Task status
- Runner/comrade assignment
- Live location if available
- OTP while task is active
- Queue progress
- Waiting time
- Proof photos
- Payment state
- Cash confirmation/dispute actions
- Family tracking link
- Review form after completion

Normal user-side task lifecycle:

1. Task created as `pending`.
2. Runner accepts, task becomes `assigned`.
3. Runner starts travel, task becomes `on_the_way`.
4. Runner reaches pickup or task location.
5. Runner starts task, task becomes `in_progress`.
6. Runner uploads proof.
7. Runner confirms cash if cash payment.
8. Runner verifies OTP.
9. Task becomes `completed`.
10. User reviews runner.

### 6. Cash Payment Flow

Cash flow is intended to work like this:

1. Runner receives cash.
2. Runner calls confirm-cash.
3. Task payment becomes `cash_pending`.
4. User gets a 24-hour dispute window.
5. User confirms payment or disputes.
6. If user confirms, payment becomes `paid`.
7. If user does nothing, cron auto-finalizes after 24 hours.
8. If user disputes, payment goes back to `pending` and admin reviews.

### 7. Family Tracking Flow

User can create a public family tracking token.

Family tracking page:

1. Opens `/family/track/:token`.
2. Backend validates token.
3. Family member can see limited task state.
4. Socket joins task room using family token.
5. Family receives live task updates.

### 8. User Profile Flow

User profile includes:

- User details
- KYC submission
- Aadhaar front/back upload
- Emergency contact
- Notification settings
- Language preference
- Help/support links
- Logout

## Runner / Comrade Flow

### 1. Runner Authentication

Runner can:

- Log in with email/password
- Sign up from runner login flow
- Use magic-link email flow
- Request password reset

After login:

1. Token is stored as runner auth.
2. Role is stored as `runner`.
3. Runner can access `/runner/*` protected routes.

### 2. Runner Feed Flow

Runner opens `/runner/feed`.

Runner feed includes:

- Online/offline toggle
- Readiness/KYC state
- Available task list
- Distance and estimated task details
- Accept task button
- Earnings summary
- Active task shortcut

Backend available-task flow:

1. Requires authenticated runner.
2. Loads pending tasks.
3. Filters dismissed tasks.
4. Hides user phone from available task preview.
5. Returns available tasks.

Accept task flow:

1. Runner taps accept.
2. Backend requires runner verification or dispatch allowance.
3. Backend checks runner has no active task.
4. Backend checks task is still `pending`.
5. Task is atomically assigned.
6. Task status becomes `assigned`.
7. Runner metrics update.
8. Dispatch waves are cancelled.
9. User is notified.
10. Runner moves to active task flow.

### 3. Runner Active Task Flow

Runner opens `/runner/active`.

Expected lifecycle:

1. Task starts as `assigned`.
2. Runner taps "I'm on my way".
3. Task becomes `on_the_way`.
4. If pickup is required, runner uploads pickup proof.
5. Runner reaches pickup.
6. Runner reaches task location.
7. Runner uploads task-location proof.
8. Runner starts task.
9. Task becomes `in_progress`.
10. Runner can start/pause waiting timer.
11. Runner can update queue progress.
12. Runner uploads progress/completion proof.
13. Runner confirms cash.
14. Runner verifies OTP.
15. Task becomes `completed`.

### 4. Runner Proof Photo Flow

Runner uploads proof photos for:

- Pickup proof
- Task-location proof
- Progress proof
- Completion proof

Backend proof flow:

1. Requires authenticated runner.
2. Confirms task belongs to runner.
3. Validates proof type.
4. Validates GPS proximity where relevant.
5. Checks duplicate images.
6. Stores proof photo.
7. Adds timeline event.
8. Broadcasts proof update over sockets.

### 5. Runner Waiting / Queue Flow

Runner can:

- Start waiting timer
- Pause waiting timer
- End waiting
- Update current queue token
- Update counter number

Backend stores waiting and queue events and broadcasts updates to:

- User task page
- Family tracking page
- Admin fleet views

### 6. Runner Completion Flow

Completion requires OTP verification.

Backend OTP flow:

1. Requires authenticated runner.
2. Confirms runner owns task.
3. Blocks completion if task is already completed.
4. Validates state transition to `completed`.
5. Checks OTP lock state.
6. Checks OTP expiry.
7. Hashes submitted OTP and compares.
8. Locks OTP after too many failures.
9. On success, marks OTP verified.
10. Sets task status to `completed`.
11. Clears active runner.
12. Updates runner totals and earnings.
13. Recalculates trust score.

### 7. Runner Profile / KYC Flow

Runner profile includes:

- Personal details
- Avatar
- KYC submission
- Aadhaar front/back
- Selfie
- Bank details
- Emergency contact
- Agreement acceptance
- Specializations
- Notification settings
- Logout

KYC status controls whether a runner can accept work unless dispatch override exists.

### 8. Runner Onboarding Flow

Runner onboarding includes:

1. Basic information
2. Phone/profile setup
3. GPS permission
4. Bank details
5. Selfie/KYC
6. Agreement/go-live step

After onboarding:

- Runner KYC becomes pending or reviewable.
- Runner can become online only when allowed.

### 9. Runner Earnings Flow

Runner earnings page includes:

- Lifetime earnings
- Daily earnings chart
- Completed task history
- Payout request
- Payout history
- CSV export

Payout flow:

1. Runner requests payout.
2. Backend checks pending payout state.
3. Admin later settles or cancels payout.
4. Reconciliation data appears in admin.

### 10. Runner Reviews Flow

Runner reviews page:

- Loads reviews for logged-in runner.
- Displays rating distribution.
- Displays customer review text.
- Supports filtering by rating.

## Admin Flow

### 1. Admin Authentication

Admin route is `/admin/login`.

Intended backend flow:

1. Admin submits username and password.
2. Backend verifies admin account.
3. Backend creates admin session.
4. Backend returns admin token and role.
5. Frontend stores `golineless_admin_token`.
6. Admin can access `/admin/*`.

Current frontend only submits password, which breaks production admin login.

### 2. Admin Dashboard Flow

Admin dashboard includes:

- Platform stats
- Recent activity
- KYC metrics
- Fraud flags
- Payment reconciliation summary
- Payout status
- Daily operations overview
- Socket connection to admin fleet room

### 3. Admin Task Management Flow

Admin task pages allow:

- View tasks
- Filter/search tasks
- Open task slide-over
- Patch task fields
- Delete task
- View payment state
- View fraud flags
- View runner/user relation
- Monitor status changes

Backend admin task APIs include:

- List tasks
- Update task
- Delete task
- Dispatch stats
- Payment summary
- Fraud flags
- Refund route, but currently broken because it incorrectly requires user auth first

### 4. Admin Runner Management Flow

Admin can:

- List runners
- View runner KYC
- Approve KYC
- Reject KYC
- Allow dispatch manually
- Edit runner metadata
- View active runner locations
- View performance data
- View payout/reconciliation information

### 5. Admin User Management Flow

Admin can:

- List users
- View user KYC
- Approve user KYC
- Reject user KYC
- Update user data
- Review user activity

### 6. Admin Subscription Flow

Admin can:

- List subscriptions
- Update subscription data
- Cancel subscriptions
- View subscription analytics

Subscription/payment code exists, but the app is currently cash-first and online payment appears partly disabled or incomplete.

### 7. Admin KYC Review Flow

Admin KYC flow:

1. Admin opens KYC review.
2. Admin loads pending user/runner KYC.
3. Admin views submitted details and documents.
4. Admin approves or rejects.
5. Backend updates KYC status.
6. Backend logs audit/payment-style event where implemented.

### 8. Admin Operations Flow

Admin operations pages include:

- Recruitment
- Training modules
- Quality reviews
- Support tickets
- Incidents
- Heatmap
- Pilot dashboard
- Operations center
- Leaderboard
- Area performance
- Founder dashboard
- Incident response
- Audit log

Operational backend includes:

- Recruitment funnel
- Training module CRUD
- Training progress
- Quality review submission
- Support ticket management
- Incident tracking
- Pilot mode/config/readiness
- Executive reports
- Daily operations metrics
- Area performance
- Leaderboards

### 9. Admin Payment / Payout Flow

Admin payment responsibilities:

- Track cash collected
- Track cash pending
- Track online payment status if enabled
- Review disputes
- Settle runner payouts
- Cancel payouts
- Export reconciliation
- View payment audit log

## Realtime Flow

Socket.IO is used for:

- Runner location updates
- Task room updates
- Family tracking updates
- Admin fleet updates
- Proof photo broadcasts
- Waiting timer updates
- Queue progress updates
- Dispatch notifications
- User/runner notification rooms

Production socket connections require valid identity. Development mode is more permissive.

## Background Jobs / Cron Flow

Backend starts cron-like jobs for:

- Auto-finalizing cash payments after dispute window
- Cleaning expired sessions
- Cleaning old data
- Sending KYC reminders

## Broken Logic And Risk List

### Critical

1. Production admin login is broken.
   - Frontend submits only password.
   - Backend production admin login expects username and password.
   - Result: real admin login cannot work in production through current UI.

2. Backend typecheck fails.
   - `pnpm --filter @workspace/api-server typecheck` fails in admin quality review insert.
   - The frontend typecheck passes.
   - Result: backend build or CI may fail.

3. Non-pickup runner tasks can get stuck at `on_the_way`.
   - UI does not show a valid next action for non-pickup tasks after `on_the_way`.
   - Result: runner may not be able to progress the task from the active task screen.

4. Admin refund route is unreachable for admins.
   - Route is labeled admin-only but uses user auth middleware first.
   - Result: admin token fails before admin logic runs.

5. Completed tasks can still be cancelled by direct API call.
   - Shared cancel logic does not block completed or already cancelled tasks.
   - Result: completed work can be corrupted into cancelled state.

### High

6. Cash payment can enter `cash_pending` without `paymentConfirmedAt`.
   - OTP verification can set cash task payment to `cash_pending`.
   - Auto-finalize requires `paymentConfirmedAt`.
   - Result: payment can remain pending without dispute countdown/finalization.

7. Runner socket connections are missing auth in important screens.
   - Runner feed and active task create sockets without token auth.
   - Production socket middleware rejects unauthenticated sockets.
   - Result: realtime dispatch, waiting, queue, and task updates may fail.

8. Socket broadcast events lack task ownership checks.
   - Some socket events rebroadcast to task/admin rooms without verifying ownership of that task.
   - Result: authenticated clients may spoof realtime UI updates if they know task IDs.

9. Reviews can be submitted before task completion and duplicated.
   - Review route checks ownership but not completed status.
   - No duplicate review prevention.
   - Result: ratings can be inflated or corrupted.

10. Runner forgot-password uses user role.
    - Shared forgot-password page always posts `role: "user"`.
    - Result: runner reset flow is broken from runner login.

### Medium

11. Pickup-required flow skips `reached_pickup`.
    - After pickup proof, UI proceeds directly to `reached_task_location`.
    - Result: timeline/state is inaccurate.

12. Priority pricing enum mismatch.
    - API accepts `normal/high/vip`.
    - Revenue engine charges only `priority/emergency`.
    - Result: high/vip priority fee is never charged.

13. Razorpay webhook references nonexistent task metadata.
    - Webhook queries `metadata->>'orderId'`.
    - Task schema does not define metadata.
    - Result: online payment capture will fail if Razorpay is enabled.

14. Queue timeline does not render correctly.
    - Backend stores task timeline as JSON strings.
    - Frontend filters them as objects.
    - Result: queue timeline may never appear.

15. Sensitive verification photo metadata endpoints are unauthenticated.
    - Photo detail and hash-check routes do not require auth.
    - Result: uploaded photo metadata and risk data can be exposed.

16. Auth token selection can use wrong role.
    - Shared fetch prefers runner token, then user token, then admin token.
    - Result: if multiple tokens remain, API calls may use the wrong identity.

17. KYC image storage can fall back to base64 in database.
    - If B2 storage is not configured or upload fails, base64 data URL is stored.
    - Result: database can become heavy and sensitive image data can sit inline.

18. Encryption falls back to a default development key if env is missing.
    - Production logs an error but continues.
    - Result: sensitive PII encryption can be weak if deployment env is misconfigured.

## Recommended Fix Order

1. Fix admin login UI to collect username and password.
2. Fix backend typecheck failure in admin quality review insert.
3. Fix runner active-task state machine UI for pickup and non-pickup tasks.
4. Fix refund auth middleware.
5. Block cancellation of completed/cancelled tasks.
6. Fix cash payment reconciliation so `cash_pending` always has `paymentConfirmedAt`.
7. Add auth token to runner sockets.
8. Add task ownership checks to socket broadcast events.
9. Restrict reviews to completed tasks and prevent duplicate reviews.
10. Fix runner forgot-password role handling.
11. Align priority pricing enum across frontend, API, and revenue engine.
12. Disable or repair Razorpay webhook before enabling online payment.
13. Parse task timeline JSON strings before rendering queue timeline.
14. Protect verification photo metadata endpoints.

