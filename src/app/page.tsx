import { jsonLdScript } from "@/lib/json-ld";
import { Footer } from "@/components/layout/footer";
import { StickyMobileB2BCta } from "@/components/b2b/sticky-mobile-b2b-cta";
import { getProducts } from "@/lib/commerce/catalog";
import { buildProductItemListLd } from "@/lib/seo";
import { DreamHome } from "@/components/home/dream-home";

/** Rows the ItemList JSON-LD mirrors (SEO parity with the former ledger). */
const LEDGER_ROWS = 8;

/**
 * The page is re-rendered at most once a minute — keeps catalog-driven
 * JSON-LD fresh without a redeploy.
 */
export const revalidate = 60;

/**
 * Homepage — the "dream UI" composition approved from the reference artwork:
 * its own editorial header, the fabric-cut रंगत masthead, hero model, red
 * thread, SS'24 tag, wholesale rate card, and the This Season strip.
 *
 * The composition renders its own header (part of the artwork), so the global
 * Navbar is intentionally not mounted here; all other routes keep it.
 * Previous homepage sections live in @/components/sections/ if ever needed.
 */
export default async function HomePage() {
  const products = await getProducts(12);

  const itemListLd = buildProductItemListLd(products.slice(0, LEDGER_ROWS), {
    name: "Featured Wholesale Kurtis",
    path: "/",
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(itemListLd) }}
      />
      <main className="overflow-x-clip">
        <DreamHome />
      </main>
      <StickyMobileB2BCta />
      <Footer />
    </>
  );
}
