import { permanentRedirect } from "next/navigation";

/**
 * /wishlist retires into /tray.
 *
 * The old page was half of a split workflow: saved styles here, set counts in
 * the cart drawer, with no single screen showing both. /tray merges them, and
 * TrayProvider migrates the legacy `rangat-pehnawa-wishlist` localStorage key on
 * first read — so a buyer's saved list survives the move without a prompt.
 *
 * permanentRedirect (308) rather than redirect (307): the route is gone for
 * good, and bookmarks/search engines should update rather than keep asking.
 */
export default function WishlistPage() {
  permanentRedirect("/tray");
}
