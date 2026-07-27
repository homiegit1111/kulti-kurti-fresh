# THE MASTER BRIEF — RANGAT PEHNAWA, FIFTH ARCHITECTURE
## "THE WORKING SHEET" — synthesis of three directions, three verdicts, all vetoes honored

**Spine:** THE WORKING SHEET (aggregate winner: 254 vs 240 vs 222; first on the buyer and craft lenses).
**Grafts absorbed:** SetBlocks-everywhere + state-aware sticky CTA + recent-codes search + empty-catalog masthead + Profiler gate (Live Instrument); the Fold, Today's Plate, register-assignment lint, plate-rail colorway names, terminal-desk editorial rule, mobile PO bottom sheet, collections chiffon breath (Atelier Ledger); the fluid engine as a gated enhancement layer (craft-judge graft, overriding the Working Sheet's refusal — see §1.6).
**Vetoes honored (no vetoed element ships in any form):** no selection-driven GPU texture swaps (fluid runs ONE fixed texture); no difference-blend type over photography or canvas, ever; LedgerHead column labels always solid ink on paper; no full-bleed 100svh cloth blocks anywhere; no height-tween row expansion inside a live ledger; one canonical mount of the merged catalog (`/line` becomes a query-preserving redirect); no percent bars or savings-percent UI; no mobile masthead that delays the first ₹/pc past two screen heights; frontispiece blend assets optimizer-served or <300KB; **no edit to the bulk-order FAQPage JSON-LD** (verified honest as of this brief — see §2.1).

---

# CHAPTER 0 — HOW BUILDERS USE THIS DOCUMENT

- Each surface builder receives: **Chapter 1 (Foundation) + their own surface chapter + Chapter 2 (P0) + the file-ownership map (Chapter 9)**. Nothing else is needed; do not improvise beyond your chapter.
- Chapter 1's grammar rules are numbered. When your chapter and a grammar rule conflict, the grammar rule wins; flag the conflict in your PR description in one line.
- The MUST-NOT-TOUCH list (§1.1) is absolute. Breaking one item = the build is rejected.
- Acceptance tests are per-chapter and run by a reviewer verbatim. Write nothing you cannot pass.

---

# CHAPTER 1 — FOUNDATION (given to every builder)

## 1.1 MUST NOT TOUCH (verbatim, absolute)

1. Role-token system in `src/app/globals.css` (`--surface/--surface-2/--surface-inverse/--surface-hover/--content/--content-inverse/--line/--accent-lime/--accent-red/--on-accent`), the dark-mode flip block, and `--on-accent` pinned dark in both themes. Foundation builder may **add** utilities/variables (§1.2); nobody changes existing token values or names.
2. Theme boot contract (inline script in `src/app/layout.tsx`, `color-scheme` handling).
3. `B2B_CONFIG` / `GST_CONFIG` / `SIZE_RATIO_LABEL` (`src/lib/b2b/config.ts`), `getPerPiecePrice`, `getStyleCode` (`src/lib/b2b/style-code.ts`), `formatPrice` (`src/lib/commerce/catalog.ts`), `calculateWholesaleTotals`/`calculateLineTotal`/`calculateGstBreakdown` (`src/lib/b2b/pricing.ts`). Flat 0% tier stands — **no discount theatre**.
4. All five WhatsApp builders and their message text (`src/lib/b2b/whatsapp.ts` — `buildWholesaleWhatsAppMessage`, `buildCatalogRequestUrl`, `buildProductInquiryUrl`, `buildLinesheetInquiryUrl`, `buildPaymentHelpUrl`). The messages mention "Applied tier / Discount / Savings / Razorpay payment link" — that is the frozen channel contract; render it verbatim, never fork it.
5. Cart contract: `addItem` signature, merge key, sold-out hard block, GA4 events (`src/lib/cart-context.tsx`). Tray localStorage contract (`src/lib/line/tray-context.tsx`, `tray-handoff.ts`, key names).
6. Every server-rendered JSON-LD block on every route (structure AND — except where Chapter 2 explicitly says otherwise, which it does not — text).
7. `getProducts` server-fetch → client props with empty-not-mock timeout. Empty means empty state, never mock data.
8. URL param vocabularies: `?run/pp/cat/col/stock/drop/fresh/q/sort/d` on the line system. Route names (a route may become a redirect, its name survives). View-transition names `product-plate-${id}`.
9. Reduced-motion gate on every animation; no viewport zoom cap; honest-stock rule (`sold_out` or silence — never "in stock" affirmations).
10. Print CSS contract: `@page` A4, class-substring suppression of `[class*="fixed"],[class*="sticky"]` chrome.
11. CSP nonce plumbing. StickyMobileB2BCta route-awareness + 76px clearance. Single `h1` per page carrying the wholesale phrase.

## 1.2 globals.css — EXACT ADDITIONS (foundation builder only; append, never modify existing blocks)

```css
/* ── Fifth architecture: document utilities (additive only) ── */
:root {
  /* The six ledger tracks — single source for Fold, bulk table, print.
     Mirrors LEDGER_COLS in src/components/line/style-row.tsx:37 (do not drift). */
  --ledger-cols: 3.5rem minmax(0, 1fr) 7rem 7.5rem 3rem 10rem;
}

/* Tabular numerals everywhere a number appears. Apply to any container of prices/counts. */
.ledger { font-variant-numeric: tabular-nums; }

/* Entry head double rule — print convention: 2px over 1px, 4px apart. */
.entry-rule {
  border-top: 2px solid var(--content);
  position: relative;
}
.entry-rule::after {
  content: "";
  position: absolute;
  top: 4px; left: 0; right: 0;
  border-top: 1px solid var(--content);
}

/* Provisional (shortlisted) register. */
.rule-provisional { border-top: 1px dotted color-mix(in srgb, var(--line) 45%, transparent); }

/* The chop — saffron stamp, fires once on moqMet (JS adds .chop-fired). */
.chop {
  width: 1.25rem; height: 1.25rem;
  background: var(--accent-lime);
  display: inline-block;
}
@media (prefers-reduced-motion: no-preference) {
  .chop-fired { animation: chop-stamp 240ms cubic-bezier(0.16, 1, 0.3, 1) 1 both; }
  @keyframes chop-stamp {
    from { transform: scale(1.06); opacity: 0; }
    to   { transform: scale(1); opacity: 1; }
  }
}

/* Loading register: a scan line over a ghost ledger (replaces animate-pulse). */
@media (prefers-reduced-motion: no-preference) {
  @keyframes ledger-scan {
    from { transform: translateY(-100%); }
    to   { transform: translateY(100%); }
  }
  .ledger-scan { animation: ledger-scan 1.6s linear infinite; }
}

/* Dark-mode plate law: every photographic plate is a mounted plate, not a glowing rectangle. */
.plate-frame { border: 1px solid color-mix(in srgb, var(--line) 25%, transparent); }
```

