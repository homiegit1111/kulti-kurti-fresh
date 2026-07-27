# Admin Studio — API contract

The binding interface between `/api/admin/*` handlers and the `/admin` UI. Both
sides are written against this document. If an implementation disagrees with
this file, this file is wrong — fix it here first, then the code.

## Universal rules

Every handler:

```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
```

Every handler begins with exactly one guard call and nothing before it:

```ts
import { guardAdmin, recordAudit, badRequest, notFound, conflict, serverError,
         readJsonObject, revalidateStorefront } from "@/lib/server/admin-guard";

const guard = await guardAdmin(req, {
  permission: "content:write",
  mutation: true,                                  // POST/PATCH/PUT/DELETE only
  rateLimit: { name: "admin-content-write", limit: 60 },
});
if (!guard.ok) return guard.response;
const { db, userId, role } = guard.ctx;
```

- `guard.ctx.db` is a service-role `SupabaseClient` — already non-null.
- Never re-check auth. Never call `createServiceRoleClient()` in a route.
- Errors are always `{ error: string }` with a real HTTP status. The `error`
  string is shown to the owner verbatim, so write it for a shop owner, not a
  developer: say what to do, not what threw.
- Success bodies are always a JSON object (never a bare array).
- Audit every mutation with `recordAudit(guard.ctx, {...})`.
- `windowMs` defaults to 60_000 — omit it for per-minute budgets.

### Rate-limit bucket names

| Bucket | Limit/min |
|---|---|
| `admin-content-read` | 120 |
| `admin-content-write` | 120 |
| `admin-content-publish` | 20 |
| `admin-media-read` | 120 |
| `admin-media-write` | 60 |
| `admin-media-delete` | 30 |
| `admin-stock-read` | 120 |
| `admin-stock-write` | 120 |
| `admin-collections-read` | 120 |
| `admin-collections-write` | 60 |
| `admin-pricing-write` | 20 |
| `admin-offers-read` | 120 |
| `admin-offers-write` | 60 |
| `admin-team-write` | 20 |
| `admin-audit-read` | 60 |
| `admin-overview-read` | 120 |

### Paths to revalidate after a change

```ts
await revalidateStorefront(["/", "/collections", "/shop"]);
```
Collections also add `/collections/<handle>`; products add `/shop/<handle>`.

---

## 1. Content — `/api/admin/content`

Permission: `content:write` (read + draft), `content:publish` (publish/revert).
Editing writes to `site_content_drafts`. Publishing copies drafts into
`site_content`, records a revision, then clears the draft. This lets the owner
stage several changes and flip them together.

### `GET /api/admin/content`
```jsonc
{
  "groups": [ /* CONTENT_GROUPS from @/lib/content/registry, verbatim */ ],
  "published": { "home.cover.headline": "…", "…": "…" },  // every key, default-filled
  "drafts":    { "home.cover.headline": "…" },            // ONLY keys with a pending edit
  "overriddenKeys": ["home.cover.headline"],              // keys with a row in site_content
  "pendingCount": 1,
  "fromDatabase": true
}
```
Use `getContentForEditor()` from `@/lib/content/server` for `published` +
`overriddenKeys`, then read `site_content_drafts` for `drafts`.

### `PATCH /api/admin/content`
Save draft values. Validate EVERY value with `validateContentValue` from
`@/lib/content/validate` and store the returned cleaned value — never the raw
input.
```jsonc
// request
{ "values": { "home.cover.headline": "New headline", "home.season.shots": [ {...} ] } }
// 200
{ "ok": true, "saved": 2, "pendingCount": 3 }
// 400 — first failure wins, and names the field
{ "error": "Headline is 210 characters — the limit is 120." }
```
Rules: unknown key → 400 `Unknown content field "x".`; more than 100 keys in one
call → 400. A draft whose value equals the published value is deleted rather
than stored, so `pendingCount` never counts a no-op edit.

### `POST /api/admin/content`
One body field, `action`:

- `{ "action": "publish" }` → `content:publish`. For every draft row: insert a
  `site_content_revisions` row (`value` = new, `previous_value` = current
  published or null), upsert `site_content`, delete the draft. Then
  `invalidateSiteContentCache()` from `@/lib/content/server` and
  `revalidateStorefront(["/", "/collections", "/shop"])`.
  → `{ "ok": true, "published": 4 }`
