# Viktor Handoff — Rangat Pehnawa (`homiegit1111/Kurti`)

> Onboarding/handoff doc for AI agents (Viktor) working on this repo. Read this
> first on any code task, and **keep it updated** after you ship. Last updated:
> 2026-06-10.

Rangat Pehnawa is a premium ethnic-wear (Kurti) e-commerce site. Aesthetic goal:
quiet-luxury, fast, modern, fully SEO/AI-search optimized. Budget is bootstrap /
near-zero (free/organic channels only until funding).

## Stack
- **Next.js 16.2.7** (App Router, Turbopack) · **React 19.2** · **Tailwind v4**
- **Clerk** — real auth (`/account` protected). See "Auth gotchas" below.
- **Supabase** — database only (incl. wishlist persistence via Clerk↔Supabase
  third-party auth, RLS keyed on `auth.jwt()->>'sub'`; no service-role on the
  hot path).
- **Shopify Storefront API** — commerce engine. **Medusa was removed**;
  `src/lib/medusa*.ts` are deprecated shims re-exporting `@/lib/shopify`.
- Brand tokens (`globals.css`): `charcoal`, `gold` (+`gold-light`/`gold-dark`),
  `warm-white`, `warm-gray`. Fonts: `font-serif`=Playfair, `font-sans`=Inter.
  `terracotta` / `orange` are **NOT** brand tokens — never use them.

## Toolchain & build — bun only
- `PATH=/root/.bun/bin:$PATH` (no node/npm/npx in the sandbox).
- `bun install` · `bunx tsc --noEmit` · `bun run build`.
- `bun run build` runs **tsc + eslint and FAILS on lint errors** → a green build
  means lint is clean. Build needs an `.env.local` (gitignored) with dummy Clerk
  keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...`,
  `CLERK_SECRET_KEY=sk_test_...`) + `NEXT_PUBLIC_SITE_URL`. Without Shopify creds
  the app runs on MOCK product data.
- **Lockfile:** the repo tracks **`bun.lock`** (Vercel builds with bun). A
  `package-lock.json` may also appear (the owner's local agent runs `npm`); leave
  it as committed. **After dep changes, commit the updated `bun.lock`.**
- `sanity/` is excluded from tsc + eslint (it imports the Studio-only `sanity`
  package).

## Git workflow (write access works)
- Shell `git` has **no push credentials**. Push via the `coworker_git` tool —
  helper script `/work/temp/git2.py <dir> <args...>` (an agent-side helper, not
  in this repo). Push: `git2.py <dir> push origin HEAD:main`.
- **Default branch policy: work on `main`.** If the per-task "[Project context]"
  block names a specific branch (e.g. `viktor/<id>`) with pre-pushed state,
  follow that instead.
- Commit identity inline:
  `-c user.email=viktor@viktor.com -c user.name="Viktor Ai"`.
- **Never commit:** `ROADMAP.md`, `todo.md`, `.env*`. Restore generated SEO files
  before committing (`git checkout -- public/sitemap*.xml public/robots.txt`).
  Stage explicit paths only (never `git add -A`).
- ⚠️ Parallel tasks can race a shared clone — work in an isolated copy per task.

## Auth gotchas (Clerk) — read before touching `/login` or `/sign-up`
- Uses the **experimental Future/signals API** (`useSignIn`/`useSignUp` return
  `{ signIn|signUp, fetchStatus, errors }`), not the classic API. Real methods:
  `signIn.emailCode.sendCode/verifyCode`, `signIn.sso(...)`,
  `signUp.create/verifications.sendEmailCode/verifyEmailCode`, `.reset()`.
- Methods return `{ error }` for handled cases **but can still throw** on
  network/unexpected — always wrap in `try/catch`. Error shape varies between a
  single `ClerkError` and `ClerkAPIResponseError` (`.errors[]`) — parse both.
- ⚠️ `signIn/signUp.finalize({navigate})` **throws an internal Clerk error**
  (`cannot read '#q'`) in this SDK build. To complete sign-in, after a successful
  `verifyCode` call `useClerk().setActive({ session: createdSessionId, redirectUrl })`.
- `/login` = passwordless email-code + Google SSO; `/sign-up` redirects to
  `/login`. The Clerk webhook route is disabled locally (`.bak`).

## SEO conventions
- Dynamic `app/sitemap.ts` / `robots.ts` / `manifest.ts` + helpers in
  `lib/seo.ts`. **`next-sitemap` was removed — do not re-add it.**
- Client pages that need metadata/JSON-LD use a server `page.tsx` that wraps a
  `*-client.tsx` island (see `/shop`, `/collections`).

## What's shipped (high level, all on `main`)
- **Perf:** font wiring, AVIF/WebP image opt, lazy mobile reel, Web Vitals.
- **Commerce correctness:** Medusa→Shopify, Product JSON-LD, URL faceted filter,
  cart sync, `useOptimistic` add-to-cart + sold-out guards, `/order-confirmation`.
- **Security:** enforcing CSP (includes Google + Sanity domains so GA4 isn't
  blocked), in-memory rate limiting, Shopify webhook HMAC, Turnstile on contact +
  newsletter, wishlist IDOR hardening. `middleware.ts` → `proxy.ts` (Next 16).
- **Analytics:** GA4 + Consent Mode v2 + ecommerce events; Shop Pay express
  button (gated by `NEXT_PUBLIC_SHOP_PAY_ENABLED`).
- **Lifecycle:** abandoned-cart framework (Supabase store, `/api/cart/track`,
  `/api/cron/abandoned-cart` behind `CRON_SECRET`, orders-webhook reconcile) +
  **Resend** delivery — branded inline-style HTML/text email in
  `src/lib/server/abandoned-cart-email.ts`, env-gated by `RESEND_API_KEY`
  (from-addr `ABANDONED_CART_FROM`), degrades to a logged no-op without the key.
- **Content:** dependency-free Sanity GROQ client + `/lookbook` & `/lookbook/[slug]`
  with rich **Portable Text** rendering (`src/components/lookbook/portable-text.tsx`).
- **Legal:** real DPDP-aware `/privacy` + `/terms` (`legal-layout.tsx`), branded
  `not-found.tsx`.
- **UI:** product cards (`living-product-card.tsx`) show Sale/New/Sold-Out badges
  + strikethrough sale pricing + gold title-underline hover (parity with the
  homepage featured section).

## Env vars (see `.env.example`)
`NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_SHOP_PAY_ENABLED`, `CRON_SECRET`,
`ABANDONED_CART_THRESHOLD_MINUTES`, `RESEND_API_KEY`, `ABANDONED_CART_FROM`,
`NEXT_PUBLIC_SANITY_PROJECT_ID` / `_DATASET` / `_API_VERSION`,
`SANITY_API_READ_TOKEN`, plus Clerk / Supabase / Shopify keys.

## Frontend state
The design is already mature and polished — sophisticated navbar (scroll-aware
glass, animated underlines, full-screen mobile menu), footer (newsletter, giant
wordmark), rich cart/wishlist empty states, comprehensive animations in
`globals.css` (brand-aware `::selection`/scrollbar, reduced-motion). **Don't
gratuitously rewrite mature components** — focus on genuine gaps.

## Open TODOs / next ideas
- CSP nonce/hash lockdown (drop `unsafe-inline` / `unsafe-eval`).
- Server-side Shopify `productFilters`.
- Real delivery for `/api/contact` + a newsletter ESP.
- Deeper UX: PDP conversion polish (sticky add-to-cart, trust badges, size-guide
  drawer), richer collections hover/editorial covers, refined filter/sort UI,
  staggered grid fade-ins.
