import { jsonLdScript } from "@/lib/json-ld";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  getEditorialBySlug,
  getEditorialEntries,
  getEditorialSlugs,
} from "@/lib/sanity/queries";
import { sanityImageUrl, isSanityConfigured } from "@/lib/sanity/client";
import { LookbookPortableText } from "@/components/lookbook/portable-text";
import { EntryClose } from "@/components/document/entry";
import { getProducts, formatPrice } from "@/lib/commerce/catalog";
import { getBaseSetPrice, getPerPiecePrice } from "@/lib/b2b/pricing";
import { getStyleCode } from "@/lib/b2b/style-code";
import {
  buildCatalogRequestUrl,
  buildProductInquiryUrl,
} from "@/lib/b2b/whatsapp";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo";
import type { PortableTextBlock } from "@portabletext/react";

export const revalidate = 3600;

export async function generateStaticParams() {
  // CMS entries only — the ghost fallback editorials are cut, not restyled.
  if (!isSanityConfigured()) return [];
  const slugs = await getEditorialSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getEditorialBySlug(slug);
  if (!entry) return { title: "Editorial" };
  return {
    title: entry.title,
    description: entry.excerpt,
    alternates: { canonical: `/lookbook/${entry.slug}` },
    openGraph: {
      title: `${entry.title} | Rangat Pehnawa`,
      description: entry.excerpt,
      url: `/lookbook/${entry.slug}`,
      type: "article",
    },
  };
}

const formatDate = (iso?: string) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/** Rough read-time from portable-text spans — presentational only. */
const readingMinutes = (body: PortableTextBlock[]) => {
  const words = body.reduce((acc, blk) => {
    const children = (blk as { children?: { text?: string }[] }).children;
    if (!Array.isArray(children)) return acc;
    return (
      acc +
      children.reduce(
        (sum, child) =>
          sum +
          (typeof child.text === "string"
            ? child.text.trim().split(/\s+/).filter(Boolean).length
            : 0),
        0,
      )
    );
  }, 0);
  return Math.max(1, Math.round(words / 200));
};

