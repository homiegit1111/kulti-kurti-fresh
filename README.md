# Rangat Pehnawa

B2B wholesale storefront built with Next.js, Clerk, Supabase (database and
primary commerce backend), and Razorpay. A Medusa 2 scaffold is retained under
`apps/` for reference but is retired from the runtime.

## Current State

The Phase 1 wholesale storefront is complete and the Supabase-backed commerce
runtime is ready up to the Razorpay key/test boundary. Razorpay is key-paste
ready, but the first real test payment and end-to-end order completion still
need to be verified.

Useful docs:

- `docs/CURRENT_STATUS.md`
- `docs/RAZORPAY_SETUP.md`
- `docs/PHASE_2_OPERATIONS_RUNBOOK.md`

## Development

Run the storefront:

```bash
bun run dev
```

Open `http://localhost:3000`.

Run a production build:

```bash
bun run build
```

The legacy Medusa scaffold lives in `apps/rangat-commerce/apps/backend`
(retired from the runtime — the storefront's commerce adapter is
Supabase-backed; see `src/lib/commerce/index.ts`).

## Environment

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Razorpay keys (server + public):

```env
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
```

After adding keys and restarting, check:

```text
/api/razorpay/readiness
```

Order completion is ON by default — a verified + captured payment with a
linked commerce order completes it automatically. Set
`COMMERCE_ORDER_COMPLETION_DISABLED=true` only to pause completion temporarily
(see `docs/PHASE_2_OPERATIONS_RUNBOOK.md`).