Nothing else is added. No new color tokens. No hardcoded hexes anywhere in any new/modified component (the `#0a0a0f`/`#111118` in the current heroes die with the heroes).

## 1.3 TYPE SCALE (exact; no per-component `clamp()` invention)

| Register | Spec | Where |
|---|---|---|
| MASTHEAD (h1) | Inter 900, `clamp(2.75rem, 6vw, 5.5rem)`, uppercase, tracking −0.04em, lh 0.95 | one per route, the h1 |
| COLOPHON DISPLAY | Inter 900, `clamp(2rem, 4vw, 3.5rem)` | the single ink colophon entry |
| ENTRY HEAD | Inter 800, 10px, tracking 0.22em, uppercase | entry head lines |
| MICROLABEL | Inter 800, 8–10px, tracking 0.16–0.28em, uppercase, **names a real field only** (SET RATE, PER PC, PACK, STYLE №) | labels |
| BODY | Inter 400/500, 14px/21 | prose |
| LEDGER | Inter 400–700, 13px/16, `.ledger` (tabular-nums) mandatory | all tabular rows |
| CODE | existing `font-mono` stack, 11–12px | style codes, entire PO pane |
| SERIF ACCENT | Playfair Display italic 500, 15–17px, lowercase | **three placements only**: (a) one optional plate-caption note ≤8 words, (b) the frontispiece/letterhead season line, (c) lookbook pull quotes |

**Dead:** all `-webkit-text-stroke` outline type; all 5–17vw clamp headlines; Playfair in h1s/buttons/ledger rows/ghost letters; any numeral outside `formatPrice`/`getPerPiecePrice`.

## 1.4 COMPOSITION GRAMMAR (numbered law; cite rule numbers in PR descriptions)

**R0 — REGISTER ASSIGNMENT (mechanical lint, from Atelier Ledger).** Before laying out any block, classify it: (a) INSTRUMENT if it renders any value from the single-source math (`formatPrice`/`getPerPiecePrice`/`getStyleCode`/`B2B_CONFIG`/`GST_CONFIG`) or any tray/cart-mutating control — instrument blocks get zero entrance animation and zero decoration; (b) PLATE if it renders a garment image at >320px rendered height. A block qualifying as both is illegal — split it at the entry rule. Reviewers apply this test to every section.

