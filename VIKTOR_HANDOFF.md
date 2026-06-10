# 🧭 VIKTOR_HANDOFF — Read me first

> **Purpose:** This is the single source of truth for any AI agent (or developer) picking up work on this repo. It explains **what this project is, how it's built, what's already done, what's still open, and the gotchas that will bite you.** Read this top to bottom before writing any code. Keep it updated as you ship.

_Last updated: 2026-06-10 · Maintainer: Viktor (AI head-of-build) · Repo: `homiegit1111/Kurti`_

---

## 1. Project at a glance

- **Brand:** Rangat Pehnawa — premium Indian ethnic-wear (Kurti) e-commerce.
- **Goal:** Fast, modern, fully-SEO'd storefront. Premium editorial feel.
- **Budget (2026-06):** Bootstrap / near-zero. **Free & organic channels only** until funding. No paid tooling/ads.
- **Owner:** Aditya (GitHub `homiegit1111`, Slack `@hauler-brazier-7g`, TZ Asia/Kolkata). Style: terse, fast — ship + summarize.

---

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16.2.7** | App Router, Turbopack |
| UI | React 19.2, **Tailwind v4** | `@base-ui/react` components |
| Auth | **Clerk** (real) | `/account` protected. ⚠️ See §6 — uses the experimental **Future/signals API**, not classic. |
| DB | **Supabase** | DB only (wishlist, abandoned carts). Clerk↔Supabase third-party auth, RLS via `auth.jwt()->>'sub'`. |
| Commerce | **Shopify Storefront API** | `@/lib/shopify`. Medusa was removed — don't re-add. Falls back to **mock data** when unconfigured. |
| CMS | **Sanity** (dependency-free GROQ client) | Powers `/lookbook`. Renders with fallback content even before Sanity is connected. |
| Analytics | **GA4 + Consent Mode v2** | Privacy-first; only fires after cookie consent. No-op until `NEXT_PUBLIC_GA_MEASUREMENT_ID` set. |

**Brand tokens** (in `globals.css`): `charcoal`, `gold` (+`gold-light`/`gold-dark`), `warm-white`, `warm-gray`. Fonts: `font-serif` = Playfair, `font-sans` = Inter (via `next/font`). ⚠️ `terracotta` is **NOT** defined — never use it.

---

## 3. Toolchain & build (bun only)

```bash
export PATH=/root/.bun/bin:$PATH
bun install
bunx tsc --noEmit          # typecheck
bun run build              # tsc + ESLint + build. FAILS on any lint error → green == 0 lint errors
```

- **Lockfile is `bun.lock`** (tracked). Vercel builds with bun. There should be **NO `package-lock.json`** — see §7.
- `bun run build` needs `.env.local` (gitignored). Minimal dummy values to build without real services:
  ```
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
  CLERK_SECRET_KEY=sk_test_...
  NEXT_PUBLIC_SITE_URL=http://localhost:3000
  ```
- Without Shopify env → mock product data (build still passes).
- `sanity/` folder is **excluded from tsc + eslint** (it imports the Studio-only `sanity` pkg).

---

## 4. Git / push workflow (IMPORTANT for AI agents)

- The sandbox shell git has **no credentials**. Pushing is done via the `coworker_git` tool wrapper: `/work/temp/git2.py <dir> push origin HEAD:<branch>`.
- **Always work in an isolated repo copy per task** (the shared `/work/repos/Kurti` is hit by parallel tasks → race conditions).
- Each task's `[Project context]` block names a branch to push to (e.g. `viktor/<id>`) with current state pre-pushed there — **follow it**.
- Commit identity inline: `-c user.email=viktor@viktor.com -c user.name="Viktor Ai"`.
- **Never commit:** `ROADMAP.md`, `todo.md`, `.env*`. **Do commit** updated `bun.lock` after dependency changes.

---

## 5. What's shipped ✅ (chronological, on `main` unless noted)

**Phase 1 — Premium & fast**
- `next/font` (Playfair + Inter), perf pass, premium visual polish.

**Foundation**
- Medusa → `@/lib/shopify` migration.
- SEO: dynamic `app/sitemap.ts`, `robots.ts`, `manifest.ts`, `lib/seo.ts`. **`next-sitemap` removed — don't re-add.**
  - Pattern for client pages needing metadata/JSON-LD: server `page.tsx` wraps a `*-client.tsx` (see `/shop`, `/collections`).
