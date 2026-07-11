# Scripts

## seed-supabase-catalog.mjs

Populates the Supabase commerce tables (`commerce_collections`, `commerce_products`,
`commerce_product_variants`) for the B2B wholesale storefront.

**Prerequisites**

1. Apply the migration first: run `supabase/20260709_commerce_backend.sql` in the
   Supabase SQL editor.
2. Set these env vars (in `.env.local` / `.env`, or the shell):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (service role — the script writes catalog rows)

**Run**

```bash
node scripts/seed-supabase-catalog.mjs
```

**Notes**

- Idempotent: upserts on `handle` (collections/products) and `product_id+size`
  (variants), so re-running updates rows in place. Safe to run repeatedly.
- Seeds 3 collections, 8 products, and 8 set variants. Each product sells as a
  wholesale set (S/M/L/XL, `set_price_inr` = whole rupees; `manage_inventory=false`
  so stock is untracked/infinite).
- Product data is duplicated from `src/lib/shopify.ts` (`MOCK_PRODUCTS` /
  `MOCK_COLLECTIONS`); handles match that source exactly. If you edit the mock
  catalog, mirror the change here.
