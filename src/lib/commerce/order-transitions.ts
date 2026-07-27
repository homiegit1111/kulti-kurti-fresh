/**
 * The order status state machine — ONE definition, read by both the API and the
 * admin UI.
 *
 * It used to be declared twice, and the two copies disagreed. The admin offered
 * buttons for `pending_payment → fulfilled`, `pending_payment → paid`,
 * `paid → cancelled` and `fulfilled → paid`; the API allowed none of them, so all
 * four rendered as live controls and every one returned 409. The comment above
 * the UI copy claimed it mirrored the API.
 *
 * The API's set is the correct one, and is the set below. In particular there is
 * no manual route to `paid`: an order becomes paid only through a verified,
 * captured payment (see finalize_captured_commerce_payment in
 * supabase/20260710_commerce_lifecycle_atomic.sql). A button that marks an order
 * paid by hand is a button that marks an unpaid order paid.
 *
 * Client-safe: pure data, no imports.
 */

export type CommerceOrderStatus =
  | "draft"
  | "pending_payment"
  | "paid"
  | "fulfilled"
  | "cancelled"
  | "payment_review";

/**
 * Which statuses an admin may move an order to, from each current status.
 * Terminal states map to an empty list.
 */
export const ORDER_TRANSITIONS: Record<string, readonly CommerceOrderStatus[]> = {
  draft: ["cancelled"],
  pending_payment: ["cancelled"],
  paid: ["fulfilled"],
  fulfilled: [],
  cancelled: [],
  // A capture landed but could not be matched to an order with a live
  // reservation. Resolving it is a payment-ledger investigation, not a status
  // click, so nothing is offered here.
  payment_review: [],
};

export function allowedOrderTransitions(
  current: string,
): readonly CommerceOrderStatus[] {
  return ORDER_TRANSITIONS[current] ?? [];
}

/** Human label for a transition button. */
export function orderTransitionLabel(next: CommerceOrderStatus): string {
  switch (next) {
    case "cancelled":
      return "Cancel order";
    case "fulfilled":
      return "Mark dispatched";
    default:
      return `Mark ${next.replace(/_/g, " ")}`;
  }
}
