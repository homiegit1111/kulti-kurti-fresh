import { jsonLdScript } from "@/lib/json-ld";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  getCollectionByHandle,
  getCollections,
  getProductsByCollection,
} from "@/lib/commerce/catalog";
import { getBaseSetPrice, getPerPiecePrice } from "@/lib/b2b/pricing";
import { absoluteUrl, buildProductItemListLd } from "@/lib/seo";
import CollectionDetailClient, { type ChapterSpec } from "./client-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const data = await getCollectionByHandle(handle);
  const collection = data?.collection;

  if (!collection) {
    return { title: "Collection Not Found" };
  }

  const title = `${collection.title} — Kurtis & Ethnic Wear`;
  const description =
    collection.description?.trim() ||
    `Shop the ${collection.title} wholesale collection at Rangat Pehnawa - kurti sets for boutiques and resellers with MOQ 4 sets, GST invoice support, and WhatsApp ordering.`;

  return {
    title,
    description,
    alternates: { canonical: `/collections/${collection.handle}` },
    openGraph: {
      title: `${collection.title} | Rangat Pehnawa`,
      description,
      url: `/collections/${collection.handle}`,
      type: "website",
      locale: "en_IN",
      siteName: "Rangat Pehnawa",
      images: collection.image ? [{ url: collection.image, alt: collection.title }] : undefined,
    },
  };
}

export default async function CollectionRoute({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  // One server fetch feeds JSON-LD AND the rendered chapter — the client
  // receives everything as props and never refetches (empty-not-mock law).
  const collections = await getCollections();
  const chapterIndex = collections.findIndex(
    (candidate) => candidate.handle === handle || candidate.id === handle,
  );
  const collection = chapterIndex >= 0 ? collections[chapterIndex] : undefined;
  if (!collection) notFound();

  const products = await getProductsByCollection(collection.handle, 24);

  // Server-computed chapter spec — style count, per-piece band, color roster.
  const perPiece = products.map((product) =>
    getPerPiecePrice(getBaseSetPrice(product)),
  );
  const spec: ChapterSpec = {
    styleCount: products.length,
    perPieceMin: perPiece.length > 0 ? Math.min(...perPiece) : 0,
    perPieceMax: perPiece.length > 0 ? Math.max(...perPiece) : 0,
    colors: [...new Set(products.flatMap((product) => product.colors))],
  };

  const prevChapter =
    chapterIndex > 0
      ? {
          handle: collections[chapterIndex - 1].handle,
          title: collections[chapterIndex - 1].title,
        }
      : null;
  const nextChapter =
    chapterIndex < collections.length - 1
      ? {
          handle: collections[chapterIndex + 1].handle,
          title: collections[chapterIndex + 1].title,
        }
      : null;

  const itemListLd =
    products.length > 0
      ? buildProductItemListLd(products, {
          name: collection.title,
          path: `/collections/${collection.handle}`,
        })
      : null;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Collections", item: absoluteUrl("/collections") },
      {
        "@type": "ListItem",
        position: 3,
        name: collection.title,
        item: absoluteUrl(`/collections/${collection.handle}`),
      },
    ],
  };

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: collection.title,
    description:
      collection.description?.trim() ||
      `Shop the ${collection.title} collection — women's kurtis and Indian ethnic wear.`,
    url: absoluteUrl(`/collections/${collection.handle}`),
    isPartOf: { "@id": absoluteUrl("/#website") },
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-content">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(collectionLd) }}
      />
      {itemListLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(itemListLd) }}
        />
      )}
      <Navbar />
      <main className="relative z-10 flex-1">
        <CollectionDetailClient
          collection={collection}
          products={products}
          chapterIndex={chapterIndex}
          spec={spec}
          prevChapter={prevChapter}
          nextChapter={nextChapter}
        />
      </main>
      <Footer />
    </div>
  );
}