- `{ "action": "discard" }` → `content:write`. Delete all draft rows.
  → `{ "ok": true, "discarded": 4 }`
- `{ "action": "reset", "keys": ["home.cover.headline"] }` → `content:publish`.
  Delete those rows from `site_content` AND `site_content_drafts` so the field
  returns to its registry default. Record a revision with `value: null`.
  → `{ "ok": true, "reset": 1 }`
- `{ "action": "revert", "key": "home.cover.headline" }` → `content:publish`.
  Restore `previous_value` from that key's newest revision.
  → `{ "ok": true, "key": "…", "value": … }`, or 404 if no revision exists.

Audit: `content.publish` / `content.discard` / `content.reset` /
`content.revert`, `entityType: "content"`, `entityId` = the key or `"batch"`.

### `GET /api/admin/content/revisions?key=<key>&limit=20`
Permission `content:write`. → `{ "revisions": [{ id, key, value, previous_value,
actor_clerk_user_id, created_at }] }`, newest first, `limit` clamped 1–50.

---

## 2. Media — `/api/admin/media`

Two buckets: `product-images` (images, ≤10 MB) and `site-media` (images + video,
≤100 MB). Large files never pass through the Worker — the browser uploads
straight to Supabase Storage with a short-lived signed token.

### `GET /api/admin/media?kind=image|video&folder=&limit=60&offset=0`
Permission `catalog:read`, bucket `admin-media-read`.
```jsonc
{ "assets": [{ "id","bucket","path","url","kind","mime_type","bytes","width",
               "height","duration_seconds","alt_text","title","folder","tags",
               "created_at" }],
  "total": 128 }
```
Only `status = 'ready'`. Newest first. `limit` clamped 1–100.

### `POST /api/admin/media/upload-url`
Permission `media:write`, bucket `admin-media-write`.
```jsonc
// request
{ "filename": "atelier.mp4", "contentType": "video/mp4", "bytes": 4194304,
  "kind": "video", "folder": "home" }
// 200
{ "assetId": "uuid", "bucket": "site-media", "path": "home/1a2b3c-xxxxxxxx.mp4",
  "token": "…", "url": "https://<proj>.supabase.co/storage/v1/object/public/site-media/…" }
```
Server-side rules — all mandatory:
- `contentType` must be in the allowlist. Images: `image/jpeg`, `image/png`,
  `image/webp`, `image/avif`. Video: `video/mp4`, `video/webm`,
  `video/quicktime`. Anything else → 415.
- `kind` must match the content type family, else 400.
- `bytes` must be a positive integer ≤ 10 MB (image) / 100 MB (video), else 413.
- The stored path is **generated server-side** from the sniffed extension and
  `crypto.randomUUID()`. The client filename is used only to derive a `title`.
  Never build a path from user input — that is a path-traversal and
  content-type-confusion vector.
- `folder` must match `/^[a-z0-9-]{1,40}$/`, else 400.
- Insert the `media_assets` row with `status: 'pending'` first, then mint the
  token with `db.storage.from(bucket).createSignedUploadUrl(path)`. Return
  `data.token`.

The browser then calls
`supabase.storage.from(bucket).uploadToSignedUrl(path, token, file)` with the
**anon** client (`createPublicClient()` from `@/lib/supabase/public`) — the token
is the authorisation, so no key is needed.

### `POST /api/admin/media/confirm`
Permission `media:write`, bucket `admin-media-write`.
```jsonc
// request
{ "assetId": "uuid", "width": 1920, "height": 1080, "durationSeconds": 15.2,
  "altText": "Studio floor", "title": "Atelier film" }
// 200
{ "asset": { /* the full ready row */ } }
```
Before flipping `status` to `'ready'`, **verify the object actually exists** with
`db.storage.from(bucket).list(dirname, { search: basename })` and confirm the
returned size is > 0 and ≤ the declared cap. A client that skips the upload must
not be able to register a phantom asset. Mismatch → 400
`Upload did not complete. Please try again.` Audit `media.create`.

### `PATCH /api/admin/media/[id]`
Permission `media:write`. Body: `{ altText?, title?, folder?, tags? }` (tags:
≤10 items, each `/^[a-z0-9-]{1,24}$/`). → `{ "asset": {...} }`. Audit
`media.update`.

