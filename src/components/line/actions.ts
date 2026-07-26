/**
 * Actions every density emits. Identical across StylePlate / StyleCard /
 * StyleRow so the density toggle is a pure swap with no prop rewiring.
 *
 * All optional: a surface that cannot yet perform an action simply omits the
 * handler and the control renders inert. Nothing here writes to the cart —
 * wiring happens at the page level.
 */

import type { StyleLine } from "@/lib/line/contract";

export interface StyleLineActions {
  /** Put the line in the tray at COMMIT_DEFAULT_SETS (satisfies MOQ in one action). */
  onCommit?: (line: StyleLine) => void;
  /** Change set count on an already-committed line. */
  onSetsChange?: (line: StyleLine, sets: number) => void;
  /** sets -> 0. Non-destructive: the style stays in the tray, shortlisted. */
  onDemote?: (line: StyleLine) => void;
  /** Add to / remove from the shortlist band. */
  onToggleShortlist?: (line: StyleLine) => void;
  /** Add to / remove from the compare tray (capped at COMPARE_MAX upstream). */
  onToggleCompare?: (line: StyleLine) => void;
}

/** True when a style is in the tray in either state. */
export function inTray(line: StyleLine, shortlistedIds: Set<string>): boolean {
  return line.sets > 0 || shortlistedIds.has(line.product.id);
}
