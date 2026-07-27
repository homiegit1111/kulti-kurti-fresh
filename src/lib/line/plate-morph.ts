"use client";

/**
 * PLATE MORPH — the garment travels between pages.
 *
 * A style's photograph on a list page and the hero plate on its product page
 * share one `view-transition-name`, so the browser animates the same box across
 * the navigation instead of crossfading two pages. The buyer's eye stays on the
 * cloth.
 *
 * WHY THE NAME IS CLAIMED ON CLICK RATHER THAN RENDERED
 *
 * `view-transition-name` must be unique in the document when the snapshot is
 * taken. Two elements sharing one name does not degrade gracefully — the browser
 * abandons the whole transition. So a static `name={product.id}` on a list item
 * is only safe while no product ever renders twice on a page, and on this site
 * several do:
 *
 *   • the home page renders `products.slice(0, 8)` as ledger rows AND three
 *     season figures picked by `(todayIndex + i) % products.length`, which
 *     overlaps that slice on most days of the year;
 *   • collection pages interleave style PLATES among style ROWS built from the
 *     same lines, so one style is on screen in two densities at once.
 *
 * Claiming on interaction sidesteps all of it: exactly one element ever holds a
 * given name, and it is always the one the buyer actually touched — which is also
 * the only element the morph should start from. A previous claim is released
 * before a new one is made, so an abandoned navigation cannot leave a stale name
 * behind to collide with the next click.
 *
 * The product page hero keeps a plain static name: a product page has exactly one
 * hero, so it cannot collide with itself.
 *
 * WHY THERE IS NO HOOK AND NO REF
 * The plate is marked with `data-plate-name` and its container with
 * `data-plate-scope`. A click anywhere in the scope — the thumbnail link or the
 * title link — finds the plate by attribute. That keeps this a plain function
 * (no ref handed out of a hook, which the React Compiler correctly rejects) and
 * means a row can grow more navigating controls without rewiring anything.
 *
 * KNOWN LIMIT: this morphs FORWARD only. On the way back the destination cannot
 * know which of several candidate plates to name before it renders, so the
 * browser plays the quick root crossfade instead. A deliberate stopping point.
 *
 * Timing and the reduced-motion gate live in globals.css under "VIEW
 * TRANSITIONS". Browsers without the API navigate normally.
 */

/**
 * A product id sanitised into a CSS custom-ident. The list plate and the product
 * page hero must both derive their name from this function — if the two ever
 * disagree the morph silently degrades to a crossfade.
 */
export function plateMorphName(productId: string): string {
  return `product-plate-${productId.replace(/[^a-zA-Z0-9-]/g, "-")}`;
}

/**
 * Groups every plate under one selector so `::view-transition-group(.plate)` can
 * give them their own curve. A per-product name cannot be targeted by CSS — the
 * pseudo-element argument takes a single ident or `*`, never a prefix — so the
 * class is the only way to style plates without also restyling the root snapshot.
 */
export const PLATE_MORPH_CLASS = "plate";

/** Marks the element holding the photograph. Value is the morph name. */
export const PLATE_ATTR = "data-plate-name";
/** Marks the row/card that contains one plate plus its other links. */
export const PLATE_SCOPE_ATTR = "data-plate-scope";

/** Props to spread onto the plate element. */
export function plateProps(productId: string): Record<string, string> {
  return { [PLATE_ATTR]: plateMorphName(productId) };
}

/** Props to spread onto the row/card wrapper. */
export const plateScopeProps: Record<string, string> = {
  [PLATE_SCOPE_ATTR]: "",
};

/** The element currently holding a plate name, so it can be released. */
let claimedElement: HTMLElement | null = null;

function release(): void {
  if (!claimedElement) return;
  claimedElement.style.removeProperty("view-transition-name");
  claimedElement.style.removeProperty("view-transition-class");
  claimedElement = null;
}

/**
 * Call from the `onClick` of anything that navigates to a product page. Stamps
 * the morph name onto the plate in the same scope as the clicked control.
 *
 * Direct style mutation rather than React state, deliberately: the name has to be
 * on the element BEFORE the router starts the transition, and a state update
 * would not have committed in time.
 */
export function claimPlateMorph(event: {
  currentTarget: EventTarget & HTMLElement;
}): void {
  const target = event.currentTarget;
  const plate = target.hasAttribute(PLATE_ATTR)
    ? target
    : (target
        .closest<HTMLElement>(`[${PLATE_SCOPE_ATTR}]`)
        ?.querySelector<HTMLElement>(`[${PLATE_ATTR}]`) ?? null);

  const name = plate?.getAttribute(PLATE_ATTR);
  if (!plate || !name) return;

  if (claimedElement && claimedElement !== plate) release();
  // setProperty, not the camelCase alias: `view-transition-class` is View
  // Transitions Level 2 and missing from older CSSStyleDeclaration typings, so
  // assigning through the alias would be a silent no-op where it is unsupported.
  plate.style.setProperty("view-transition-name", name);
  plate.style.setProperty("view-transition-class", PLATE_MORPH_CLASS);
  claimedElement = plate;
}
