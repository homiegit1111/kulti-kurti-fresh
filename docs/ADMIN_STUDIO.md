# Admin Studio

Everything the shop owner changes without a developer: stock, homepage images and
video, offers and sales, collection copy, wholesale pricing rules, and who is
allowed in.

Two audiences in one document. **Part 1** is for whoever runs the shop. **Part 2**
is for whoever maintains the code. Part 1 assumes nothing.

---

# Part 1 — Running the shop

Sign in and go to **/admin**. Everything below happens there.

## First: how changes reach the website

Product, stock, collection and offer changes are live immediately.

Text and image changes work in two steps, on purpose. You edit as much as you
like — every edit is saved as a **draft** that nobody else can see — and then you
press **Publish** once. That way a half-finished homepage never appears to
customers. After publishing, the site updates **within about a minute**.

If you close the tab mid-edit, your drafts are still there when you come back.

## Adding or correcting stock

**/admin/stock** is the page to open every morning.

- The tabs across the top are **All**, **Low**, **Out of stock**, **Tracked**.
  Start on **Low** — that is the list of things about to run out.
- Each row is one size of one style. Use **−** and **+** to count up or down, or
  type a number in the box to set an exact figure.
- Nothing is saved until you press **Save changes** at the bottom. You can adjust
  twenty rows and save once.
- Open the small arrow on a row to see its **history**: every change, when, and
  who made it. Nothing can change stock without appearing here — not the admin,
  not a customer order, not a developer running a query.

**Tracking, per size:**

- **Track stock** off — the size is always buyable. Use this when you make to
  order.
- **Track stock** on — the count matters, and the size goes out of stock at zero.
- **Allow backorder** — keep selling past zero.
- **Low stock warning at** — the number that turns the row orange and puts it in
  the **Low** tab. Set it to your reorder point, not to zero; zero is too late.

## Changing homepage images

**/admin/content → Home page.**

- **Cover → Model cut-out** is the big figure on the first screen. It must be a
  **PNG with a transparent background**. It is the largest image on the site, so
  keep it under about 400 KB or the page will feel slow on phone data.
- **Cover → Cloth inside the brand mark** fills the रंगत letters. It is only used
  when no style has a photo, because normally the letters are filled with the
  current featured style automatically.
- **This season** holds the three model shots. You can add a fourth or drop to
  one. Each has a figure numeral (०१, ०२, ०३) and a description used by screen
  readers.
- **Every set, in the hand** holds the flat-lay photos. The rate you type there
  is *display text only* — it is not a live price and changing it does not change
  what anyone is charged.

To change one: press **Choose**, then either pick something already in your
library or press **Upload new**. Then press **Publish**.

## Changing the homepage video

**/admin/content → Home page → Film band.**

There are three fields:

- **Video — MP4** — required. Every browser can play this.
- **Video — WebM** — optional, and worth doing. It is roughly 30% smaller for the
  same quality, so people on phone data get it faster. Leave it blank if you only
  have one file.
- **Poster image** — the still frame shown before the video plays. Use a frame
  from the video itself so there is no visible jump.

Upload the same way as an image. Video may be up to **100 MB**, but aim much
lower — 3 to 5 MB is a good target for a 15-second silent clip. The video only
downloads when a visitor scrolls near it, and never downloads at all for someone
who has asked their phone to reduce motion.

Turn **Show the film band** off to remove the section entirely.

## Running a sale

Two different tools. Use the right one.

**A single style on sale** — /admin/products, edit the style, set a **sale price**
on the sizes you want, and set the sale's start and end dates. The site shows the
old price struck through, and checkout charges the sale price. Leave the dates
blank to start now and never end.

**A discount across an order** — /admin/offers. Create an offer:

- **Automatic** (no code) — applies to everyone who qualifies. These are the only
  offers visible to the public.
- **With a code** — the customer must type it. Codes stay private until you share
  them.
- Choose **percent off**, **rupees off**, or **free shipping**; set a minimum
  number of sets or a minimum order value; set the dates; cap the total number of
  uses or uses per buyer.

Offers show a **state**: *scheduled*, *live*, *expired*, *paused*, *exhausted* —
so you can always see why an offer is or is not applying.

Deleting an offer that has already been used **switches it off instead of deleting
it**, because the record of who redeemed it has to survive.

## Editing collection text

**/admin/collections.** Each collection has:

- **Title** — the heading.
- **Web address** — the part after `/collections/`. Changing it breaks old links,
  so leave it alone once a collection is live.
- **Short note** — the one line shown in listings.
- **Standfirst** and **Body** — the longer copy on the collection's own page.
- **Image**, **Order** (lower numbers first), and **Status**.

Set status to **draft** while you write. A draft collection is invisible to
customers.

The wording on the collections *index* page — the heading and the background
art — is under **/admin/content → Collections pages**.

## Wholesale pricing rules