- Cart sync, URL-driven faceted filtering, security headers, Shopify webhook HMAC verification.
- `/order-confirmation`, order-history price-bug fix.
- Turnstile on Contact (`POST /api/contact`), report-only CSP (`POST /api/csp-report`).
- **Wishlist persistence:** Clerk↔Supabase RLS (`auth.jwt()->>'sub'`, no service-role), `api/wishlist` GET/POST/DELETE; guests use localStorage and merge on sign-in.

**Phases 2–4 + deep QA (all on `main`, 2026-06-10)**
- `f95441f` — Phase 3: CSP report-only → **enforcing**; in-memory rate-limiting (contact/newsletter/wishlist/sync-shopify/account-orders); live Turnstile + newsletter form.
- `ee4fa24` — Cart `useOptimistic` (instant add-to-cart) + sold-out guards everywhere; **`middleware.ts` → `proxy.ts`** (Next 16 cleanup, Clerk auth unchanged).
- `e240107` — Phase 4a/b: **GA4 + Consent Mode v2** + ecommerce events (`add_to_cart`, `begin_checkout`); **Shop Pay** express button gated by `NEXT_PUBLIC_SHOP_PAY_ENABLED`.
- `e47a57c` — Phase 4c: **Abandoned-cart framework** — `src/lib/server/abandoned-cart.ts` (Supabase service-role) + `supabase/abandoned_carts_schema.sql`, `/api/cart/track`, `/api/cron/abandoned-cart` (behind `CRON_SECRET`), orders-webhook reconcile. _Only TODO: the actual email send._
- `b0fe262` — Phase 4d: dependency-free **Sanity GROQ client** + `/lookbook` + `/lookbook/[slug]` + Studio schema in `sanity/`.
- `c41e074` — **Deep QA:** CRITICAL fix — enforcing CSP lacked Google domains so GA4 `gtag.js` would be blocked → added googletagmanager/google-analytics (+sanity.io) to `script-src`/`connect-src`. Built real DPDP-aware `/privacy` + `/terms` (`src/components/legal/legal-layout.tsx`, were broken links). `/artisans` → `/about`. Wishlist DELETE hardened with explicit `clerk_user_id` filter (anti-IDOR). Branded `not-found.tsx`.

---

## 6. ⚠️ Clerk auth — critical gotchas

`@clerk/nextjs` 7.4.3 / `@clerk/react` 6.7.3 → `useSignIn`/`useSignUp` are the **experimental Future/signals API** (NOT classic).

- Hooks return `{ signIn|signUp, fetchStatus, errors }`. Methods **return** `{ error: ClerkError|null }` for handled cases **but can still throw** on network/unexpected → **always wrap in try/catch**.
- Real methods (not hallucinations): `signIn.emailCode.sendCode({emailAddress})` / `.verifyCode({code})`, `signIn.sso({strategy, redirectUrl, redirectCallbackUrl:"/sso-callback"})`, `signUp.create(...)`, `signUp.verifications.sendEmailCode()` / `.verifyEmailCode({code})`, `.reset()`.
- Error shape varies: a single `ClerkError` (`code`/`message`/`longMessage`) **or** `ClerkAPIResponseError` (`.errors[]`). **Parse both.**
- ⚠️ **`signIn/signUp.finalize({navigate})` THROWS an internal Clerk error (`cannot read '#q'`) in this SDK build.** Do NOT use it to complete sign-in. Instead, after `verifyCode` success, activate via `useClerk().setActive({ session: resource.createdSessionId, redirectUrl })`. (Fixed in `8883048`.)
- `/login` = passwordless email-code + Google SSO. `/sign-up` just redirects to `/login`. Login page rewritten 2026-06-10 (`05235b5`): fixed silent stalls / stale-status bugs + premium editorial split-screen redesign. The `clerk/route.ts` webhook is `.bak` (disabled locally).
- **Can't be runtime/click-tested without live Clerk keys** — auth is verified at the type/build level only.

---

## 7-old. ⚠️ (Resolved) Previous branch state

This branch (`viktor/<this-task>`) has a `sync: local changes before task` commit that:
- Added `@portabletext/react` and `resend` to `package.json` (the two open TODOs below — someone started wiring them).
- **BUT** committed a stray npm **`package-lock.json` (~7k lines)** and **did NOT update `bun.lock`**.

👉 **Before building/shipping:** delete `package-lock.json`, run `bun install` to regenerate `bun.lock`, and commit the updated `bun.lock`. This repo is **bun-only**; a stray `package-lock.json` will confuse Vercel and future agents.