**R1 — THE SHEET.** Every route is one continuous paper document: single `bg-surface` field, `max-w-[1400px]` centered, outer margins 20/40/64px (mobile/tablet/desktop). No alternating full-bleed color bands. No 100svh stages, anywhere, ever (stricter than the veto — this is the spine's law).

**R2 — THE SPINE/FOLIO RAIL.** At `lg+`, a fixed 72px folio rail runs down the left of the text block behind a full-height `1px border-line/25` rule. It carries only real registers: entry letter (A, B, C…) and the entry's true count in tabular-nums. Below `lg` it collapses into the inline entry head.

**R3 — THE GRID.** 12 columns / 24px gutters inside the text block; content aligns to columns; nothing centers. Exactly two body forms:
- **LEDGER** — full-width tabular rows on the `LEDGER_COLS` template (`src/components/line/style-row.tsx:37-38`), 1px-ruled, `py-3`.
- **PLATE** — a 4:5 or 3:4 image spanning 4–7 columns, top edge flush to its entry rule, `.plate-frame`, caption block in 2–3 adjacent columns set at the plate's top. Caption grammar, fixed order: mono style code / title / pack fact (`set of 4 · S/M/L/XL`) / rate line (₹set · ₹/pc via `formatPrice` + `getPerPiecePrice`) / one optional Playfair-italic note ≤8 words.
A section that is neither LEDGER nor PLATE does not exist.

**R4 — THE ENTRY.** Fixed anatomy: (a) 96–128px clear paper above → (b) `.entry-rule` double rule → (c) entry head line: entry letter · name at ENTRY HEAD spec · real count tabular · right-aligned action link → (d) body in LEDGER or PLATE form → (e) closing 1px rule.

**R5 — GENEROSITY RATION.** Whitespace is legal in exactly three slots: above entry heads, one empty column adjacent to a plate, the frontispiece. Ledgers get none. Airy ledgers and cramped plates are both defects.

**R6 — THE MARGIN BREAK.** At most one plate per page may extend through the text-block edge into the outer margin. No other grid violation anywhere.

**R7 — RUNNING CHROME.** Running head (the h-9 banner slot, re-typeset as static B2B_CONFIG facts) and running footer (desktop: fixed 1px-ruled base rail — trade facts at rest, live `TrayTotals` once `committedCount > 0`; mobile: `StickyMobileB2BCta` contract restyled, 76px clearance kept). Both use Tailwind `fixed`/`sticky` classes so the print contract's class-substring suppression removes them from every printed sheet automatically.

**R8 — HIERARCHY BY RULE-WEIGHT, NOT SIZE.** Double rule = entry; 1px = row/plate frame; 1px dotted = provisional (shortlisted). Display type ≤2× per route: masthead + colophon.

**R9 — INK RATION.** At most one `surface-inverse` entry per route — the closing colophon. Plates are forbidden inside the colophon.

**R10 — THE STAMP.** Saffron appears only as buyer-caused state (committed-row wash, MOQ tell, focus rings, filled SetBlocks) and as the chop (`.chop`) — once on the printed letterhead, once in-app at the moment `moqMet` flips true. Saffron fields, bands, decorative accents: forbidden.

**R11 — THE FRONTISPIECE EXCEPTION, licensed exactly twice site-wide:** the homepage masthead (§3) and the collections-index masthead (§8). The only places display type may exceed the scale cap and blend-mode composition occurs.

**R12 — THE FOLD (Seam, from Atelier Ledger; static only).** Where the homepage frontispiece plate meets Entry A, the plate's final 96px are sliced into six vertical cells whose widths are `grid-template-columns: var(--ledger-cols)` (one shared background image via fixed `background-position` offsets), each cell vertically offset in 8px steps — the photograph visibly enters the machine. **Static offsets, no scroll scrub. No blend-mode text over the slices.** The real `LedgerHead` (solid ink on paper — buyer-veto law) renders immediately below as Entry A's column heads. Fallback if per-image contrast QA fails: plain 1px hairline + LedgerHead.

## 1.5 COLOR REGISTERS

- **Paper** is the site (`--surface`/`--content`/`--line`). **Ink** (`--surface-inverse`) is rationed per R9. **Saffron** (`--accent-lime`) per R10; `--on-accent` stays pinned dark. **Vermilion** (`--accent-red`) is negative-only: sold_out, validation errors, compare marks. The PDP MOQ meter's red-on-neutral default is repaired to ink→saffron (§5).
- **Dark mode:** role-token flip untouched. Two laws: every photographic plate carries `.plate-frame` (both themes; the class is theme-neutral, the law is about dark); every multiply-blend composition ships a declared `.dark` variant fallback — knockout Inter-black type over the plain framed plate — via CSS `dark:` variants, never JS.
- **Print:** the co-located line-sheet print CSS is the model; its stale pins at `src/app/line-sheet/page.tsx:68-69` (`#b8d900`/`#c02040`) are corrected to `#E9A319`/`#C03A2B` (the live light-theme saffron/vermilion — print is always paper, hardcoding is allowed there).

## 1.6 MOTION DOCTRINE + FALLBACK LADDER

**Doctrine: a document does not perform; it updates.**

- **ENTRANCE POLICY — nothing animates on entrance, site-wide.** The `style-row.tsx:15-17` law is the constitution. Every `fade-up-24px`, `whileInView`, clip-reveal, masked-rise, and `AnimatePresence` entrance across all surfaces is deleted. Filter changes re-render rows instantly.
- **STATE MOTION (the only motion):** committed-row saffron wash inks in at 200ms ease-out; totals tick via the existing `AnimatedRupees` (reduced-motion snaps); SetBlocks fill by background/opacity swap in 150ms (never width tweens — discrete units don't slide); the PO pane's changed line re-inks (opacity only, 160ms); the chop fires once (`.chop-fired`, 240ms `cubic-bezier(0.16,1,0.3,1)`, never repeats, never pulses).
- **NAVIGATION:** `product-plate-${id}` view-transition morph survives everywhere a plate links to its PDP; the sanitization regexes in `src/app/shop/[handle]/client-page.tsx` and `src/components/line/style-card.tsx` are unified to the client-page pattern (lineShop builder owns this).
- **HOVER:** rules darken, titles underline; at ledger density on `pointer:fine`, a fixed-position 4:5 peek plate follows the hovered row (transform-only, reduced-motion gated). Images never scale on hover, never take scrims.
- **THE ONE LIVE SPECTACLE (amendment to the spine's refusal, per craft-judge graft):** the homepage frontispiece plate mounts `useFluidDistortion` (`src/components/sections/use-fluid-distortion.ts`) as a pure enhancement layer. Constraints, absolute:
  1. **One fixed texture** — the server-chosen frontispiece image. No selection, hover, or scroll may ever swap the GPU texture (veto).
  2. The hook's own ladder is kept verbatim: WebGL2 + `EXT_color_buffer_float` + `pointer:fine` + no `prefers-reduced-motion` (lines 125–135). Any gate fails → the static `priority` `next/Image` **is** the block and is the LCP in every branch.
  3. Add: `IntersectionObserver` pauses the rAF loop offscreen and on `document.visibilityState === "hidden"`.
  4. The canvas crossfades over the static Image only after its first frame renders (the hook's `ready` state).
  5. This is the **only** rAF loop, the only canvas, the only WebGL on the site. No second spectacle exists anywhere.
- **THE STATIC SPECTACLES:** the two frontispieces' chiffon compositions (Inter-black type under `sheer_flowing_dupatta.png` / `premium_dupatta_v2.png` multiply-blended into paper, `botanical_shadow.png` as a light wash translated ≤4% by `useScroll`, transform-only, reduced-motion gated). Pure CSS blend — survives JS-off. All blend-layer images served through `next/image` (fill + `sizes`) or pre-compressed <300KB (veto — the raw PNGs are 560–680KB).
- **DELETED:** `public/videos/background.mp4` (32.6MB) and its consumers `hero-cinematic.tsx`, `film-showcase.tsx`. No video anywhere.
- **PERF GATE:** Lighthouse mobile ≥96 on `/`, `/shop`, `/shop/[handle]` is a hard floor. Any new shared-state interaction (homepage tray writes, SetBlocks in nav) passes a React Profiler check: only designated consumers subscribe; ledger rows never re-render on unrelated state; pick/commit interactions <16ms.

## 1.7 SHARED NEW COMPONENTS (foundation builder creates; exact paths; surface builders import, never modify)

| File | Exports | Spec |
|---|---|---|
| `src/components/document/entry.tsx` | `EntryHead`, `EntryClose` | R4 anatomy: `.entry-rule`, head line (letter · name · tabular count · action link slot), closing 1px rule. Folio-rail letter rendering at `lg+`. |
| `src/components/document/terms-rule.tsx` | `TermsRule` | Single full-width hairline strip of config-derived facts as a ruled `<dl>`: `MOQ {B2B_CONFIG.minimumOrderSets} sets · set of {setSize} · {SIZE_RATIO_LABEL} · {GST_CONFIG.note short form}` with 1px saffron squares as separators (the line-sheet letterhead grammar). Replaces every icon-chip strip site-wide. |
| `src/components/b2b/set-blocks.tsx` | `SetBlocks({ size?: "sm" \| "md" })` | Four discrete square blocks fed **only** by `useTray()` totals (`totalSets`, `moqMet`, `setsToMoq`): empty = 1px `--line` outline, filled = `--accent-lime`, never vermilion in any non-error state, tabular caption `"{totalSets} of 4 sets · cart-wide"`. `sm` = 4×6px nav mini-gauge. 150ms background/opacity fill. This is the site's ONLY meter; replaces `src/components/b2b/moq-progress.tsx` everywhere. |
| `src/components/document/po-pane.tsx` | `POPane({ items, buyer, sticky? })` | Renders the exact string of `buildWholesaleWhatsAppMessage(items, buyer)` as a typeset document: mono 12/18 on a 1px-ruled sheet, letterhead rule, `.chop` (adds `.chop-fired` when `moqMet` flips), changed line re-inks 160ms opacity. `pane.innerText` must equal the builder output byte-for-byte (whitespace preserved via `white-space: pre-wrap`). Footer button = `buildWholesaleWhatsAppUrl(items, buyer)`. Below `lg`: renders as a bottom sheet trigger ("Review your PO") opening above the 76px sticky-CTA clearance. |
| `src/components/document/chop-stamp.tsx` | `ChopStamp` | Wraps `.chop`/`.chop-fired` with a `moqMet` edge-trigger (fires once per false→true transition, session-scoped). |
| `src/components/document/fold-seam.tsx` | `FoldSeam({ imageSrc })` | R12: six-cell grid on `var(--ledger-cols)`, shared background, 8px stepped offsets, static. Below `md`: renders a plain 1px rule (the slice composition is desktop-only). |
| `src/components/document/print-sheet-styles.tsx` | `PrintSheetStyles({ preparedFor? })` | The A4 print contract ported from `src/app/line-sheet/page.tsx:49-127` into a reusable co-located `<style>` emitter: `@page 14mm A4`, palette force with **corrected** pins (§1.5), chrome suppression, break rules, letterhead (masthead, season line, TermsRule squares, optional `Prepared for {business_name} · {city}`, CSS-counter `Sheet N`). Consumed by `/shop` (ledger density) and `/line-sheet`. |
| `src/lib/line/season.ts` | `seasonLabel(date)` | Hoisted verbatim from `src/app/line-sheet/page.tsx:25-33`; line-sheet page re-imports it (funnel builder swaps the import). |

## 1.8 DEVICE RATION TABLE (each surviving device, the ONE place it is permitted)

| Device | Verdict | Sole permitted surface |
|---|---|---|
| Ghost-letter watermark | **DIES** — all instances (command-center "R", b2b-hero "R", desk-math "%", triptych "Sets", footer/404/error/cart/loading giants) | nowhere; the folio rail's real counts do its job |
| Serif-italic-in-black-sans headline formula | **DIES** as formula | Playfair italic survives only in the three §1.3 placements — never inside an h1 |
| `padStart(2,'0')` numbering | **DIES** as decoration | (a) PDP plate rail 01–04 (buyers say "plate 2" aloud; gains colorway names), (b) printed sheet counters, (c) search-result indices — counts that are real |
| Scrim + `scale-105` image hover | **DIES** everywhere | nowhere; hover = rule-darkening / underline / ledger peek plate |
| Icon-chip strips | **DIE** (PDP trust grid, `wholesale-trust-bar.tsx`, contact tiles) | nowhere; `TermsRule` takes every slot. Surviving icons: functional glyphs only (WhatsApp, stepper, check, compare) |
| "Not X. Y." copy tic | **DIES** | nowhere |
| Multiply-blend chiffon composition | rationed | homepage frontispiece + collections-index masthead (R11), each with declared `.dark` fallback |
| Fluid distortion (WebGL) | rationed | homepage frontispiece plate only, one fixed texture, full ladder |
| The chop stamp | rationed | printed letterhead + the one in-app `moqMet` firing |
| The Fold | rationed | homepage frontispiece → Entry A seam only |

## 1.9 COPY VOICE

The voice of a merchant's document: declarative, priced, addressed. Facts stated once in the right register, never re-asserted as marketing. Sentences carry numbers computed from config and cart, never adjectives about numbers. Headlines name the thing (The line. Plates. Chapters. Bulk desk.). Microlabels name real fields. The one lyric register is the Playfair caption note, ≤8 words, lowercase. CTAs are verbs of trade: *Open the line, Commit 4, Print this sheet, Send the order.* WhatsApp copy stays in the existing Namaste contract untouched. **Forbidden:** "Not X. Y.", keyword-list headlines, infra vocabulary ("Razorpay-ready", "MOQ pending", "once payment keys are configured"), self-narration, any claim the config or cart cannot compute.

---

# CHAPTER 2 — P0 CORRECTNESS (verified against the repo 2026-07-26; funnel builder + foundation builder execute)

## 2.1 Bulk-order "discount lie" — status: ALREADY FIXED server-side; client leaks remain

**Verified:** `src/app/bulk-order/page.tsx` metadata (line 9), OG (line 23), FAQ answers (lines 42–55), Service LD (line 67) all state **flat wholesale rates, no volume ladder**. Per the craft-judge veto, the server-rendered FAQPage JSON-LD is **not edited** — the premise for overriding its protection is stale.

**The real offenders (funnel builder kills):**
- `src/app/bulk-order/bulk-order-client.tsx:132` — `totals.appliedTier?.label || "MOQ pending"` readout → replace the tier/label slot with `blendedPerPiece` from tray/pricing totals ("blended ₹{n}/pc").
- `bulk-order-client.tsx:133-135` — the `{totals.discountPercent}% savings` span → delete outright (never render a savings-percent UI; veto).
- `bulk-order-client.tsx:286-289` — "Checkout is Razorpay-ready once payment keys are configured" → delete; replace with "WhatsApp confirms stock fastest. GST invoice at dispatch."
- `src/components/b2b/wholesale-trust-bar.tsx` — dies whole (its line 17 "Razorpay ready" chip with it).
- Leave untouched: `src/app/checkout/page.tsx` Razorpay integration code (working payment path, not copy); the WhatsApp builders' "Razorpay payment link" lines (frozen contract §1.1.4); `src/app/contact/page.tsx:135,229` payment-help copy (buyer-facing service info, not infra leak).

## 2.2 Instagram purge — verified by opening every file in `public/images/instagram/`

- **`DaaE1TSyb22.jpg` — CONFIRMED cat-meme brand card** (black fabric, script "Pehnawa / ART OF RANGAT" with two cat-meme cutouts). Purge: delete the file; remove entries `DaaE1TSyb22` and `DaaE1TSyb22-b` (captioned, falsely, "Designer cotton kurta") from `src/lib/instagram/posts.ts:36-41,73-78`.
- **`DXryvhjknSv.jpg` — competitor content by its own caption**: `posts.ts:46` captions it "Soma designs · rayon" — another brand's product named in Rangat's feed. Purge file + entry (`posts.ts:42-47`).
- `DXPdU4jElhY.jpg` shows a third-party garment tag on the fabric roll ("Grace in every stitch" caption) — flag to the founder as probable competitor sourcing; keep only if ownership is confirmed, else purge file + entries `DXPdU4jElhY` and `DXPdU4jElhY-b`.
- `DZj8uunkqgH.jpg`, `DaYdTMtktlz.jpg`: professional garment shots, no visible third-party marks — keep, pending founder confirmation.
- After the purge, drop the "-b" duplicate-tile scheme (`posts.ts:60-79`) — render the honest count of confirmed posts; a 3-up rail beats a padded 8-up lie.
- Owner: **collections builder** (the IG rail lives on lookbook/collections surfaces); foundation builder deletes the image files in the closing sweep.

## 2.3 Other P0s carried in surface chapters

Broken crawlable homepage h1 (= "Whole") → §3. Print-CSS stale pins → §1.5/§1.7. Mock related rail on PDP → §5. Collections mock-flash double-fetch → §8. Phantom "Sarees/Lehengas" search chips → §4.

---

# CHAPTER 3 — SURFACE: HOMEPAGE (builder H)

**h1 (the only one, pure Inter, crawlable as one phrase):** `Wholesale kurtis for the trade. MOQ 4 sets, priced to move.`

## 3.1 Server contract (kept)

`src/app/page.tsx` keeps: `getProducts(12)`, `buildProductItemListLd` (positions 1-based, matching rendered ledger row order exactly), `buildCatalogRequestUrl()`, Navbar/Footer/StickyMobileB2BCta. Delete the stale "fourth architecture" doc comment. Wrap the ledger entry in the existing `TrayProvider` (import from `src/lib/line/tray-context.tsx`) so homepage commits write the same localStorage tray as `/shop`.

## 3.2 First viewport, element by element (1440×900 reference)

1. Running head (h-9, `TermsRule` facts — chrome builder owns the component, homepage just inherits).
2. Navbar (h-16, chrome builder).
3. **FRONTISPIECE** (R11 license #1) — total height ≤ `72svh` desktop:
   - Left 8 columns: wordmark line (MICROLABEL "RANGAT PEHNAWA — WHOLESALE LINE BOOK"), then the h1 at MASTHEAD scale, with `sheer_flowing_dupatta.png` (multiply, absolutely positioned across the headline's upper third, `next/image` fill) draping the letterforms, and `botanical_shadow.png` as the scroll wash (≤4% translateY, transform-only, reduced-motion gated). `dark:` variant drops both blend layers (knockout type on plain paper — declared, not left to chance).
   - Right 4 columns: Playfair-italic issue line (`{seasonLabel(new Date())}, issued Bengaluru` via `src/lib/line/season.ts`), `TermsRule` block, two CTAs only — `WhatsApp catalog` (`buildCatalogRequestUrl`, `target="_blank" rel="noopener"`) and `Open the line →` (`/shop`).
   - Below the headline block, spanning columns 1–12: **the frontispiece plate** — `products[0].image` in `.plate-frame`, 21:9 crop, ~320px tall, with the full R3 caption grammar bottom-left. On `pointer:fine` + WebGL2 + no-reduced-motion, the fluid canvas (`useFluidDistortion(products[0].image)`) crossfades over it per §1.6 — **one fixed texture, no swaps**. The static `next/image` is `priority` and the LCP in every branch.
   - The plate's bottom edge is the **FoldSeam** (R12) feeding into…
4. **ENTRY A — "The line"** — double rule, entry head (`A · The line · {products.length} styles · Open the full line →` linking `/shop`), then `LedgerHead` (solid ink) + the first **8** `StyleRow`s built via `toStyleLine` from `src/lib/line/contract.ts`, tray-wired, with working `SetStepper` and commit. At 1440×900 the first 2–3 rows are visible above the fold.

## 3.3 Section order (complete)

Frontispiece → **A** The line (8 StyleRows) → **B** Plates (three plates on the grid: lead plate = **Today's Plate**, chosen by `dayOfYear % products.length` into `getProducts(12)` — deterministic, honest, annotated "Today's plate — {styleCode}"; second plate 4 cols with the one margin break (R6); third `collection-2pcs.jpg` 3:4, 4 cols; each with full caption grammar from live product data) → **C** Chapters (collections as ruled LEDGER rows: title, real `itemCount` tabular, one 4:5 thumb, link) → **D** How ordering works (typeset sample PO excerpt — real `buildWholesaleWhatsAppMessage` output for a hardcoded 2-line example cart, rendered via `POPane` styling — beside four ruled steps + WhatsApp CTA) → **Colophon** (the one ink entry, R9: contact facts, address, hours; no plates).

## 3.4 Files

- **Kill (delete files):** `src/components/sections/garment-signal-hero.tsx`, `homepage-command-center.tsx`, `hero-fluid.tsx` (mine its knockout composition first if useful), `hero-masthead.tsx`, `product-grid.tsx`, `collections-band.tsx`.
- **Create:** `src/components/sections/frontispiece.tsx` (client — fluid + blend layers), `src/components/sections/home-entries.tsx` (server-compatible entry compositions; the ledger sub-tree is client for tray wiring).
- **Reuse unchanged:** `StyleRow`/`LedgerHead`/`SetStepper` (`src/components/line/`), `TrayProvider`, `EntryHead`/`TermsRule`/`FoldSeam`/`POPane` (foundation).
- **Mutate:** `src/app/page.tsx` only.

## 3.5 Mobile

Frontispiece stacks: headline (blend kept — pure CSS), issue line, terms, CTAs, plate static (fluid excluded by `pointer:fine`), **compact enough that at least one real ₹/pc (first ledger row or plate caption) is visible within two screen heights** (buyer veto — acceptance-tested). FoldSeam renders as plain rule below `md`. StyleRow's built-in condensed layout carries Entry A. 76px sticky-CTA clearance kept. Empty-catalog contract: with `products.length === 0`, the frontispiece plate is replaced by a `TermsRule` band + WhatsApp catalog CTA, and Entry A renders its head + one row: "Line updating — WhatsApp for today's sheet."

## 3.6 Acceptance tests

1. View source: exactly one `<h1>`, containing "wholesale kurtis"; the strings "WHOLE" and "SALE" as split fragments absent.
2. JS disabled: masthead + first ledger rows render with real ₹ set and /pc figures as server HTML; the chiffon composition still renders.
3. `prefers-reduced-motion`: no `<canvas>` mounts; zero transform animations; view transitions disabled per the globals gate.
4. WebGL2 + fine pointer: canvas crossfades over the same `priority` image; DevTools performance: rAF loop stops when the plate scrolls offscreen and when the tab is hidden.
5. Mobile 375×812: a real ₹/pc figure visible within 2 × 812px of scroll.
6. Commit a set from a homepage row → `/shop` tray button count and the row's committed state agree (single localStorage tray); React Profiler: the commit re-renders only the row + tray consumers.
7. ItemList JSON-LD positions match rendered ledger row order 1-based.
8. Lighthouse mobile ≥96; LCP is the frontispiece plate `<img>` in both branches; `background.mp4` requested on no route; no new asset >300KB.
9. grep the built page for `#0a0a0f`, `#111118`, `animate-pulse`, `scale-105`, `"Not a "` → zero.

---

# CHAPTER 4 — SURFACE: CHROME (builder C)

## 4.1 Spec

- **One top hairline system:** `src/components/ui/scroll-progress.tsx`, `src/components/layout/theme-progress-bar.tsx`, and the navbar border consolidate into a single 2px track component `src/components/layout/top-rail.tsx`: scroll position at rest, theme sweep on toggle (reading `getComputedStyle(document.documentElement).getPropertyValue("--surface")` — kills the stale hex flash; the fake timer-NProgress behavior dies), route indicator during view transitions. Delete the two superseded files after swap.
- **Running head:** the h-9 banner slot becomes `TermsRule` content (static, no marquee), compressing on scroll-down and returning on scroll-up intent using the existing rAF listener; PDP suppression kept.
- **Brand mark:** typographic wordmark becomes the sole mark in chrome; the raster `BrandLogo` and the footer saffron "R" chip retire from chrome (files and `layout.tsx` JSON-LD logo reference untouched per §1.1).
- **Nav:** links + search + `TrayButton` (hydration placeholder intact) + `SetBlocks size="sm"` mini-gauge beside it. `view-transition-name` on wordmark, tray button, top rail so chrome holds still across navigations.
- **Running footer (desktop, new):** fixed base rail, 1px top rule; trade facts at rest; once `committedCount > 0`, live `TrayTotals`: `"{committedCount} styles · {totalSets} sets · {formatPrice(subtotal)} · blended ₹{blendedPerPiece}/pc · {setsToMoq} sets to MOQ"` with saffron tell on `moqMet`; Tailwind `fixed` class (print suppression); suppressed on `/checkout|/cart|/bulk-order` like the mobile CTA; z-index below navbar.
- **StickyMobileB2BCta** (`src/components/b2b/sticky-mobile-b2b-cta.tsx`): keeps route-awareness + 76px clearance; gains `pb-safe` and a state-aware label from tray totals: `"{setsToMoq} set(s) to MOQ"` / `"MOQ met — build order"`.
- **Search** (`src/components/ui/search-dialog.tsx`): keep the ledger-style results; fix phantom "Sarees/Lehengas" chips to catalog-derived categories; add "Recent codes" from localStorage (key `rangat-recent-codes`, max 6, mono `CodeChip` rendering); results rows gain steppers where tray context is available; ⌘K kept; decorative rotated squares/dashed circles die.
- **CartAddedToast** (`src/components/layout/cart-added-toast.tsx`): re-typeset as an order-slip row (mono code, ruled columns) on role tokens; legacy charcoal aliases purged.
- **404** (`src/app/not-found.tsx`): fuzzy-match the path against style codes; render "Did you mean RP-…" as ledger rows. Ghost giant dies.
- **Loading** (`src/app/loading.tsx`, `src/app/shop/loading.tsx`): ghost ledger + `.ledger-scan` sweep; no `animate-pulse`.
- **Footer** (`src/components/layout/footer.tsx`): paper letterhead — TermsRule, link columns on the grid, wordmark only; ghost "Rangat" giant, "R" chip, dead social placeholders die.
- **Mobile sheet** (`src/components/ui/sheet.tsx` consumers): dead `animationDelay` stagger deleted (not implemented); decorative tile numbering dies.

## 4.2 Acceptance tests

1. Exactly one element paints the top edge; toggling theme sweeps in the computed `--surface` value (no `#f3ebe0`/`#0e0f11` flash).
2. Add 3 sets anywhere: nav mini-gauge fills 3 of 4; mobile CTA reads "1 set to MOQ"; desktop running footer totals equal `TrayTotals`; `window.print()` on any page shows neither rail.
3. Search: chips match live catalog categories; after visiting two PDPs, "Recent codes" lists their style codes.
4. Navigate any plate → PDP: wordmark/tray/top-rail visibly persist (no flicker) via view-transition names; reduced-motion → no transition animates.
5. grep chrome components for `animate-pulse`, ghost-letter vw type, `padStart(2` → zero.

---

# CHAPTER 5 — SURFACE: LINE+SHOP MERGE (builder L) — highest commercial leverage

**h1:** `Wholesale kurti line book` (D2/masthead scale per R8 — this is a desk route: letterhead, not poster).

## 5.1 The merge

- Mount the `/line` system inside `/shop`'s URL and SEO shell: `src/app/shop/page.tsx` keeps its four server JSON-LD blocks, canonical, `faqs.ts` single-sourcing, SSR product flow — and renders the line client (`CommandBar`, `FacetRail`, `LineResults` all three densities, tray actions, density persistence, trade-buyer Ledger promotion) as its body.
- **One canonical mount (veto):** move the client to `src/app/shop/shop-client.tsx` (replacing its current contents wholesale) importing from `src/components/line/*`; `src/app/line/page.tsx` becomes a **308 redirect to `/shop` preserving the full query string** (route name survives; `line-client.tsx` deleted after parity).
- **Param shims, server-side in `/shop`'s page:** `?color→col`, `?price→pp` (`?cat` passes through) so legacy shared WhatsApp links land filtered.
- **Kill:** current shop-client filter logic, `LivingProductCard` grid usage here, marquee, "The/Kurti/Index" stroked masthead, `AnimatePresence` filter scatter, `src/app/shop/loading.tsx` masonry (replace per §4 loading register).

## 5.2 Composition

Letterhead entry (R4): h1 + real unfiltered style count + season line (`seasonLabel`) + `TermsRule` (replacing the marquee) → sticky `CommandBar` (gains **"Print this sheet"** action) → `FacetRail` + results → FAQ re-typeset as ruled numbered LEDGER entries (same `SHOP_FAQS` source; FAQPage LD sync intact) → colophon. Ledger hover peek plate at `pointer:fine`. Order-aware running footer (chrome) surfaces here first.

## 5.3 Print (Working Sheet signature, grafted spec)

Attach `PrintSheetStyles` (foundation, §1.7): at ledger density, `window.print()` on any filtered URL renders A4 letterhead (masthead, season label, terms strip with saffron squares, `Prepared for {business_name} · {city}` when the wholesale profile exists, CSS-counter `Sheet N`) followed by only the filtered rows: code / title / size run / ₹set / ₹/pc. Chrome suppressed by the class-substring contract.

## 5.4 Compare

Ship it or kill the affordance — no no-op controls. Spec if shipped: 4-column hairline overlay table (code / per-pc / set / size-run / GST band) from existing `compareIds`, vermilion register for the compare marks only.

## 5.5 Details

Unify the view-transition sanitization regex to the `client-page.tsx:540` pattern in `src/components/line/style-card.tsx:63`. Filter changes swap rows with no animation. All localStorage keys, URL vocabulary, honest-stock rule, tray-handoff invariants: untouched.

## 5.6 Acceptance tests

1. `/shop` retains all four server-rendered JSON-LD blocks + canonical; `/shop?color=Blue&price=1` lands with equivalent `col/pp` facets applied; `/line?run=…` 308s to `/shop?run=…`.
2. Repo contains exactly one mount of the line client (grep `LineResults` importers → one route file).
3. Filtered ledger URL + `window.print()`: A4, letterhead, sheet counters, only filtered styles, zero fixed/sticky chrome, printed accent resolves to `#E9A319`.
4. FAQ text on page === FAQPage LD text (single source).
5. No `AnimatePresence` on filter change; rows re-render instantly; Lighthouse mobile ≥96.
6. Compare control either opens the overlay table or does not exist.

---

# CHAPTER 6 — SURFACE: PDP (builder P) — `src/app/shop/[handle]/client-page.tsx`

**h1:** product title (existing, untouched).

## 6.1 The style dossier — one continuous proforma

- **Layout kept:** 12-col split — 7-col sticky plate stage, 5-col console; `product-plate-${id}` morph kept.
- **Stage:** `object-contain` plate in `.plate-frame` (frame-luxe double-rule dies; the undefined `product-stage-glow` class — define as token-driven paper matting or delete the comment: no undelivered intentions); plate rail keeps 01–04 numbers and gains colorway names from the existing `selectColor` color→index map (device ration §1.8); tap-to-zoom pan for fabric inspection (transform-only, reduced-motion gated); pinch-zoom invariant untouched.
- **Console, top to bottom (tabs dissolve on desktop; accordion on mobile):** title + per-piece hero price (per-pc leads — `price-block.tsx` inversion is law) → one-line margin note "at 1.45× resale ≈ ₹{n} margin/pc" expanding to the existing estimator (`reseller-margin-estimator.tsx` reskinned, icon-box killed) → **SetBlocks** (foundation) replacing the red-on-neutral MOQ bar — never vermilion at rest, cart-wide semantics stated ("mix any styles"); each committed set stacks a visible S/M/L/XL ratio row from `B2B_CONFIG.sizeRatio` → `SetStepper` + "Add to order" + WhatsApp inquiry (`buildProductInquiryUrl`) promoted from tab burial to persistent secondary CTA → GST ledger (`calculateGstBreakdown`, same synthetic-CartItem source) as ruled rows → `TermsRule` replacing the 3-icon trust grid.
- **Reviews** (`src/components/product/reviews-section.tsx`): accent-red ★ glyphs → ink tally marks (vermilion is negative-only); photo strip leads; legacy `text-charcoal` aliases → role tokens; sign-in gate kept.
- **Related rail:** `MOCK_PRODUCTS` bypass dies — fetch real siblings server-side (`getProducts` filtered by style-code category prefix: "Same run — RP-COTTON-\*"), pass as props; render nothing when empty.
- **Untouched:** JSON-LD, OG contract, cart `addItem` signature + "Set" size key + GA4, sold-out `StockAlertForm` swap, mobile ticker bar (gains `pb-safe`).

## 6.2 Acceptance tests

1. Empty cart: MOQ indicator = 4 unfilled ink blocks, no accent-red, no percent bar; adding sets in another tab fills blocks after storage sync.
2. grep: `moq-progress` has zero importers on this route; no `#`-hex in modified files; no `padStart(2` outside the plate rail.
3. Plate rail entries read "01 · Ivory"-style (number + colorway name); clicking swaps image via existing `selectColor` path.
4. Related rail shows only live catalog products sharing the category prefix; with none, the section is absent from the DOM.
5. Reduced motion: zoom/pan gestures snap; view transition disabled.

---

# CHAPTER 7 — SURFACE: B2B FUNNEL (builder F) — `/bulk-order`, `/line-sheet`, `/contact`, `/account`, `/order-confirmation`, `/cart`

**h1 (`/bulk-order`):** `Bulk kurti orders at wholesale rates`

## 7.1 Bulk desk = the PO room (`src/app/bulk-order/bulk-order-client.tsx`)

- Header: entry anatomy, `TermsRule` replacing `WholesaleTrustBar` (delete `src/components/b2b/wholesale-trust-bar.tsx`); ghost "R" b2b-hero device dies (delete `src/components/sections/b2b-hero.tsx` if unreferenced after).
- Execute all of §2.1 (savings span, tier label → `blendedPerPiece`, Razorpay-ready copy).
- Sticky totals bar rebuilt: order value + GST estimate + blended ₹/pc + `SetBlocks`.
- Table keeps its wholesale bones; gains keyboard-first behavior: arrow-key row focus, digit-to-set-quantity, Enter to add; line totals tick via `AnimatedRupees`; search-input white-focus hardcode → tokens.
- Right rail: **`POPane`** (foundation), sticky at `lg`, fed by live cart + saved wholesale profile (`/api/wholesale-profile` → `WholesaleBuyerInfo` — wired at last); chop fires on `moqMet`; the pane's one button is the `wa.me` URL. Below `lg`: the pane's bottom-sheet mode above the 76px clearance.
- Same `POPane` mounts on `/cart` (secondary position).
- `MoqProgress` usages here and on `/cart`/`/checkout` swapped to `SetBlocks`; after all swaps, delete `src/components/b2b/moq-progress.tsx` (closing sweep confirms zero importers).

## 7.2 Line sheet (`src/app/line-sheet/page.tsx` — the craft benchmark; touch minimally)

Swap local `seasonLabel` for `src/lib/line/season.ts` import; correct print pins per §1.5 (lines 68–69); add `Prepared for {business_name} · {city}` letterhead line when profile exists + CSS-counter `Sheet N` (via adopting `PrintSheetStyles` if drop-in, else local edit). Nothing else changes.

## 7.3 Contact / account / order-confirmation

- **Contact:** icon tiles → label/value ruled ledger (order-confirmation's `DetailRow` pattern — the funnel's best component); every field gains `htmlFor`/`id`; wire `isValidWhatsappPhone`/`isValidGSTIN` (`src/lib/b2b/validation.ts`, currently unused) to on-blur validation, vermilion rail as the error register; POST contract untouched.
- **Account:** fake stat chips → real ledger rows (linesheet count, last PO date); "will be available" infra copy dies; saved profile feeds `buildWholesaleWhatsAppUrl` so repeat buyers get a pre-addressed PO.
- **Order-confirmation:** clearing invariants kept; pending state gains `buildPaymentHelpUrl`.

## 7.4 Acceptance tests

1. `/bulk-order`: change any stepper → `POPane.innerText` byte-equals `buildWholesaleWhatsAppMessage(items, buyer)` for the current cart; the CTA href's decoded `?text=` equals it.
2. Page source contains no "% savings" UI, no "MOQ pending", no "Razorpay-ready"; FAQPage LD unchanged from current repo state (diff-clean).
3. GSTIN field: invalid value on blur shows vermilion rail; valid clears it; form still posts.
4. Print `/line-sheet`: letterhead shows season + `Prepared for …` when profile exists; accent = `#E9A319`.
5. `moq-progress.tsx` deleted; grep zero importers; SetBlocks renders in bulk/cart/checkout.
6. Mobile `/bulk-order`: PO bottom sheet opens above the sticky CTA; 76px clearance intact.

---

# CHAPTER 8 — SURFACE: COLLECTIONS + LOOKBOOK (builder K)

**h1 (`/collections`):** `Wholesale kurti collections — the chapters`

## 8.1 Collections index (`src/app/collections/collections-index.tsx`)

- Masthead = R11 license #2 (this route's single breath): Inter-black display under `premium_dupatta_v2.png` multiply + botanical wash, ≤50% viewport height, declared `dark:` framed-plate fallback. The 28vw "C" watermark, scrim-zoom mosaic, and vermilion CTA band die.
- Body: collections as a ruled folio LEDGER list — each row: title, real `itemCount` from `getCollections` (tabular), category note; one 4:5 PLATE beside the lead entry. Colophon closes.

## 8.2 Collection detail (`src/app/collections/[handle]/`)

- **Fix the mock-flash double-fetch:** the server page already fetches for JSON-LD — pass `collection + products` as props; delete the client's mock-first refetch (empty-not-mock contract).
- Folio head with a real spec `dl` computed server-side: style count, per-piece band min–max via `getPerPiecePrice`, color roster as square ink-bordered chips.
- Body = `LedgerHead` + tray-wired `StyleRow`s (a collection page is an orderable chapter — terminal-desk graft) with two plates interleaved per entry grammar; prev/next chapter folio footer replaces the dead-end CTA band. JSON-LD trio + canonical untouched.

## 8.3 Lookbook (`src/app/lookbook/`)

- Stays RSC (ISR + server Portable Text is load-bearing). Index: ruled entry list + one lead plate. Detail: printed-journal running head (category + entry number, small, sticky); Article JSON-LD + BreadcrumbList added; the queried-but-unrendered `gallery[]` renders as framed plates between text sections (grid-hung, never full-bleed — veto); `cdn.sanity.io` added to `next.config` `remotePatterns` (documented latent bug).
- **Terminal-desk rule (graft):** every story ends in "Stock the styles behind this story" — ledger rows with real style codes + `buildProductInquiryUrl` links.
- Ghost editorial fallback entries with AI covers: cut, not restyled; empty state renders the index without a lead story.
- Execute §2.2 posts.ts/IG purge here (rail rendering); grayscale-at-rest treatment if the rail is retained.
- Zero entrance animation on all four routes; `LbReveal`/reveal components deleted from these routes; 4.5s-timeout empty states mandatory.

## 8.4 Acceptance tests

1. Collection detail: network tab shows one product fetch (server), no mock flash; empty collection renders the honest empty state.
2. Every collection row's count equals live `itemCount`; commit from a collection detail row updates the nav tray.
3. Dark mode: no `mix-blend-mode: multiply` computes on the index masthead; framed-plate fallback renders.
4. Lookbook story pages end in the style-code ledger; Article + BreadcrumbList LD present; `gallery[]` images render.
5. `public/images/instagram/` no longer contains `DaaE1TSyb22.jpg` or `DXryvhjknSv.jpg`; `posts.ts` has no "-b" duplicates and no "Soma designs" caption.

---

# CHAPTER 9 — BUILD ORDER + FILE-OWNERSHIP MAP

**Phase 0 — FOUNDATION (one builder, serial, blocks everything):**
Owns exclusively: `src/app/globals.css` (§1.2 additions only), `src/components/document/*` (entry.tsx, terms-rule.tsx, po-pane.tsx, chop-stamp.tsx, fold-seam.tsx, print-sheet-styles.tsx), `src/components/b2b/set-blocks.tsx`, `src/lib/line/season.ts`.

**Phase 1 — SURFACES (five builders, parallel; no file appears in two columns):**

| Builder | Owns (create/mutate/delete) |
|---|---|
| **H** Homepage | `src/app/page.tsx`; create `src/components/sections/frontispiece.tsx`, `home-entries.tsx`; delete `garment-signal-hero.tsx`, `homepage-command-center.tsx`, `hero-fluid.tsx`, `hero-masthead.tsx`, `product-grid.tsx`, `collections-band.tsx` |
| **C** Chrome | `src/components/layout/*` (navbar, footer, cart-added-toast, theme-progress-bar†, brand-logo usage), `src/components/ui/scroll-progress.tsx`†, `search-dialog.tsx`, `sheet.tsx`, `src/components/b2b/sticky-mobile-b2b-cta.tsx`, `src/app/not-found.tsx`, `src/app/loading.tsx`, `src/app/error.tsx`; create `src/components/layout/top-rail.tsx`, running-footer component (†deleted after top-rail swap) |
| **L** Line+shop | `src/app/shop/page.tsx`, `shop-client.tsx`, `src/app/shop/loading.tsx`, `src/app/shop/faqs.ts` (typeset only), `src/app/line/*`, all of `src/components/line/*` (regex unification, CommandBar print action; `style-row.tsx` otherwise untouched), `src/components/ui/living-product-card.tsx` (delete if importer-free after phase 1) |
| **P** PDP | `src/app/shop/[handle]/*`, `src/components/product/*`, `src/components/b2b/reseller-margin-estimator.tsx` |
| **F** Funnel | `src/app/bulk-order/*`, `src/app/line-sheet/*`, `src/app/contact/*`, `src/app/account/*`, `src/app/order-confirmation/*`, `src/app/cart/*`, `src/app/checkout/*` (SetBlocks swap only), `src/components/b2b/moq-progress.tsx` (delete), `wholesale-trust-bar.tsx` (delete), `src/components/sections/b2b-hero.tsx` (delete) |
| **K** Collections | `src/app/collections/*`, `src/app/lookbook/*`, `src/components/lookbook/*`, `src/lib/instagram/posts.ts`, `src/components/sections/instagram-gallery.tsx`, `collection-collage.tsx`, `collection-triptych.tsx`, `next.config` remotePatterns line |

**Phase 2 — CLOSING SWEEP (foundation builder, serial):**
1. Delete after grep-confirmed zero importers: `hero-cinematic.tsx`, `film-showcase.tsx`, `hero-main-stage.tsx`, `desk-math.tsx`, `buyer-lanes.tsx`, `lane-preview.tsx`, `lane-mobile-preview.tsx`, `manifesto-typography.tsx`, `horizontal-rack.tsx`, `block-motifs.tsx`, `live-ledger.tsx`(if orphaned), `reveal.tsx`/`scroll-reveal.tsx`(if orphaned), `public/videos/background.mp4`, purged instagram jpgs (§2.2).
2. Run the global greps: `animate-pulse` outside loading register, `scale-105` on imagery, `-webkit-text-stroke`, ghost `vw` letters, `"Not a "`, `#0a0a0f|#111118` in components, `padStart(2,` outside licensed uses, `discountPercent}% savings`, `Razorpay-ready` → all zero.
3. Run Lighthouse mobile on `/`, `/shop`, one PDP (≥96 each), the print tests, and the cross-surface tray test (commit on homepage → verify on `/shop`, PDP gauge, running footer, mobile CTA all agree).

**Merge order:** Foundation → (H, C, L, P, F, K in any order, parallel) → Sweep. No builder touches another's files; grammar disputes resolve by rule number, correctness disputes by §1.1.