"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MessageCircle, Minus, Plus, Search } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getProducts, MOCK_PRODUCTS, formatPrice, type MockProduct } from "@/lib/commerce/catalog";
import { useCart } from "@/lib/cart-context";
import { B2B_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import { calculateWholesaleTotals, getPerPiecePrice } from "@/lib/b2b/pricing";
import { MoqProgress } from "@/components/b2b/moq-progress";
import { WholesaleTrustBar } from "@/components/b2b/wholesale-trust-bar";
import { getStyleCode } from "@/lib/b2b/style-code";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";
import { trackBulkOrderAdd } from "@/lib/analytics";

export default function BulkOrderClient() {
  const [products, setProducts] = useState<MockProduct[]>(MOCK_PRODUCTS);
  const [setsById, setSetsById] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [added, setAdded] = useState(false);
  const { addItem, openCart } = useCart();

  useEffect(() => {
    getProducts(40).then((data) => {
      if (data.length > 0) setProducts(data);
    });
  }, []);

  const selectedRows = useMemo(
    () =>
      products
        .map((product) => ({ product, sets: setsById[product.id] ?? 0 }))
        .filter((row) => row.sets > 0),
    [products, setsById],
  );
  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return products;

    return products.filter((product) => {
      const haystack = [
        product.title,
        product.category,
        getStyleCode(product),
        ...product.colors,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [products, query]);
  const totalSets = selectedRows.reduce((sum, row) => sum + row.sets, 0);
  const totalPieces = totalSets * B2B_CONFIG.setSize;
  const selectedCartItems = selectedRows.map(({ product, sets }) => ({
    ...product,
    quantity: sets,
    size: "Set",
    color: product.colors[0] ?? "assorted",
  }));
  const totals = calculateWholesaleTotals(
    selectedCartItems.map((item) => ({
      id: item.id,
      productId: item.id,
      title: item.title,
      handle: item.handle,
      price: item.price,
      salePrice: item.salePrice,
      image: item.image,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      variantId: item.variantId,
    })),
  );

  const updateSets = (productId: string, value: string) => {
    const parsed = Math.max(0, Number.parseInt(value || "0", 10) || 0);
    setSetsById((current) => ({ ...current, [productId]: parsed }));
  };

  const addSelected = () => {
    selectedRows.forEach(({ product, sets }) => {
      addItem(product, "Set", product.colors[0], sets);
    });
    trackBulkOrderAdd({
      styles: selectedRows.length,
      total_sets: totalSets,
      total_pieces: totalPieces,
    });
    setAdded(true);
    openCart();
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-content">
      <Navbar />
      <main className="flex-1 pt-28 pb-24 lg:pt-36 lg:pb-28">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10">
          <header className="mb-10 grid gap-8 border-b-2 border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-accent-red">
                Bulk desk / Wholesale cart
              </p>
              <h1 className="mt-4 max-w-[11ch] text-[clamp(2.8rem,7vw,7rem)] font-black uppercase leading-[0.82] tracking-[-0.07em]">
                Bulk deals
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-content/60">
                Build a practical kurti bulk cart across multiple styles.
                MOQ is {B2B_CONFIG.minimumOrderSets} sets total; 1 set ={" "}
                {B2B_CONFIG.setSize} pcs in {SIZE_RATIO_LABEL}.
              </p>
            </div>
            <Link href="/cart" className="btn-luxe-outline group w-fit">
              Review cart
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </header>

          <WholesaleTrustBar className="mb-8" />

          <section className="sticky top-20 z-30 mb-6 border-y border-line/20 bg-surface/95 py-4 backdrop-blur-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex flex-wrap gap-5 text-[10px] font-bold uppercase tracking-[0.16em] text-content/50">
                  <span>{totalSets} sets</span>
                  <span>{totalPieces} pcs</span>
                  <span className="text-content">{totals.appliedTier?.label || "MOQ pending"}</span>
                  <span className="text-accent-red">{totals.discountPercent}% savings</span>
                </div>
                <label className="relative block max-w-md lg:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-content/35" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search style, code, color"
                    className="h-11 w-full border border-line/20 bg-surface-2 pl-9 pr-3 text-sm text-content outline-none transition-colors placeholder:text-content/35 focus:border-line focus:bg-white focus:text-on-accent"
                  />
                </label>
              </div>
              <div className="flex items-center gap-3">
                <a href={buildCatalogRequestUrl()} className="hidden sm:inline-flex btn-luxe-outline">
                  Catalog <MessageCircle className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={addSelected}
                  disabled={selectedRows.length === 0}
                  className="btn-luxe disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {added ? "Added" : "Add Sets"}
                </button>
              </div>
            </div>
            <div className="mt-4 max-w-xl">
              <MoqProgress totals={totals} />
            </div>
          </section>

          <div className="overflow-x-auto border border-line/20 bg-surface-2">
            <table className="w-full min-w-[760px] border-collapse">
              <thead className="bg-surface-inverse text-content-inverse">
                <tr className="text-left text-[9px] uppercase tracking-[0.22em]">
                  <th className="px-4 py-4 font-bold">Style</th>
                  <th className="px-4 py-4 font-bold">Code</th>
                  <th className="px-4 py-4 font-bold">Pack</th>
                  <th className="px-4 py-4 font-bold">Price</th>
                  <th className="px-4 py-4 font-bold">Sets</th>
                  <th className="px-4 py-4 text-right font-bold">Line</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((product) => {
                  const sets = setsById[product.id] ?? 0;
                  const setPrice = product.salePrice ?? product.price;
                  return (
                    <tr key={product.id} className="border-b border-line/15 transition-colors hover:bg-surface">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative h-16 w-12 shrink-0 overflow-hidden bg-surface-hover">
                            <Image
                              src={product.image}
                              alt={product.title}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                          <div>
                            <Link
                              href={`/shop/${product.handle}`}
                              className="text-sm font-bold uppercase tracking-[-0.01em] text-content transition-colors hover:text-accent-red"
                            >
                              {product.title}
                            </Link>
                            <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-content/40">
                              {product.category}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.16em] text-content/45">
                        {getStyleCode(product)}
                      </td>
                      <td className="px-4 py-4 text-xs text-content/60">
                        {SIZE_RATIO_LABEL}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-bold">
                          {formatPrice(setPrice)}/set
                        </p>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-content/40">
                          {formatPrice(getPerPiecePrice(setPrice))}/pc
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        {/* bg-surface-2 (not bg-white): in dark mode a white
                            well made the near-white input text unreadable. */}
                        <div className="flex w-28 items-center border border-line/20 bg-surface-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateSets(product.id, String(Math.max(0, sets - 1)))
                            }
                            className="flex h-10 w-9 items-center justify-center text-content/45 transition-colors hover:bg-surface-inverse hover:text-accent-lime"
                            aria-label={`Decrease sets for ${product.title}`}
                          >
                            <Minus className="h-3 w-3" strokeWidth={1.6} />
                          </button>
                          <input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            value={sets || ""}
                            onChange={(event) =>
                              updateSets(product.id, event.target.value)
                            }
                            className="h-10 w-10 border-x border-line/20 bg-transparent text-center text-sm font-bold outline-none"
                            aria-label={`Sets for ${product.title}`}
                          />
                          <button
                            type="button"
                            onClick={() => updateSets(product.id, String(sets + 1))}
                            className="flex h-10 w-9 items-center justify-center text-content/45 transition-colors hover:bg-surface-inverse hover:text-accent-lime"
                            aria-label={`Increase sets for ${product.title}`}
                          >
                            <Plus className="h-3 w-3" strokeWidth={1.6} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-lg font-black tracking-[-0.02em]">
                        {sets > 0 ? formatPrice(setPrice * sets) : "-"}
                      </td>
                    </tr>
                  );
                })}
                {visibleProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <p className="text-3xl font-black uppercase leading-[0.9] tracking-[-0.04em]">
                        No styles match this search.
                      </p>
                      <p className="mt-3 text-sm text-content/55">
                        Try a style code, color, or category from the wholesale catalog.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid gap-6 border border-line/20 bg-surface-inverse p-6 text-content-inverse md:grid-cols-3 md:items-center lg:p-10">
            <div className="md:col-span-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-accent-lime">Order path</p>
              <h2 className="mt-4 max-w-[20ch] text-3xl font-black uppercase leading-[0.9] tracking-[-0.04em] lg:text-4xl">
                Add selected sets, then confirm availability and payment.
              </h2>
              <p className="mt-4 text-xs leading-6 text-content-inverse/55">
                WhatsApp remains the fastest way to confirm stock. Checkout is
                Razorpay-ready once payment keys are configured.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {/* Primary = solid lime (on-accent ink is pinned dark in both
                  themes) — the previous bg-surface-2 went near-black on the
                  dark slate panel and the CTA disappeared. */}
              <button
                type="button"
                onClick={addSelected}
                disabled={selectedRows.length === 0}
                className="btn-luxe border-accent-lime bg-accent-lime text-on-accent hover:bg-white hover:border-white disabled:opacity-45"
              >
                Add to cart <Plus className="h-3.5 w-3.5" />
              </button>
              <Link href="/checkout" className="btn-luxe-outline border-content-inverse/50 text-content-inverse hover:bg-surface-2 hover:text-content">
                Checkout <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