### `DELETE /api/admin/media/[id]`
Permission `media:delete`, bucket `admin-media-delete`.
Refuse when the asset is still referenced, and say where:
```jsonc
// 409
{ "error": "Still in use by Home page · Cover · Model cut-out. Replace it there first.",
  "usedBy": ["home.cover.modelImage"] }
```
Check `site_content` and `site_content_drafts` for a value equal to the asset
`url`, and `commerce_products.thumbnail` / `images` / `commerce_collections.image`.
On success remove the storage object then the row. Audit `media.delete`.

---

## 3. Stock — `/api/admin/stock`

### `GET /api/admin/stock?filter=all|low|out|tracked&q=&limit=200`
Permission `catalog:read`, bucket `admin-stock-read`.
```jsonc
{ "rows": [{
    "variantId": "uuid", "productId": "uuid", "productTitle": "…",
    "handle": "…", "thumbnail": "…|null", "size": "S/M/L/XL", "sku": "…|null",
    "status": "published|draft", "setPriceInr": 1290, "salePriceInr": 990,
    "inventoryQuantity": 12, "manageInventory": true, "allowBackorder": false,
    "lowStockThreshold": 4,
    "state": "in_stock|low|out|untracked"
  }],
  "summary": { "tracked": 40, "low": 3, "out": 1, "untracked": 12, "totalSets": 512 }
}
```
Exclude `deleted_at is not null` products and `archived_at is not null` variants.
`state`: `untracked` when `!manageInventory`; `out` when qty ≤ 0; `low` when
`lowStockThreshold > 0 && qty <= lowStockThreshold`; else `in_stock`.
`q` matches product title, handle or SKU (sanitise before any `.or()` — strip
`[,()%*:]`, cap at 60 chars).

### `PATCH /api/admin/stock`
Permission `stock:write`, bucket `admin-stock-write`. One or many adjustments,
applied through the RPC so concurrent edits cannot clobber each other:
```jsonc
// request
{ "adjustments": [
    { "variantId": "uuid", "mode": "delta",    "amount": -2, "note": "damaged" },
    { "variantId": "uuid", "mode": "absolute", "amount": 24, "reason": "restock" }
  ] }
// 200 — per-row results, so one bad id does not lose the good rows
{ "results": [
    { "variantId": "…", "ok": true,  "before": 14, "after": 12 },
    { "variantId": "…", "ok": false, "error": "Variant not found." }
  ],
  "applied": 1 }
```
Rules: ≤100 adjustments per call; `mode` ∈ `delta|absolute`; `amount` an integer
(`absolute` must be ≥ 0); `reason` ∈ `manual_adjust|manual_set|restock|correction|bulk_import`
(default `manual_adjust` for delta, `manual_set` for absolute); `note` ≤ 200
chars. Call:
```ts
db.rpc("admin_set_variant_inventory", {
  p_variant_id, p_amount, p_mode, p_reason, p_note, p_actor: userId,
})
```
Returns rows of `(variant_id, quantity_before, quantity_after)`. Audit once per
call: `stock.adjust`, `entityType: "stock"`, `entityId: "batch"`, metadata
carrying the adjustments. Then `revalidateStorefront(["/", "/shop"])`.

### `PATCH /api/admin/stock/settings`
Permission `stock:write`. Sets the per-variant tracking flags:
`{ "variantId", "manageInventory"?, "allowBackorder"?, "lowStockThreshold"? }`
(threshold 0–10000). → `{ "ok": true }`. Audit `stock.settings`.

### `GET /api/admin/stock/movements?variantId=&limit=50`
Permission `catalog:read`. → `{ "movements": [{ id, variant_id, delta,
quantity_after, reason, note, order_id, actor_clerk_user_id, created_at }] }`,
newest first, `limit` clamped 1–200.

---

## 4. Collections — `/api/admin/collections`

### `GET /api/admin/collections`
Permission `catalog:read`. → `{ "collections": [{ id, handle, title, subtitle,
description, body, image, rank, status, productCount }] }` ordered by `rank` then
`title`. `productCount` counts published, non-deleted products.

