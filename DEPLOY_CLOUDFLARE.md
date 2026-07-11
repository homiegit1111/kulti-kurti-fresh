# Deploying the storefront to Cloudflare Workers

The app moved off Vercel + Medusa to **Cloudflare Workers (via `@opennextjs/cloudflare`) + Supabase**. This is the storefront + admin + API routes. There is no separate commerce server anymore — Supabase is the commerce backend.

## Why this adapter

`@cloudflare/next-on-pages` (the classic Pages adapter) was **archived 2025-09-29**. Cloudflare now recommends `@opennextjs/cloudflare`, which runs on the Workers runtime with `nodejs_compat`. That's required here: payment webhook verification uses `node:crypto` HMAC and the service-role Supabase client is server-side Node — the old edge-only model would have forced a per-route rewrite. OpenNext avoids that.

## One-time setup

```sh
bun add @opennextjs/cloudflare
bun add -d wrangler @cloudflare/workers-types
wrangler r2 bucket create rangat-next-cache   # for ISR/data cache (optional)
```

Add these scripts to package.json:

```jsonc
"preview:cf": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
"deploy:cf":  "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
"cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"
```

## Secrets (never commit these)

Set each with `wrangler secret put <NAME>`:

- `COMMERCE_CHECKOUT_SESSION_SECRET` — long random server-only signing key
- `CLERK_WEBHOOK_SECRET` — Clerk webhook verifier
- `SUPABASE_SERVICE_ROLE_KEY` — service-role key (catalog/order writes, webhooks)
- `CLERK_SECRET_KEY` — Clerk server key
- `CRON_SECRET` — daily-sweep bearer
- `RESEND_API_KEY` — transactional email
- Razorpay: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- PhonePe: `PHONEPE_CLIENT_ID`, `PHONEPE_CLIENT_SECRET`, `PHONEPE_CLIENT_VERSION` (whatever your phonepe-config expects)
- `ADMIN_CLERK_USER_IDS` — comma-separated Clerk user ids allowed into /admin

Public (`NEXT_PUBLIC_*`) vars are inlined at build time — set them in the build environment (Cloudflare dashboard → Workers → Settings → Variables, or a `.dev.vars` file for local):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_COMMERCE_BACKEND=supabase` (optional — supabase is the auto-detect default)
- `APP_ORIGIN` — the deployed origin (e.g. `https://rangatpehnawa.com`); the scheduled cron worker calls itself here.

## Database

Apply the SQL migrations in `supabase/` (run in the Supabase SQL editor, in order):

1. `20260709_commerce_backend.sql` — catalog + orders tables, RLS, price-tamper lockdown.
2. `20260709_payment_ledgers_generalize.sql` — adds `commerce_order_id` to the payment ledgers.

Then create the storage bucket for product images: Supabase dashboard → Storage → New bucket → name `product-images` → **Public**.

Register Clerk as a third-party auth provider (if not already): Supabase → Authentication → Third-Party Auth → Clerk → paste your Clerk domain. (This app already uses the native `accessToken` integration, not the deprecated JWT template.)

Seed the catalog:

```sh
node scripts/seed-supabase-catalog.mjs   # needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
```

## Cron

Vercel Cron is replaced by the Cron Trigger in `wrangler.toml` (`0 8 * * *`) → the `scheduled()` handler in `custom-worker.ts` → internal authed fetch to `/api/cron/daily`. `custom-worker.ts` forwards normal requests to the generated OpenNext handler. **Requires the paid Workers plan** ($5/mo); the free plan's ~10ms CPU cap can't run the sweeps.

## Deploy + smoke test

```sh
npm run preview:cf   # local Workers runtime preview first
npm run deploy:cf
```

After deploy, smoke-test in this order (these are the runtime-sensitive paths the static review can't fully validate):

1. **Clerk auth** — sign in, load `/account`.
2. **Payment webhook HMAC** — a real Razorpay/PhonePe test payment through `/api/razorpay/verify` (exercises `node:crypto` under `nodejs_compat`).
3. **Cron** — trigger the scheduled worker (`wrangler triggers` or wait for the schedule) and confirm `/api/cron/daily` runs.
4. **Admin** — sign in as an allowlisted user, load `/admin/products`, create a product, upload an image.

## Live-payment launch gates

- Deploy this app as a **Cloudflare Worker**, not static Cloudflare Pages. The
  storefront needs server routes, provider webhooks, and scheduled work.
- Apply the payment-ledger base schema before its generalization migration:
  `payment_orders_schema.sql`, `20260709_commerce_backend.sql`,
  `20260709_payment_ledgers_generalize.sql`, and
  `20260710_admin_catalog_safety.sql`.
- Set `COMMERCE_CHECKOUT_SESSION_SECRET` and `RAZORPAY_WEBHOOK_SECRET` as
  Worker secrets. Configure Razorpay's `payment.captured` event to
  `https://YOUR_DOMAIN/api/webhooks/razorpay`.
- Keep all `NEXT_PUBLIC_*` values in the CI/build environment; they are
  compiled into the browser bundle and cannot be supplied only at Worker runtime.

## Production Commerce Setup

This app deploys to Cloudflare **Workers** through OpenNext, not static Pages.
Create the required R2 bucket before deployment:

```sh
wrangler r2 bucket create rangat-next-cache
```

Apply these Supabase SQL files in order:

1. `payment_orders_schema.sql`
2. `20260709_commerce_backend.sql`
3. `20260709_payment_ledgers_generalize.sql`
4. `20260710_admin_catalog_safety.sql`
5. `20260710_commerce_lifecycle_atomic.sql`

Create public Supabase Storage buckets named `product-images` and
`review-photos` (the latter only when reviews remain enabled). Set the
`RAZORPAY_WEBHOOK_SECRET` Worker secret and configure Razorpay
`payment.captured` to POST to `/api/webhooks/razorpay`.

Workers Cron uses UTC: `*/5 * * * *` expires abandoned payment holds, while
`30 2 * * *` runs the daily lifecycle sweep (08:00 IST). Both require
`APP_ORIGIN` and `CRON_SECRET`.

## NOT done here (flagged, not silently skipped)

- **Not built/deployed for real** — no Cloudflare/wrangler runtime in the authoring environment. The config is written against current OpenNext + Cloudflare docs but the first real `preview:cf`/`deploy:cf` is where node:crypto-under-nodejs_compat and Clerk-on-Workers get truly validated. Budget time for that.
- **CSP `connect-src`** — `src/lib/server/csp.ts` may whitelist old origins (Medusa URL, Vercel). Re-check it allows the Supabase URL and Clerk, and drop any dead entries, before go-live.
- **The old Medusa backend** (`apps/rangat-commerce/`) is left on disk but is no longer referenced by the storefront. It's dormant, not deleted — remove it in a separate, deliberate step once you're confident in the Supabase cutover (it's also in the pre-migration backup).
