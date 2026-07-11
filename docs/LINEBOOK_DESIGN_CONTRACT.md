# Line-Book Design Contract

**This is the single source of truth for the site-wide redesign. Every page and component MUST obey it.**
The goal: one cohesive editorial "line-book" language across the whole storefront — the look already
shipped on the home page (`src/app/page.tsx`, `b2b-hero.tsx`, `buyer-lanes.tsx`). This is a wholesale
B2B kurti brand from Bangalore. The vibe is *merchant catalogue meets premium fashion editorial* —
serious, fast to scan, confident, NOT faux-luxury, NOT generic AI template.

---

## 1. Palette (use these EXACT values)

| Token            | Value       | Use                                                        |
|------------------|-------------|------------------------------------------------------------|
| Ink / near-black | `#121310`   | Dark section backgrounds, primary buttons, hero            |
| Ink text         | `#171814`   | Body text on paper                                          |
| Paper            | `#ece9df`   | Default page background (warm merchant paper)              |
| Paper alt        | `#f2efe6`   | Alternating section background                              |
| Paper deep       | `#c9c2b2` / `#d4d0c5` | Image placeholders, muted panels                 |
| Lime             | `#d8ff4f`   | The signature accent — codes, active pills, key highlights |
| Red              | `#cc2f4a`   | Secondary accent — index numbers, sale, urgent CTAs        |
| Cream text       | `#f1eee5`   | Text on ink backgrounds                                    |

**Opacity ramps** on ink text: `/55`, `/45`, `/35`, `/25`, `/20` for labels, dividers, hints.
Cream text on dark: `/65`, `/55`, `/45`, `/25`.

**FORBIDDEN:** `gold` / `#C9A96E` / `hsl(37 45% ...)`, `font-serif` / Playfair display type,
rounded-2xl cards, glassmorphism blur panels, pastel gradients, `warm-gray` bg cards. These are the
old "luxe-serif" system we are replacing. If you see them, remove them.

---

## 2. Typography

- **Display / headlines:** `font-sans` (Inter), `font-black`, `uppercase`, tight tracking
  `tracking-[-0.055em]` to `tracking-[-0.085em]`, line-height `leading-[0.9]` down to `leading-[0.72]`
  for the biggest. Scale with `clamp()`, e.g. `text-[clamp(3.2rem,8vw,8.7rem)]`. Go BIG on hero/section
  heads — this brand's signature is oversized black uppercase type.
- **Micro-labels / eyebrows:** `text-[9px]` (sometimes 8px), `font-bold`, `uppercase`,
  `tracking-[0.2em]`–`tracking-[0.3em]`. Often colored lime or red, or ink `/45`.
- **Body:** `text-sm` / `text-xs`, `leading-6`, ink `/60`–`/70`. Keep body short and factual.
- **Numbers/codes:** treat style codes (`RP-xxx`), prices, size runs as typographic objects —
  monospace-feel via wide tracking and bold weight.
- Never use serif anywhere.

---

## 3. Shape & layout

- **Square corners everywhere.** No border-radius except full-round only for tiny dots/avatars if needed.
- **Hairline borders:** `border border-[#171814]/20` on paper, `border-[#f1eee5]/25` on ink.
- **Max width:** `max-w-[1600px]` container, `mx-auto`, padding `px-4 sm:px-6 lg:px-10`.
- **Section rhythm:** `py-20 lg:py-28`. Alternate paper `#ece9df` / `#f2efe6` / ink `#121310`.
- **Grids & rules:** favor visible structure — divider lines, numbered rows (`01`, `02`), table-like
  layouts with column headers in micro-labels. The `.inventory-row` lime-fill-on-hover is a signature.
- **Editorial devices:** giant faded background letters (see `page.tsx` manifesto `R`), stroked-outline
  text (`[-webkit-text-stroke:1px_#f1eee5]` with `text-transparent`), corner labels on images.

---

## 4. Motion (framer-motion)

- **Standard ease:** `[0.16, 1, 0.3, 1]` (expo-out). This is THE ease. Use everywhere.
- **Entrance:** fade + rise `y: 24→0` over `0.65s`; stagger children `staggerChildren: 0.08–0.09`,
  `delayChildren: 0.12`.