### `POST` / `PATCH /api/admin/collections/[id]`
Permission `catalog:write`, bucket `admin-collections-write`.
Body: `{ handle?, title, subtitle?, description?, body?, image?, rank?, status? }`.
- `title` required, ≤120 chars.
- `handle` slugified from the title when blank; `/^[a-z0-9-]{1,120}$/`; unique →
  duplicate returns 409 `A collection with that web address already exists.`
- `subtitle` ≤200, `description` ≤600, `body` ≤4000.
- `image` must pass `sanitizeUrl` from `@/lib/content/validate`.
- `status` ∈ `draft|published`; `rank` an integer 0–9999.
→ `{ "collection": {...} }` (201 on create). Audit `collection.create|update`.
Revalidate `["/", "/collections", "/collections/<handle>"]`.

### `DELETE /api/admin/collections/[id]`
Permission `catalog:delete`. Refuse with 409 when products still reference the
handle: `{ "error": "3 styles are still in this collection. Move them first.",
"productCount": 3 }`. Audit `collection.delete`.

---

## 5. Pricing — `/api/admin/pricing`

The wholesale rules. `pricing:write` is **owner-only** because these values
decide what buyers are charged.

### `GET /api/admin/pricing`
Permission `catalog:read`.
```jsonc
{ "config": { "minimumOrderSets": 4, "setSize": 4, "sizeRatio": "S/M/L/XL", "currency": "INR" },
  "tiers": [{ "minSets": 0, "discountPercent": 0, "label": "Wholesale" },
            { "minSets": 8, "discountPercent": 5, "label": "Volume 8+ sets" }] }
```
From `commerce_pricing_config` (single row, `id = true`) and
`commerce_pricing_tiers` ordered by `min_sets`.

### `PATCH /api/admin/pricing`
Permission `pricing:write`, bucket `admin-pricing-write`.
```jsonc
{ "config": { "minimumOrderSets": 4, "setSize": 4, "sizeRatio": "S/M/L/XL" },
  "tiers": [{ "minSets": 0, "discountPercent": 0, "label": "Wholesale" }] }
```
Rules: `minimumOrderSets` and `setSize` integers 1–1000; `sizeRatio` ≤40 chars;
tiers 1–8 rows, `minSets` integers 0–10000 and **unique**, `discountPercent`
integers 0–50, and a tier at `minSets: 0` is required so every basket resolves.
Replace the tier set in one transaction-ish sequence (delete rows no longer
present, then upsert). → `{ "ok": true, "config": {...}, "tiers": [...] }`.
Audit `pricing.update` with before/after — this is the highest-value audit row in
the system. Revalidate `["/", "/shop", "/collections"]`.

---

## 6. Offers — `/api/admin/promotions`

### `GET /api/admin/promotions`
Permission `catalog:read`, bucket `admin-offers-read`.
```jsonc
{ "promotions": [{ id, code, title, description, kind, valuePercent, valueInr,
    scope, scopeHandles, minSets, minSubtotalInr, startsAt, endsAt, isActive,
    maxRedemptions, maxRedemptionsPerBuyer, redemptionCount, badgeLabel,
    priority, createdAt, "state": "scheduled|live|expired|paused|exhausted" }] }
```
`state` is derived, newest first: `paused` when `!isActive`; `exhausted` when
`maxRedemptions` reached; `scheduled` when `startsAt > now`; `expired` when
`endsAt <= now`; else `live`.

### `POST` / `PATCH /api/admin/promotions/[id]`
Permission `offers:write`, bucket `admin-offers-write`.
```jsonc
{ "code": "DIWALI10", "title": "Diwali 10%", "description": "",
  "kind": "percent", "valuePercent": 10,
  "scope": "all", "scopeHandles": [], "minSets": 8, "minSubtotalInr": 0,
  "startsAt": "2026-10-01T00:00:00Z", "endsAt": "2026-11-01T00:00:00Z",
  "isActive": true, "maxRedemptions": 100, "maxRedemptionsPerBuyer": 1,
  "badgeLabel": "10% off", "priority": 0 }
```
Rules:
- `title` required, ≤120.
- `kind` ∈ `percent|flat_inr|free_shipping`. `percent` requires `valuePercent`
  1–90 and no `valueInr`; `flat_inr` requires `valueInr` > 0 and no
  `valuePercent`; `free_shipping` requires neither. (The database enforces this
  too — reject in the route so the owner gets a sentence, not a constraint name.)