**/admin/pricing.** This changes what buyers are charged, so only an **owner** can
edit it.

- **Minimum order** — how many sets a buyer must reach before they can check out.
- **Set size** and **size ratio** — how many pieces are in a set and which sizes.
- **Volume ladder** — the discount at each quantity. A tier at **0 sets** is
  required; that is the normal price everyone starts at.

> **Read this before your first edit.** The site's code advertised a flat 0%
> ladder while the database was independently applying 5% at 8+ sets and 10% at
> 20+ sets. The database is what actually charges, so buyers were quoted the full
> price and charged up to 10% less. The ladder now shown to you is the one the
> database was already using, so nothing changed the day this shipped — but you
> should decide which was intended. If you never meant to give a volume discount,
> set every tier to 0% and tell your developer to mirror that in
> `src/lib/b2b/config.ts`.

## Who can get in

**/admin/team.** Three roles:

- **Staff** — counts stock and drafts text. Cannot publish, cannot delete,
  cannot touch prices or people.
- **Manager** — runs the shop day to day: styles, stock, content, offers, orders.
- **Owner** — everything, including pricing and the team.

There is also an **Always-on owners** list that is set in the server
configuration, not here. Those accounts cannot be edited or removed from this
page. That is deliberate: it is what guarantees you can never lock yourself out
of your own store. The system will also refuse to let you remove your own access
if you are not on that list.

## The activity log

**/admin/audit** records every change: who, what, when, and the before and after
values. It cannot be edited or cleared from the admin at all. Check it first when
something looks wrong.

---

# Part 2 — Setup and maintenance

## Applying the database migrations

Run these in the Supabase SQL editor, in this order, after the existing five
listed in `DEPLOY_CLOUDFLARE.md`:

```
supabase/20260726_admin_backoffice.sql
supabase/20260726_configurable_pricing_and_sales.sql
```

Both are idempotent. The second one replaces `public.create_commerce_checkout`, so
read its header before applying — it is the function that decides what a buyer is
charged. To roll it back, re-run `supabase/20260710_commerce_lifecycle_atomic.sql`.

Then run the verification queries in the footer of
`20260726_configurable_pricing_and_sales.sql`. All three should return true.

### Storage buckets

The migration creates and configures `product-images` (10 MB, images) and
`site-media` (100 MB, images + video) via `insert into storage.buckets`. If your
Supabase project restricts that table, create both by hand in **Storage → New
bucket**, mark them **Public**, and set the size limits and MIME allowlists to
match the migration.

### Seed yourself as owner

Optional — anyone in `ADMIN_CLERK_USER_IDS` is already treated as an owner:

```sql
insert into public.admin_users (clerk_user_id, role, display_name, is_active)
values ('user_xxxxxxxxxxxxxxxx', 'owner', 'Store owner', true)
on conflict (clerk_user_id) do update set role = 'owner', is_active = true;
```

## How content storage works

- `site_content` — published values. Public-read by RLS, so the storefront reads
  it with the **anon** key; no page render needs service-role powers.
- `site_content_drafts` — unpublished edits. Service-role only, so unreleased
  copy cannot be scraped before launch.
- `site_content_revisions` — append-only history. Powers "reset to original" and
  per-field revert.

The table stores opaque JSON. The **shape** is declared in
`src/lib/content/registry.ts` and enforced by `src/lib/content/validate.ts`.

**Adding an editable field is a registry edit and nothing else** — no migration,
no API change, no admin UI change. The editor renders itself from the registry.
Every `default` in the registry is the exact literal the component used before it
was wired, so an empty `site_content` table renders a byte-identical site and
"reset" is a row delete rather than a guess.

Keys are permanent. Renaming one orphans the owner's saved value — add and
deprecate instead.

### Tokens

Content strings may contain `{tokens}` resolved at render time:
`{setSize}`, `{sizeRatio}`, `{minSets}`, `{styleCount}`, `{collectionCount}`,
`{season}`, `{gstLow}`, `{gstHigh}`. This keeps a number like the MOQ in one
place. An unknown token renders as itself, so typos are visible rather than
silent.

## Caching — why it is time-based

Content reads use a 30-second in-process memo, **not** Next's data cache with
`revalidateTag`. `@opennextjs/cloudflare` only supports on-demand tag
revalidation when a tag-cache override is configured, and `open-next.config.ts`
configures only the R2 incremental cache. `revalidateTag()` would therefore
silently no-op in production and the owner's edits would never appear — the worst
failure mode available, because it looks like it worked.

Consequence: **any route that reads content needs `export const revalidate`** (or
must be dynamic), or a prerendered page will serve build-time HTML forever. `/`
sets `revalidate = 60`, which is where the "live within a minute" promise in the
UI comes from. If you change one, change the other.

`revalidateStorefront()` still calls `revalidatePath` as a best-effort bonus for
Node/self-hosted deployments.

### Routes that read content today

