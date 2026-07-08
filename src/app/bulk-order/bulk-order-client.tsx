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
    <div className="bg-warm-white min-h-screen text-charcoal font-sans flex flex-col">
      <Navbar />
      <main className="flex-1 pt-28 lg:pt-36 pb-24">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12">
          <header className="mb-10 border-b border-charcoal/10 pb-8">
            <p className="eyebrow mb-3">Bulk Deals</p>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight">
                  Bulk <span className="italic">Deals</span>
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-charcoal/55">
                  Build a practical kurti bulk cart across multiple styles.
                  MOQ is {B2B_CONFIG.minimumOrderSets} sets total; 1 set ={" "}
                  {B2B_CONFIG.setSize} pcs in {SIZE_RATIO_LABEL}.
                </p>
              </div>
              <Link href="/cart" className="btn-luxe-outline group w-fit">
                Review Cart
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </header>

          <WholesaleTrustBar className="mb-8" />

          <section className="sticky top-20 z-30 mb-6 border-y border-charcoal/10 bg-warm-white/95 py-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex flex-wrap gap-5 text-[10px] font-bold uppercase tracking-[0.16em] text-charcoal/50">
                  <span>{totalSets} sets</span>
                  <span>{totalPieces} pcs</span>
                  <span>{totals.appliedTier?.label || "MOQ pending"}</span>
                  <span>{totals.discountPercent}% savings</span>
                </div>
                <label className="relative block max-w-md lg:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-charcoal/35" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search style, code, color"
                    className="h-11 w-full border border-charcoal/15 bg-white pl-9 pr-3 text-sm text-charcoal outline-none placeholder:text-charcoal/35 focus:border-gold"
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

          <div className="overflow-x-auto border border-charcoal/10 bg-white">
            <table className="w-full min-w-[760px] border-collapse">
              <thead className="bg-charcoal text-white">
                <tr className="text-left text-[10px] uppercase tracking-[0.2em]">
                  <th className="px-4 py-4 font-bold">Style</th>
                  <th className="px-4 py-4 font-bold">Code</th>
                  <th className="px-4 py-4 font-bold">Pack</th>
                  <th className="px-4 py-4 font-bold">Price</th>
                  <th className="px-4 py-4 font-bold">Sets</th>
                  <th className="px-4 py-4 font-bold text-right">Line</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((product) => {
                  const sets = setsById[product.id] ?? 0;
                  const setPrice = product.salePrice ?? product.price;
                  return (
                    <tr key={product.id} className="border-b border-charcoal/10">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative h-16 w-12 shrink-0 bg-warm-gray overflow-hidden">
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
                              className="font-serif text-base text-charcoal hover:text-gold-dark"
                            >
                              {product.title}
                            </Link>
                            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-charcoal/40">
                              {product.category}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.16em] text-charcoal/45">
                        {getStyleCode(product)}
                      </td>
                      <td className="px-4 py-4 text-xs text-charcoal/60">
                        {SIZE_RATIO_LABEL}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold">
                          {formatPrice(setPrice)}/set
                        </p>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-charcoal/35">
                          {formatPrice(getPerPiecePrice(setPrice))}/pc
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex w-28 items-center border border-charcoal/15 bg-white">
                          <button
                            type="button"
                            onClick={() =>
                              updateSets(product.id, String(Math.max(0, sets - 1)))
                            }
                            className="flex h-10 w-9 items-center justify-center text-charcoal/45 hover:bg-charcoal/5 hover:text-charcoal"
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
                            className="h-10 w-10 border-x border-charcoal/15 bg-transparent text-center text-sm font-semibold outline-none"
                            aria-label={`Sets for ${product.title}`}
                          />
                          <button
                            type="button"
                            onClick={() => updateSets(product.id, String(sets + 1))}
                            className="flex h-10 w-9 items-center justify-center text-charcoal/45 hover:bg-charcoal/5 hover:text-charcoal"
                            aria-label={`Increase sets for ${product.title}`}
                          >
                            <Plus className="h-3 w-3" strokeWidth={1.6} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-serif text-lg">
                        {sets > 0 ? formatPrice(setPrice * sets) : "-"}
                      </td>
                    </tr>
                  );
                })}
                {visibleProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <p className="font-serif text-2xl font-light text-charcoal">
                        No styles match this search.
                      </p>
                      <p className="mt-2 text-sm text-charcoal/50">
                        Try a style code, color, or category from the wholesale catalog.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid gap-4 border border-charcoal/10 bg-charcoal p-6 text-warm-white md:grid-cols-3 md:items-center">
            <div className="md:col-span-2">
              <p className="eyebrow eyebrow--bare mb-2">Order Path</p>
              <h2 className="font-serif text-3xl font-light">
                Add selected sets, then confirm availability and payment.
              </h2>
              <p className="mt-3 text-xs leading-relaxed text-white/55">
                WhatsApp remains the fastest way to confirm stock. Checkout is
                Razorpay-ready once payment keys are configured.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={addSelected}
                disabled={selectedRows.length === 0}
                className="btn-luxe bg-warm-white text-charcoal disabled:opacity-45"
              >
                Add to Cart <Plus className="h-3.5 w-3.5" />
              </button>
              <Link href="/checkout" className="btn-luxe-outline border-white/30 text-white hover:bg-white hover:text-charcoal">
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
