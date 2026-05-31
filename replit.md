# Go LineLess

Go LineLess is a verified human-assistant booking platform for real-world offline tasks — hospital queues, government offices, bank work, medicine pickup, senior care and errands — with live tracking, photo proof, and OTP-based task completion.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind CSS v4 + Framer Motion

## Where things live

- `artifacts/qbuddy/` — main web app (React + Vite)
- `artifacts/qbuddy/public/logo.jpg` — Go LineLess logo
- `artifacts/qbuddy/src/index.css` — brand CSS variables (Navy #0F2557, Gold #C9A84C)
- `artifacts/qbuddy/src/pages/landing/Landing.tsx` — public landing page
- `artifacts/qbuddy/src/pages/app/` — user-facing app pages
- `artifacts/qbuddy/src/pages/runner/` — runner portal pages
- `artifacts/qbuddy/src/pages/admin/` — admin dashboard pages
- `artifacts/qbuddy/src/lib/utils.ts` — category names, prices, status labels
- `artifacts/api-server/` — Express backend

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → React Query hooks + Zod validators
- OTP-based task completion: runner enters 6-digit OTP from user to confirm done
- Runner earns 70% of (total - platform fee Rs 20); admin keeps remainder
- Coupon codes validated client-side with backend fallback (accepted: QBUDDY10 / GOLINELESS10)
- Admin auth uses `localStorage.getItem("qbuddy_admin_token")` — different from user/runner JWT

## Product

- **User app**: Book runners for 8 categories, live tracking, OTP completion, senior care subscriptions, task history
- **Runner portal**: Dark-themed feed of available tasks, KYC onboarding, earnings dashboard, proof photo upload
- **Admin panel**: Real-time command center with GMV, runner status, KYC queue, live activity feed

## User preferences

- Brand: **Go LineLess** — Name: "Go LineLess", Tagline: "Life Without Waiting"
- Brand colors: Deep Navy `#0F2557`, Metallic Gold `#C9A84C`, Background `#F8F9FC`
- Logo: `/logo.jpg` (in `artifacts/qbuddy/public/`) — always use `<img src="/logo.jpg" />`
- Runner pages use dark background `#080E1E` (near-black navy), not purple
- No fake stats — always say "Pilot launching in Ahmedabad" for trust signals
- Disclaimer required: "Go LineLess assists with queue, pickup, submission and support tasks. We do not guarantee government approvals, medical decisions or bank outcomes."
- Company: IBNAY IFTRIBE PRIVATE LIMITED

## Gotchas

- Runner accent color is Gold `#C9A84C`, NOT orange — orange is the old QBuddy brand
- Admin localStorage key is `qbuddy_admin_token` — do NOT change this (backend depends on it)
- `pnpm run dev` at root is intentionally absent — use workflows to run services
- Coupon backend still expects `QBUDDY10` — the UI now accepts both `QBUDDY10` and `GOLINELESS10`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