---

## 7. UI/UX overhaul — June 10, 2026 (branch `viktor/1781089511`)

Shipped by Viktor; verified in a real browser against a **production build**:

- **Auth-optional architecture** — `src/lib/auth/` exposes `isAuthEnabled` +
  `useAuth`/`useUser`/`useClerk` wrappers (`@/lib/auth/client`) that return
  stable signed-out stubs when Clerk keys are absent. `layout.tsx` skips
  `ClerkProvider` entirely in keyless mode; `proxy.ts` only mounts
  `clerkMiddleware` when both keys exist. Account/login/sso-callback degrade
  gracefully. **Always import auth hooks from `@/lib/auth/client`, never
  directly from `@clerk/nextjs`** (except inside the auth lib itself).
- **PDP server-rendered** — `shop/[handle]/page.tsx` passes `initialProduct`
  into the client island; real product HTML ships on first paint (no spinner).
  Trust signals (COD / free ship ₹2,999+ / 7-day returns) on desktop + mobile.
- **Shop grid server-rendered** — `shop/page.tsx` passes `initialProducts`;
  all product cards are in the raw HTML. Client fetch remains as fallback.
- **Wishlist rebuilt** — old doodle/polaroid theme replaced with an on-brand
  editorial grid (quick-add w/ size pop-over, badges, animated removal).
- The stray `package-lock.json` from §7-old is **deleted**.

⚠️ Dev-server (Turbopack) hydration can stall in headless/proxied browser
environments (HMR websocket). **Verify with `bun run build && bun run start`,
not `bun dev`,** when doing browser QA in CI/sandboxes.

---

## 7b. Luxe visual overhaul — June 10, 2026 (later same day, on `main`)

Site-wide **visual-only** "quiet luxury editorial" pass (no logic/backend changes),
verified with full-page screenshots of every route at 1440px + 390px against a
production build:

- **Design system** (`globals.css`, after `.grain-overlay`): `.eyebrow`(+`--bare`),
  `.btn-luxe` (charcoal block w/ gold sweep), `.btn-luxe-outline`, `.field-luxe` +
  `.field-label` (underline editorial inputs), `.link-luxe` (animated gold
  underline, also fires from `.group:hover`), `.panel-luxe`, `.frame-luxe`
  (double hairline w/ gold inner rule). **Reuse these instead of ad-hoc classes.**
- **Direction:** unified `warm-white` background (no more `#f7f6f2`/`#fcfbf9`
  drift), square corners (rounded-full/2xl/3xl removed from UI chrome), hairline
  `charcoal/10` borders, serif-light headings w/ italic accents, gold uppercase
  microlabels, charcoal CTAs hovering to `gold-dark`.
- **Pages restyled:** home (doodles → quiet gold accents), shop grid + product
  card, PDP (square hero, serif purchase header, legible size selector, square
  CTAs, 3D-soon button removed), cart page + drawer, checkout (also fixed a
  broken empty-state DOM nesting), order-confirmation, account, login (square
  inputs + framed keyless fallback), contact, wishlist, 404 (ghost numeral).
- Lookbook + collection-detail pages were left as-is (intentionally art-directed).

---

## 7c. Final sprint — June 10, 2026 (evening, on `main`)

Four workstreams shipped in one pass (`89127d4..` series):

**Leftovers**
- `warm-white` token unified everywhere (`bg-[#fcfbf9]` literals gone except manifest/email hexes, which are intentional).
- Mobile micro-interactions: `@media (hover: none)` block in `globals.css` — `:active` press states for `.btn-luxe`/`.btn-luxe-outline`/`.link-luxe` + new `.tap-luxe` utility (applied to product cards & PDP size pills).
- **CSP nonce architecture** (`src/lib/server/csp.ts` + `src/proxy.ts`):
  - Dynamic routes (`/shop*`, `/collections/[handle]`, `/login`, `/sign-up`) get per-request `'nonce-…' 'strict-dynamic'`; middleware sets the CSP on *request* headers so Next stamps the nonce onto framework scripts.
  - Static/ISR routes (home, lookbook, cart, legal…) **cannot** carry a nonce (prerendered HTML) → they keep the hardened allowlist policy. ⚠️ If you make a new page dynamic, add its prefix to `DYNAMIC_ROUTE_PREFIXES` in `csp.ts`; if you blanket-apply strict-dynamic, static pages break.
  - Static CSP was removed from `next.config.ts` (two CSP headers enforce their intersection).

