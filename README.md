# Rangat Pehnawa

B2B wholesale storefront built with Next.js, Clerk, Supabase, Razorpay, and a
Medusa 2 commerce backend scaffold.

## Current State

The Phase 1 wholesale storefront is complete and the Medusa Phase 2 runtime work
is ready up to the Razorpay key/test boundary. Razorpay is key-paste ready, but
real payment testing and Medusa order completion still need to be finished.

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

The Medusa backend lives in `apps/rangat-commerce/apps/backend`.

## Environment

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Tomorrow's Razorpay keys:

```env
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
```

After adding keys and restarting, check:

```text
/api/razorpay/readiness
```

Do not set `MEDUSA_ORDER_COMPLETION_ENABLED=true` until the real Medusa order
completion path is implemented and verified.