- **Headline reveal:** words rise `y: 70→0` staggered, `duration: 0.95`.
- **Image crossfades:** `opacity` + slight `scale 1.035→1`, `duration: 0.48`.
- **Hover:** arrows translate `group-hover:-translate-y-0.5 group-hover:translate-x-0.5`; lime fills
  sweep via `scaleY`/`scaleX` origin transforms.
- **Respect `useReducedMotion()`** — gate transforms when true.
- Always import from `framer-motion`. Prefer `whileInView` with `viewport={{ once: true, margin: "-80px" }}`
  for scroll-reveal sections so the page feels alive as you scroll.
- Keep it premium and purposeful — no bouncy/springy gimmicks, no infinite spinners as decoration.

---

## 5. Shared CSS primitives (ALREADY retargeted to line-book — just USE them)

These classes in `globals.css` now render line-book styling. Prefer them over re-implementing:

- `.eyebrow` — micro-label with a lime lead rule. `.eyebrow--bare` drops the rule.
- `.btn-luxe` — primary button: ink block, lime sweep-in on hover, cream text. Square.
- `.btn-luxe-outline` — hairline outline that inks in on hover.
- `.linebook-button` / `.linebook-button--dark` — merchant buttons (already line-book).
- `.field-luxe` + `.field-label` — underline form field + micro-label. Focus goes lime.
- `.link-luxe` — animated underline (now lime).
- `.panel-luxe` — hairline-framed panel on paper (no shadow-heavy card).
- `.frame-luxe` — double-hairline inner frame (inner rule now lime).
- `.inventory-row` — numbered list row with lime fill-on-hover.

If you need a NEW shared primitive (e.g. a line-book product card variant), tell the orchestrator —
do NOT invent a one-off inconsistent style inline.

---

## 6. Component patterns to reuse

- **Section head:** eyebrow (lime/red) + giant black uppercase headline + short factual sub, over a
  `border-b-2 border-[#171814]` rule. See `page.tsx` "The line, without the theatre."
- **Product card (line-book):** square image on `#d8d4c8`, tiny code+category label row, bold tight
  title, price/per-piece split, square "Add set" button that inverts to ink on hover. Replaces the
  serif `LivingProductCard`.
- **Data rows:** `.inventory-row` grid with image / style / pack / set / per-pc / arrow columns.
- **CTA band:** ink or red full-bleed section, giant headline, `.linebook-button` pair.
- **Image treatment:** `object-cover`, subtle gradient scrim `from-black/35`, lime corner code chip.

---

## 7. B2B rules (do not break)

- Prices show **per set AND per piece**. Keep `formatPrice`, `getPerPiecePrice`, `getStyleCode`,
  `B2B_CONFIG` usage intact.
- MOQ, size-ratio packs, tier discounts, WhatsApp catalogue CTA are core — preserve their data/logic,
  only restyle.
- **NEVER touch payment/auth/commerce handlers** (Razorpay, Clerk, Medusa, Supabase, form submit logic).
  Redesign is PRESENTATIONAL ONLY. Keep all hooks, state, effects, API calls, props exactly.

---

## 8. Accessibility & quality bar

- Maintain `aria-label`s on icon buttons; keep focus-visible states (lime ring/border).
- Color contrast: cream on ink and ink on paper both pass. Lime is an accent, not body text.
- Mobile-first: every layout must work at 375px. Big type uses `clamp()` so it scales down.
- No layout shift; images keep aspect ratios (`aspect-[3/4]` for product, `aspect-square` for thumbs).

---

## 9. Definition of done (per page)

1. Zero `font-serif`, zero `gold`/`gold-dark`/`gold-light`, zero rounded-2xl, zero glass panels.
2. Background is paper `#ece9df`/`#f2efe6` or ink `#121310`; text ink/cream; accents lime/red only.
3. At least one oversized black uppercase headline with an eyebrow.
4. framer-motion entrance + scroll-reveal with the standard ease.
5. All original logic/handlers/props preserved; `tsc --noEmit` clean for the file.
6. Looks intentional and premium at 375px AND 1440px.