**Lifecycle emails (Resend)**
- `src/lib/server/email.ts` — shared branded shell (`renderBrandedEmail`) + `sendBrandedEmail` wrapper (graceful no-key no-op, `EMAIL_FROM` fallback, per-kind `*_FROM` overrides). Abandoned-cart pipeline was already fully wired — untouched.
- **Wishlist nudge**: `src/lib/server/wishlist-nudge.ts` + `/api/cron/wishlist-nudge` (daily 9:00). Items ≥ `WISHLIST_NUDGE_DAYS` (3) old, per-user cooldown `WISHLIST_NUDGE_COOLDOWN_DAYS` (21) stamped in `wishlist_nudges` table. Emails resolved from `profiles`.
- **Back-in-stock & size alerts**: `/api/stock-alerts` (POST, guest-allowed, validated + rate-limited 5/min) + PDP `StockAlertForm` (shows when sold out, picks up selected size) + `/api/cron/stock-alerts` (every 4h, emails + stamps `notified_at`).
- Shared `requireCronSecret` guard in `src/lib/server/cron-auth.ts`; all 3 crons scheduled in `vercel.json`.

**Customer reviews with photos**
- `supabase/reviews_schema.sql` — `product_reviews` (rating 1–5, body 10–2000, `photo_urls[]`, `status published|hidden`, unique per user+product). RLS: public read of published only; **no write policies** — service-role API is the sole write path.
- `/api/reviews` — GET public (s-maxage=60), POST multipart (Clerk auth, ≤3 photos, ≤5MB, jpeg/png/webp; author name derived server-side from `currentUser()`, never client-supplied).
- PDP: `ReviewsSection` ("Client Voices / Worn & loved") in `client-page.tsx`; server `page.tsx` emits `aggregateRating` + top-5 `review` JSON-LD **only when real reviews exist**.

**⚠️ Manual Supabase steps (one-time, required before these features go live)**
1. Run `supabase/lifecycle_schema.sql` (after `wishlist_profile_schema.sql`).
2. Run `supabase/reviews_schema.sql`.
3. Create a **public** storage bucket named `review-photos`.
4. Set env: `RESEND_API_KEY`, `CRON_SECRET`, optionally `EMAIL_FROM` / `WISHLIST_NUDGE_FROM` / `STOCK_ALERT_FROM`.

---

## 8. 🔭 Open items / next ideas

1. **Real Portable Text rendering** on lookbook detail (`@portabletext/react`, already added to deps) — currently fallback content.
2. **Server-side Shopify `productFilters`** — move faceted filtering server-side.
3. **Real delivery** for `/api/contact` + a newsletter provider.
4. **Review moderation surface** — flip `status` to `hidden` via Supabase dashboard for now; a tiny admin view would be nicer.
5. **CSP**: consider hashing the static pages' inline bootstrap scripts to drop `unsafe-inline` there too.

---

## 9. Environment variables

Build-minimum (dummy) — see §3. Feature flags / integrations (all documented in `.env.example`):

```
NEXT_PUBLIC_GA_MEASUREMENT_ID        # turns on GA4
NEXT_PUBLIC_SHOP_PAY_ENABLED         # shows Shop Pay express button
CRON_SECRET                          # secures ALL cron endpoints (abandoned-cart, wishlist-nudge, stock-alerts)
ABANDONED_CART_THRESHOLD_MINUTES
RESEND_API_KEY                       # lifecycle emails; without it sweeps no-op gracefully
EMAIL_FROM                           # default From; ABANDONED_CART_FROM / WISHLIST_NUDGE_FROM / STOCK_ALERT_FROM override per kind
WISHLIST_NUDGE_DAYS / WISHLIST_NUDGE_COOLDOWN_DAYS   # defaults 3 / 21
NEXT_PUBLIC_SANITY_PROJECT_ID / _DATASET / _API_VERSION
SANITY_API_READ_TOKEN
# + Shopify Storefront, Clerk, Supabase, Turnstile keys
```

---

## 10. Conventions cheat-sheet

- Premium editorial tone; use brand tokens only (no `terracotta`).
- Client page + SEO → split into server `page.tsx` (metadata/JSON-LD) + `*-client.tsx`.
- API routes: enforce auth (401) + owner-scope every query (defense-in-depth, not RLS-only).
- Keep `bun.lock` in sync after any dep change; never commit `.env*`, `ROADMAP.md`, `todo.md`.
- After shipping, **update this file** so the next agent stays oriented.
