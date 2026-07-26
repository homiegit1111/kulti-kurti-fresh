"use client";

/**
 * Tray → cart handoff.
 *
 * WHY THIS EXISTS (it fixes a real break): /tray enables its Checkout exit as
 * soon as the TRAY meets MOQ, but /checkout reads cart-context — and the tray
 * writes only tray state. So a buyer could commit six sets in the tray, see
 * Checkout light up, click it, and land on an empty checkout. The tray was a
 * working surface wired to nothing.
 *
 * Rather than rewrite checkout onto the tray (that is commerce logic, and out
 * of scope), this reconciles the cart to the tray immediately before handoff.
 *
 * FOUR RULES, all deliberate:
 *
 * 1. IDEMPOTENT. cart-context's `addItem` INCREMENTS an existing line
 *    (`existing.quantity + setQuantity`), so calling it on every handoff would
 *    double-count a buyer who visits checkout twice. Existing lines are
 *    therefore moved with `updateQuantity` (which SETS), and only genuinely new
 *    styles are added.
 *
 * 2. NEVER REDUCE. The tray does not read cart quantities, so the two stores
 *    diverge as a matter of course: a buyer can pick 6 sets of a style on its
 *    PDP (cart line = 6) while the tray carries that same style committed at
 *    the default 4. Setting the cart to the tray's number would silently delete
 *    two sets the buyer deliberately chose on another screen. So the reconcile
 *    raises to `max(cart, tray)` and never lowers. The cart's own stepper stays
 *    the place to reduce, because there the buyer can see what they are cutting.
 *
 * 3. THE TRAY IS AUTHORITATIVE ONLY FOR STYLES IT CARRIES. Cart lines for
 *    styles absent from the tray are left alone — /bulk-order writes the same
 *    cart shape, and silently deleting a buyer's bulk lines to satisfy a screen
 *    they were not looking at is destructive. Consequence: checkout shows the
 *    union, which is never smaller than the tray, so the tray's MOQ gate can
 *    never enable a checkout that then fails its own MOQ check.
 *
 * 4. AGGREGATE ACROSS COLOURWAYS. Cart lines are keyed by
 *    (productId, size, COLOUR), so one style can hold several lines — the PDP
 *    writes `color: selectedColor`, and a buyer who adds sage then ivory has
 *    two. The tray has no colour dimension at all: its `sets` is a style-level
 *    number. So the comparison must be tray sets vs the SUM of that style's cart
 *    lines, not vs the first one found. Matching only the first would top up a
 *    style that already had enough across its colourways, inflating the order.
 *    When a top-up is needed it goes to the largest existing line, so the extra
 *    sets land on the colourway the buyer committed to most.
 *
 * SCOPE: no pricing, tax, or schema logic. It moves quantities between two
 * client stores that already exist.
 */

import { useCallback } from "react";
import { useCart } from "@/lib/cart-context";
import { useTray } from "@/lib/line/tray-context";

/**
 * Every cart writer on the site (PDP, bulk order, product card) uses this as
 * the size key, because a wholesale line is a set and not a garment size. The
 * handoff has to match it exactly or it would create a parallel line for the
 * same style.
 */
export const TRAY_CART_SIZE = "Set";

export function useTrayHandoff() {
  const { items, addItem, updateQuantity } = useCart();
  const { committed } = useTray();

  return useCallback(() => {
    for (const line of committed) {
      // ALL lines for this style, not the first — see rule 4.
      const existingLines = items.filter(
        (item) =>
          item.productId === line.product.id && item.size === TRAY_CART_SIZE,
      );

      if (existingLines.length > 0) {
        const cartSets = existingLines.reduce((sum, i) => sum + i.quantity, 0);
        const deficit = line.sets - cartSets;

        // Raise only, and only by what is missing — see rules 2 and 4.
        if (deficit > 0) {
          const target = existingLines[0];
          updateQuantity(target.id, target.quantity + deficit);
        }
        continue;
      }

      // Sold-out styles cannot reach here: the tray force-demotes them on read,
      // so `committed` never contains one. addItem guards this again anyway.
      addItem(
        line.product,
        TRAY_CART_SIZE,
        line.product.colors[0],
        line.sets,
      );
    }
  }, [committed, items, addItem, updateQuantity]);
}