| Route | Wired | Revalidate |
|---|---|---|
| `/` | cover, film band, this-season shots, in-the-hand sets | 60 s |

Other routes read their copy from the registry defaults until wired. Wiring one
is mechanical: read content in the server component, pass plain data down as
props (see `src/lib/content/home.ts` and `home-types.ts` for the pattern), and add
a `revalidate`. Client components must never import the content reader.

## Security model

| Layer | Where |
|---|---|
| Roles + permissions | `src/lib/server/admin-roles.ts` — env allowlist = owner (break-glass), else `admin_users` |
| One guard per route | `src/lib/server/admin-guard.ts` — CSRF → IP burst limit → auth → permission → durable per-user limit → service-role client |
| Durable rate limiting | `src/lib/server/rate-limit-db.ts` + `rate_limit_hit()` — shared in Postgres, because the in-process limiter is per-isolate on Cloudflare and decorative as a real control |
| Audit trail | `commerce_admin_audit_log`, written by `recordAudit()`, with a salted IP hash rather than the address |
| Stock ledger | A trigger on `commerce_product_variants` — no code path can move stock silently |
| Content sanitisation | `src/lib/content/validate.ts` — URLs must be a site path or `https://`; colours must be hex; control characters stripped |
| No stored HTML | Content is plain text rendered as React children. Nothing goes through `dangerouslySetInnerHTML` |
| Direct uploads | Signed upload URL + server-side existence check, so bytes never transit the Worker and a phantom asset cannot be registered |

### Fixed while building this

- **Stored XSS in JSON-LD.** `JSON.stringify` does not escape `<`, so a review
  body or product title containing `</script>` closed the structured-data script
  element early. On `/` — prerendered, so no nonce, so `'unsafe-inline'` is the
  live policy — an injected script would have executed. All 19 call sites now use
  `jsonLdScript()` from `src/lib/json-ld.ts`.
- **CSP blocked hosted video.** `media-src` was `'self' blob:`, so the moment the
  owner replaced the film from the media library it would have failed — silently,
  in production only. Supabase Storage is now allowed.
- **`/admin` had no nonce**, so it fell back to the `'unsafe-inline'` policy — the
  one place a session can change prices. `/admin` is now a nonce-capable prefix.
- **Draft collections were visible.** The catalog adapter reads collections with
  the service-role client, which bypasses the "published only" RLS policy. The
  filter is now explicit.
- **Sale prices were invisible to the storefront.** The adapter hardcoded
  `salePrice: null`. It now computes the effective price through
  `src/lib/commerce/sale-price.ts`, the mirror of the SQL function checkout uses.
  Those two must stay in step.

### Known follow-up (not done here)

`src/lib/commerce/catalog.ts` imports the commerce adapter, which imports
`src/lib/supabase/admin.ts`. Twenty-one `"use client"` files import `catalog.ts`
for `formatPrice`/`COLOR_MAP`/`MOCK_PRODUCTS`, so the whole server data model —
`PRODUCT_SELECT`, the RPC names, the checkout logic — ships in the first-load
chunk of all 25 routes.

The service-role key does **not** leak today: it has no `NEXT_PUBLIC_` prefix, so
it is `undefined` in the browser. But the guard is one mistake wide — a rename, an
`env:{}` mapping in `next.config.ts`, or a bundler change would put a live
RLS-bypassing client in the browser. `createServiceRoleClient()` now throws if it
is ever called in a browser, which converts a silent failure into a loud one.

The structural fix is to move `formatPrice`/`COLOR_MAP`/`MOCK_*` into a
client-safe module, repoint those 21 imports, and add `import "server-only"` to
`src/lib/supabase/admin.ts` so the bundler enforces it. It was left out
deliberately: it touches 21 files that are mid-redesign on this branch.

## The volume ladder

`src/lib/b2b/config.ts` holds a **copy** of the tier ladder so client components
can render tiers synchronously. The database
(`public.commerce_pricing_tiers`) is authoritative for money.

Editing the ladder in Admin Studio changes what buyers are **charged**
immediately. It does not yet change the ladder **displayed** by client components
— that needs the rules threaded from the server through a provider. Until then,
mirror any change in `config.ts`.

## Environment

No new required variables. Two existing ones matter more now:

- `ADMIN_CLERK_USER_IDS` — the break-glass owner list. Keep at least one id here
  that is not managed through the admin.
- `COMMERCE_CHECKOUT_SESSION_SECRET` — also used as the salt for audit-log IP
  hashes. With it unset, no IP is recorded rather than an unsalted digest of a
  32-bit value, which is trivially reversible.

## Maintenance

`sweep_admin_maintenance()` clears expired rate-limit rows and abandoned pending
media. Call it from the daily cron:

```sql
select * from public.sweep_admin_maintenance();
```

Supabase database backups do **not** restore Storage objects. Back up the
`site-media` and `product-images` buckets separately, or an uploaded hero film is
unrecoverable.
