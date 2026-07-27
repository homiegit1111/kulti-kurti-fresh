import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { WishlistClient } from "./wishlist-client";

export const metadata: Metadata = {
  title: "Saved styles",
  description:
    "Styles you saved while browsing the line — style code, set rate and per-piece rate in one ruled list. Add sets to your order when you're ready.",
};

/**
 * /wishlist — "Saved styles".
 *
 * Reinstated as a real page (it was briefly a 308 into /tray): the PDP's Save
 * control still writes wishlist-context (localStorage + server sync for
 * signed-in buyers), and the wishlist-nudge emails link here — so this page is
 * where those saves surface. Adding sets hands the style to the tray via the
 * existing commit contract; nothing here touches cart, pricing or checkout.
 */
export default function WishlistPage() {
  return (
    <>
      <Navbar />
      <main>
        <WishlistClient />
      </main>
      <Footer />
    </>
  );
}
