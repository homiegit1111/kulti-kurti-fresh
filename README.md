This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

The storefront uses local CSS font stacks so production builds do not depend on fetching remote fonts.

## Auth + Commerce Architecture (Shopify Headless)

```
Supabase  →  Login / Signup / OTP / Session management
Shopify   →  Products / Collections / Cart / Checkout / Orders / Customers
Next.js   →  Bridge between Supabase identity and Shopify commerce
```

### How the Supabase → Shopify link works

1. User enters email on `/login`.
2. Supabase sends a one-time password (OTP) to that email.
3. User enters the code — Supabase verifies it and creates a session.
4. The storefront calls `POST /api/auth/sync-shopify` with the Supabase
   access token in the `Authorization` header.
5. That **server-only** route:
   - Verifies the Supabase token (using `SUPABASE_SERVICE_ROLE_KEY`).
   - Looks up the Shopify customer by email via Admin REST API.
   - Creates a Shopify customer if none exists.
   - Writes `shopify_customer_id` back to the Supabase user's
     `app_metadata` so the link is permanent.
6. The `AuthProvider` stores the Shopify customer in React context.

### Cart + Checkout flow

1. User adds items → Shopify Storefront Cart API creates a cart.
2. Each line item is synced to Shopify with Size/Color attributes.
3. At checkout the user enters their email (pre-attached to the cart).
4. Clicking **Pay with Shopify** redirects to `cart.checkoutUrl`.
5. Shopify handles: shipping options, payment (UPI/cards/wallets), taxes,
   order confirmation email, and inventory management.

**Private keys stay server-only:**  
`SUPABASE_SERVICE_ROLE_KEY` and `SHOPIFY_ADMIN_API_ACCESS_TOKEN` are never
sent to the browser — they only live in API routes.

### Environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Key variables:

| Variable | Where used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server | Safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Never expose in browser |
| `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` | Browser + server | e.g. `your-store.myshopify.com` |
| `NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Browser | Safe Storefront API token |
| `SHOPIFY_ADMIN_API_ACCESS_TOKEN` | **Server only** | Never expose in browser |
| `NEXT_PUBLIC_SHOPIFY_API_VERSION` | Browser + server | e.g. `2026-04` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Browser | Bot protection (future) |
| `TURNSTILE_SECRET_KEY` | **Server only** | Bot protection (future) |

### Development without Shopify

Leaving `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` and the tokens empty is safe during
development. The site falls back to mock products/collections and a
localStorage-only cart. The account page shows *"Shopify integration pending
setup"*. The `/api/auth/sync-shopify` route returns `{ configured: false }`
without throwing.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
