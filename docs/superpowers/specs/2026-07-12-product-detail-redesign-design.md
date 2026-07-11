# Product Detail Page — Refined Line-Book Redesign

**Date:** 2026-07-12
**File touched:** `src/app/shop/[handle]/client-page.tsx` (the `TradePlateDetail` component)
**Scope:** Full PDP layout/UX redesign. No token, backend, or SEO (`page.tsx`) changes.

## Problem

The current PDP works but the UX is heavy:

1. **Model image is cropped.** The hero uses `object-cover` in an `aspect-[4/5]` frame, so the full look/garment is never visible — you have to imagine what's cut off.
2. **Too much scroll.** The right-side console is one long vertical stack: price → buy block → pack anatomy → MOQ meter → GST ledger → trust strip → trade terms → reseller margin estimator → description. The buy decision competes with wholesale detail for the same vertical space.
3. **Duplicated text.** The description renders twice ("The Style" under the plate on desktop, and again in the mobile block).

Goal: a premium, home-page-consistent PDP where the garment shows in full, buying is effortless and reachable without scrolling, and the wholesale detail is one tap away instead of a long scroll.

## Direction (locked with user)

- **Image:** full garment, never cropped (`object-contain` on a soft studio backdrop).
- **Density:** tabs for secondary info; buy decision stays above the fold.
- **Aesthetic:** refined line-book — evolve the current identity (style codes, registration scan, mono micro-labels, hairline borders, `frame-luxe`, lime/red accents), but airier and more premium. Must visually match the home page.
- **Motion:** subtle & premium.
- **Priority:** beautiful + attractive + easy to buy / add to cart.
- Existing semantic tokens only (`surface`, `surface-2`, `surface-hover`, `surface-inverse`, `content`, `content-inverse`, `line`, `accent-lime`, `accent-red`) so **dark mode keeps working untouched**.

## Layout

### Desktop (`lg+`)

Two columns, rebalanced to roughly fill the viewport height so the whole look and the whole decision are visible together.

```
┌───────────────── max-w-[1600px] ─────────────────┐
│  ‹ Line book                       Style № RP-… › │  ← slim breadcrumb + header band (kept, lighter)
├──────────────────────────┬────────────────────────┤
│  IMAGE STAGE (~7/12)     │  BUY CONSOLE (~5/12)   │
│  sticky, viewport-tall   │                        │
│  ┌──┐ ┌────────────────┐ │  ◦ In stock · Ready    │
│  │01│ │                │ │  TITLE (big)           │
│  │02│ │   uncropped    │ │  ─────────────────     │
│  │03│ │   garment on   │ │  ₹per-piece   ₹per-set │
│  │  │ │   warm studio  │ │  ─────────────────     │
│  └──┘ │   backdrop     │ │  Color  ● ● ●          │
│       │                │ │  [− 04 +] [ Add ▸ ]   │
│       │      RP-12 ▸   │ │  04 sets · 48 pcs ₹…   │
│       └────────────────┘ │  ♡ Save  ↗ Share  ? Ask│
│                          │  ┌──────────────────┐  │
│                          │  │ Details │ Pack │ …│  │  ← tab strip
│                          │  ├──────────────────┤  │
│                          │  │  active panel     │  │
│                          │  └──────────────────┘  │
└──────────────────────────┴────────────────────────┘
   REVIEWS  (full-width, below fold — kept)
   MORE FROM THIS RUN  (full-width carousel — kept)
```