- `code`: null/empty means automatic. Otherwise uppercase,
  `/^[A-Z0-9][A-Z0-9_-]{2,31}$/`; duplicates → 409 `That code is already in use.`
- `scope` ∈ `all|collection|product`; non-`all` requires ≥1 handle, each
  `/^[a-z0-9-]{1,120}$/`, ≤50 handles.
- `startsAt`/`endsAt` ISO 8601 or null; `endsAt` must be after `startsAt`.
- `minSets` 0–10000, `minSubtotalInr` 0–10_000_000, `priority` 0–1000,
  `badgeLabel` ≤40, limits positive integers or null.
- **Never accept `redemptionCount` from the client** — it is server-owned.
→ `{ "promotion": {...} }` (201 on create). Audit `promotion.create|update`.
Revalidate `["/", "/shop"]`.

### `DELETE /api/admin/promotions/[id]`
Permission `offers:write`. If `redemptionCount > 0`, deactivate instead of
deleting (the redemption history must survive) and return
`{ "ok": true, "deactivated": true }`. Otherwise delete and return
`{ "ok": true, "deleted": true }`. Audit `promotion.delete`.

---

## 7. Team — `/api/admin/team`

### `GET /api/admin/team`
Permission `team:manage`.
```jsonc
{ "members": [{ clerkUserId, email, displayName, role, isActive, note,
                createdAt, lastSeenAt }],
  "envOwners": ["user_xxx"],   // from ADMIN_CLERK_USER_IDS — always owner, not editable here
  "you": { "userId": "user_xxx", "role": "owner", "source": "env" } }
```

### `POST /api/admin/team`
Permission `team:manage`, bucket `admin-team-write`.
`{ "clerkUserId": "user_xxx", "role": "manager", "displayName": "", "email": "", "note": "" }`
Rules: `clerkUserId` `/^user_[A-Za-z0-9]{10,40}$/`; `role` ∈
`owner|manager|staff`. Upsert on `clerk_user_id`. Call `forgetCachedRole(id)`
from `@/lib/server/admin-roles` after any change so it takes effect at once.
→ `{ "member": {...} }`. Audit `admin_user.upsert`.

### `PATCH /api/admin/team` — `{ "clerkUserId", "role"?, "isActive"?, "note"? }`
**Guard against self-lockout:** if the target is the caller and the change would
remove their own access (deactivate, or demote from owner) and they are not in
`ADMIN_CLERK_USER_IDS`, return 409 `You cannot remove your own access. Ask
another owner.` Audit `admin_user.update`.

### `DELETE /api/admin/team?clerkUserId=…`
Permission `team:manage`. Same self-lockout guard. Audit `admin_user.remove`.

---

## 8. Audit log — `GET /api/admin/audit`

Permission `audit:read`, bucket `admin-audit-read`.
`?entityType=&action=&limit=100&offset=0` →
`{ "entries": [{ id, actor_clerk_user_id, action, entity_type, entity_id,
before_state, after_state, metadata, created_at }], "total": n }`
Newest first, `limit` clamped 1–200. Read-only — there is no write endpoint, and
there must never be one.

---

## 9. Overview — `GET /api/admin/overview`

Permission `catalog:read`, bucket `admin-overview-read`. The dashboard in one
round trip. Every count is a `head: true, count: "exact"` query, never a full
row fetch.
```jsonc
{ "catalog":  { "published": 24, "draft": 3, "collections": 5 },
  "stock":    { "low": 3, "out": 1, "tracked": 40 },
  "orders":   { "pendingPayment": 2, "paid": 7, "fulfilled": 31, "paymentReview": 0 },
  "content":  { "pendingDrafts": 4, "lastPublishedAt": "…|null" },
  "offers":   { "live": 1, "scheduled": 2 },
  "media":    { "images": 61, "videos": 3 },
  "revenue":  { "paidTotalInr": 128400, "last30dInr": 24900 },
  "recentAudit": [ /* newest 8 audit entries */ ],
  "health": { "serviceRole": true, "razorpay": false, "resend": true,
              "pricingConfigured": true } }
```
`health` reports whether env is configured — booleans only, never key material.
