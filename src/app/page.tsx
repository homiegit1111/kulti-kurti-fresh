import { jsonLdScript } from "@/lib/json-ld";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { StickyMobileB2BCta } from "@/components/b2b/sticky-mobile-b2b-cta";
import {
  buildCatalogRequestUrl,
  buildWholesaleWhatsAppMessage,
} from "@/lib/b2b/whatsapp";
import type { CartItem } from "@/lib/cart-context";
import { getCollections, getProducts } from "@/lib/commerce/catalog";
import type { CommerceProduct } from "@/lib/commerce/types";
import { seasonLabel } from "@/lib/line/season";
import { buildProductItemListLd } from "@/lib/seo";
import { B2B_CONFIG, GST_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import { getHomeContent } from "@/lib/content/home";
import { Cover } from "@/components/sections/cover";
import { HomeEntries } from "@/components/sections/home-entries";

/** Rows Entry A renders; ItemList JSON-LD positions mirror exactly this slice. */
const LEDGER_ROWS = 8;

/**
 * The page is re-rendered at most once a minute.
 *
 * This is required, not tuning. Without it Next prerenders `/` once and serves
 * that HTML until the next deploy, so an owner editing the cover in Admin Studio
 * would publish into a void. Sixty seconds is the promise the studio makes after
 * a publish ("live within a minute"); if you change it, change that copy too.
 */
export const revalidate = 60;

/** 1-based day of the year — drives Today's Plate (§3.3). */
function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - start) / 86_400_000);
}

/** A sample cart line for the Entry D purchase order — real catalog data. */
function toSampleCartItem(product: CommerceProduct, sets: number): CartItem {
  return {
    id: `sample-${product.id}`,
    productId: product.id,
    title: product.title,
    handle: product.handle,
    image: product.image,
    price: product.price,
    salePrice: product.salePrice,
    size: "Set",
    color: product.colors[0] ?? "",
    quantity: sets,
  };
}

export default async function HomePage() {
  const [products, collections] = await Promise.all([
    getProducts(12),
    getCollections(),
  ]);
  const catalogRequestUrl = buildCatalogRequestUrl();
  const season = seasonLabel(new Date());

  // Owner-editable copy and media. Resolved AFTER the catalogue so live counts
  // can fill the {tokens} in the copy — "Price list · 24 styles live" stays true
  // without anyone retyping the number.
  const content = await getHomeContent({
    season,
    styleCount: products.length,
    collectionCount: collections.length,
    setSize: B2B_CONFIG.setSize,
    sizeRatio: SIZE_RATIO_LABEL,
    minSets: B2B_CONFIG.minimumOrderSets,
    gstLow: GST_CONFIG.lowRate,
    gstHigh: GST_CONFIG.highRate,
  });

  // Today's Plate — computed here, outside any render memo, so the pick is
  // deterministic for the whole request (§3.3).
  const todayIndex =
    products.length > 0 ? dayOfYear(new Date()) % products.length : 0;

  // Entry A renders the first 8 rows; the ItemList mirrors that order 1-based.
  const ledgerProducts = products.slice(0, LEDGER_ROWS);
  const itemListLd = buildProductItemListLd(ledgerProducts, {
    name: "Featured Wholesale Kurtis",
    path: "/",
  });

  // Entry D — the real WhatsApp builder output for a two-line example cart
  // (2 sets + 2 sets = MOQ met), priced from the live catalog.
  const sampleItems = products.slice(0, 2).map((p) => toSampleCartItem(p, 2));
  const samplePo =
    sampleItems.length === 2
      ? buildWholesaleWhatsAppMessage(sampleItems)
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(itemListLd) }}
      />
      <Navbar />
      {/* No page-level container: this is a bound book, so every section owns
          its own full-bleed field (dyed or paper) and holds the 1400px text
          block inside itself. The cover runs under the fixed chrome on purpose
          — cloth to the very top edge. */}
      <main className="overflow-x-clip bg-surface text-content max-lg:pb-[76px]">
        <Cover
          products={products}
          catalogRequestUrl={catalogRequestUrl}
          season={season}
          content={content.cover}
        />
        <HomeEntries
          products={products}
          ledgerProducts={ledgerProducts}
          collections={collections}
          todayIndex={todayIndex}
          samplePo={samplePo}
          catalogRequestUrl={catalogRequestUrl}
          content={content}
        />
      </main>
      <StickyMobileB2BCta />
      <Footer />
    </>
  );
}