- **Image stage:** `object-contain` so nothing is cropped; garment sits on a warm studio backdrop (`surface-2` + faint radial glow keyed to warm tones, reusing the home page's `product-stage-glow` language). Vertical thumbnail rail (existing plate-index numbers 01–04) to the left. Sticky on desktop (`lg:sticky lg:top-28`). Keep the one-shot registration-scan on load, the style-code chip, and the sold-out badge. Image change = gentle cross-fade + slight scale (existing `AnimatePresence` treatment, kept).
- **Buy console (above the fold, in order):** stock dot + status → title → price row (per-piece hero, per-set secondary with strike-through sale) → color row → **sets stepper + Add to order** (the money row, side by side) → live total line (`AnimatedRupees`, incl GST) → quiet actions row (Save / Share / Ask). Nothing below the fold is required to buy.

### Secondary info → tabs

A single tab strip below the buy block replaces the long stack. Four tabs:

| Tab | Contents |
|-----|----------|
| **Details** | The description / "The Style" copy. **Rendered once** (dedupe the current double render). |
| **Pack & sizing** | Pack-anatomy grid + `SIZE_RATIO_LABEL` size run + MOQ meter (informational). |
| **Pricing** | GST ledger (subtotal / GST / grand total, `AnimatedRupees`) + `ResellerMarginEstimator`. |
| **Trade terms** | The terms list (style code, set size, wholesale note, WhatsApp-confirm note). |

- Tab strip: mono uppercase micro-labels, hairline bottom border, a **sliding lime underline** (`layoutId` shared-element) under the active tab.
- Panels **cross-fade** on switch (subtle; honors reduced motion).
- Default active tab: **Details**.
- The grand-total line already lives above the fold in the buy block, so switching away from Pricing never hides the number that matters most.

### Mobile

- Image stage first — full, uncropped — with a **horizontal thumbnail snap row** beneath (existing pattern, kept).
- Buy essentials directly under it: title → price → color → stepper + Add → total line → quiet actions.
- Same four tabs, stacked full-width.
- **Sticky bottom ticker bar kept unchanged** (total + Add) — it's good UX. Sold-out stock-alert form still hangs off it.

## Components (same file, refactored for clarity)

Split `TradePlateDetail`'s giant return into focused sub-components in the same file so each is understandable and editable on its own:

- `ImageStage({ product, activeImageIndex, setActiveImageIndex, styleCode, soldOut, reduce })` — thumbnail rail + hero plate + backdrop + scan + chips. Owns the uncropped presentation.
- `BuyConsole({ product, ...buy state })` — status, title, price, color, stepper, Add, total, quiet actions. The above-the-fold decision surface.
- `DetailTabs({ product, economics, selectedSets, setPrice, perPiece, styleCode, showTerms... })` — the tab strip + panels (Details / Pack & sizing / Pricing / Trade terms).
- `AnimatedRupees`, `LedgerRow` — kept as-is.

`TradePlateDetail` becomes the orchestrator: holds shared state (`selectedSets`, `selectedColor`, `activeImageIndex`, `activeTab`, `added`), computes `economics`, and composes the three sub-components + the kept below-fold sections (mobile ticker, reviews, related).

Reused components stay untouched: `ReviewsSection`, `StockAlertForm`, `ResellerMarginEstimator`, `Navbar`, `Footer`, `MoqProgress` (if used). `page.tsx` (metadata + JSON-LD) unchanged.

## State

All in `TradePlateDetail` (unchanged semantics, plus one new):

- `selectedSets` (default `B2B_CONFIG.defaultLineSets`) — stepper, min `minimumStyleSets`.
- `selectedColor` (default `product.colors[0]`) — selecting a color also switches `activeImageIndex` to that color's image (existing `selectColor`).
- `activeImageIndex` — image stage.
- `activeTab` (**new**) — `"details" | "pack" | "pricing" | "terms"`, default `"details"`.
- `added` (optimistic, existing) — Add-to-order affordance.
- `showTerms` — **removed** (terms are now a tab, not a collapsible).

`economics` (`useMemo`) unchanged — synthetic cart line → `calculateGstBreakdown`, one source of truth with the cart.

## Motion (subtle & premium)

- One-shot registration scan on image load (kept).
- Image cross-fade + slight scale on change (kept).
- `AnimatedRupees` roll-up on total / ledger (kept).
- Sliding lime tab underline (`layoutId`), panel cross-fade (new, subtle).
- Reveal-on-scroll for below-fold sections (reuse existing `Reveal` component from home page for consistency).
- Buy micro-interactions (kept): Add button label/icon swap, swatch frame `layoutId`, MOQ meter fill.
- Everything gated on `useReducedMotion()` (already wired).

## Verification

- `bun run build` (or the project's build) must pass with no type errors.
- Manually drive the flow: load a product, confirm the full garment shows uncropped, switch images/colors, step sets, click Add to order (optimistic "Added"), switch all four tabs, confirm the live total updates and matches the Pricing ledger, confirm mobile sticky bar works. Confirm sold-out state (badge, disabled buy, stock-alert form).
- Toggle dark mode: confirm every surface/text/border themes correctly (semantic tokens only).

## Risk / what would change this

- **Tab split assumes** a wholesale buyer doesn't need pack-anatomy + full GST breakdown visible *simultaneously* while deciding. Mitigated: per-piece price, per-set price, and the incl-GST grand-total line all stay above the fold in the buy console. If buyers turn out to want the full breakdown always visible, promoting the ledger's grand-total row is already done; only the line-items move.
- **`object-contain` may letterbox** non-portrait images against the backdrop. The warm studio backdrop + `frame-luxe` rule are designed so the padding reads as intentional gallery matting, not empty space.
- Product data typically carries ~2 images and colors map to images by index — the thumbnail rail and color→image link already handle 1–4 images gracefully.