export default async function EditorialDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = await getEditorialBySlug(slug);
  if (!entry) notFound();

  const cover = sanityImageUrl(entry.coverImageRef, 1600);
  const body = Array.isArray(entry.body)
    ? (entry.body as PortableTextBlock[])
    : [];
  const gallery = (entry.gallery ?? [])
    .map((ref) => sanityImageUrl(ref, 1200))
    .filter((src): src is string => Boolean(src));
  const published = formatDate(entry.publishedAt);

  // Entry number = position in the published journal — a real count.
  const siblings = await getEditorialEntries(24);
  const entryNumber = siblings.findIndex((e) => e.slug === entry.slug) + 1;

  // Every story ends at the rail: live styles with real codes.
  const styles = await getProducts(4);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "The Lookbook", item: absoluteUrl("/lookbook") },
      {
        "@type": "ListItem",
        position: 3,
        name: entry.title,
        item: absoluteUrl(`/lookbook/${entry.slug}`),
      },
    ],
  };

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: entry.title,
    ...(entry.excerpt ? { description: entry.excerpt } : {}),
    ...(cover ? { image: [cover] } : {}),
    ...(entry.publishedAt ? { datePublished: entry.publishedAt } : {}),
    mainEntityOfPage: absoluteUrl(`/lookbook/${entry.slug}`),
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(articleLd) }}
      />
      <Navbar />

      <main className="min-h-screen flex-1 bg-surface pb-24 pt-16 text-content">
        {/* Printed-journal running head — category + entry number, sticky. */}
        <div className="ledger sticky top-16 z-30 border-b border-line/25 bg-surface">
          <div className="mx-auto flex max-w-[1400px] items-baseline gap-3 px-5 py-2 text-[9px] font-extrabold uppercase tracking-[0.24em] text-content/55 sm:px-10 lg:px-16">
            <span>{entry.category ?? "journal"}</span>
            {entryNumber > 0 && (
              <>
                <span aria-hidden="true" className="text-content/35">
                  ·
                </span>
                <span className="tabular-nums">Story {entryNumber}</span>
              </>
            )}
            <Link
              href="/lookbook"
              className="ml-auto underline decoration-1 underline-offset-4 hover:decoration-2"
            >
              The lookbook
            </Link>
          </div>
        </div>

        <article className="mx-auto w-full max-w-[1400px] px-5 sm:px-10 lg:px-16">
          {/* Text block with the folio rail at lg+ (R2). */}
          <div className="relative lg:ml-[72px] lg:border-l lg:border-line/25 lg:pl-6">
            {/* Story head — entry anatomy. */}
            <header className="entry-rule relative mt-12">
              <p className="pt-5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-content/55">
                {entry.category ?? "journal"}
                <span className="mx-2 text-content/35">·</span>
                {published ?? "archive"}
                {body.length > 0 && (
                  <>
                    <span className="mx-2 text-content/35">·</span>
                    <span className="tabular-nums">
                      {readingMinutes(body)} min
                    </span>
                  </>
                )}
              </p>
              <h1 className="mt-3 max-w-[18ch] text-[clamp(2.75rem,6vw,5.5rem)] font-black uppercase leading-[0.95] tracking-[-0.04em]">
                {entry.title}
              </h1>
              {entry.excerpt && (
                <p className="mt-4 max-w-[52ch] text-sm leading-[21px] text-content/70">
                  {entry.excerpt}
                </p>
              )}
            </header>

            {/* Cover plate — framed, only when a real cover exists. */}
            {cover && (
              <div className="mt-8 grid gap-6 lg:grid-cols-12">
                <div className="plate-frame relative aspect-[3/4] overflow-hidden bg-surface-hover lg:col-span-7">
                  <Image
                    src={cover}
                    alt={entry.title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 760px"
                    className="object-cover"
                  />
                </div>
              </div>
            )}

            {/* Body. */}
            <div className="mt-10 max-w-3xl">
              {body.length > 0 ? (
                <LookbookPortableText value={body} />
              ) : (
                <p className="text-sm leading-6 text-content/60">
                  This story is being written.
                </p>
              )}
            </div>

            {/* Gallery — grid-hung framed plates, never full-bleed. */}
            {gallery.length > 0 && (
              <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
                {gallery.map((src, index) => (
                  <div
                    key={src}
                    className="plate-frame relative aspect-[4/5] overflow-hidden bg-surface-hover"
                  >
                    <Image
                      src={src}
                      alt={`${entry.title} — plate ${index + 1}`}
                      fill
                      sizes="(max-width: 640px) 100vw, 620px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Terminal desk — the story ends at the rail. */}
            <section className="entry-rule mt-16">
              <h2 className="pt-5 text-[10px] font-extrabold uppercase tracking-[0.22em]">
                Stock the styles behind this story
              </h2>

              {styles.length > 0 ? (
                <div className="ledger mt-4">
                  {styles.map((product) => {
                    const setPrice = getBaseSetPrice(product);
                    const perPiece = getPerPiecePrice(setPrice);
                    return (
                      <div
                        key={product.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-4 border-b border-line/20 py-3 md:grid-cols-[8rem_minmax(0,1fr)_10rem_7rem]"
                      >
                        <span className="hidden font-mono text-[11px] tracking-[0.08em] text-content/70 md:block">
                          {getStyleCode(product)}
                        </span>
                        <Link
                          href={`/shop/${product.handle}`}
                          className="min-w-0 truncate text-sm font-bold leading-tight tracking-[-0.02em] hover:underline"
                        >
                          {product.title}
                        </Link>
                        <span className="text-sm font-black tabular-nums tracking-[-0.02em]">
                          {formatPrice(setPrice)}
                          <span className="ml-1 text-[8px] font-bold uppercase tracking-[0.14em] text-content/45">
                            set
                          </span>
                          <span className="mx-1 text-content/40">·</span>
                          {formatPrice(perPiece)}
                          <span className="ml-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-content/45">
                            /pc
                          </span>
                        </span>
                        <a
                          href={buildProductInquiryUrl(product)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-right text-[9px] font-extrabold uppercase tracking-[0.18em] underline decoration-1 underline-offset-4 hover:decoration-2"
                        >
                          WhatsApp →
                        </a>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 max-w-xl">
                  <p className="border-b border-line/20 py-3 text-sm leading-6 text-content/70">
                    Styles updating — WhatsApp for today&apos;s price list.
                  </p>
                  <a
                    href={buildCatalogRequestUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex h-11 items-center border border-content px-6 text-[10px] font-extrabold uppercase tracking-[0.2em] transition-colors hover:bg-surface-inverse hover:text-content-inverse"
                  >
                    WhatsApp catalog
                  </a>
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-[10px] font-extrabold uppercase tracking-[0.2em]">
                <Link
                  href="/lookbook"
                  className="underline decoration-1 underline-offset-4 hover:decoration-2"
                >
                  ← All stories
                </Link>
                <Link
                  href="/shop"
                  className="underline decoration-1 underline-offset-4 hover:decoration-2"
                >
                  Browse styles →
                </Link>
              </div>
            </section>

            <EntryClose className="mt-12" />
          </div>
        </article>
      </main>

      <Footer />
    </>
  );
}
