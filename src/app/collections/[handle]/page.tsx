import type { Metadata } from "next";
import { getCollectionByHandle } from "@/lib/shopify";
import { absoluteUrl } from "@/lib/seo";
import CollectionDetailClient from "./client-page";

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
    `Shop the ${collection.title} collection at Rangat Pehnawa — handcrafted women's kurtis and Indian ethnic wear. Sizes XS–XXL, COD & free shipping over ₹1,999.`;

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
  const data = await getCollectionByHandle(handle);
  const collection = data?.collection;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Collections", item: absoluteUrl("/collections") },
      ...(collection
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: collection.title,
              item: absoluteUrl(`/collections/${collection.handle}`),
            },
          ]
        : []),
    ],
  };

  const collectionLd = collection
    ? {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: collection.title,
        description:
          collection.description?.trim() ||
          `Shop the ${collection.title} collection — women's kurtis and Indian ethnic wear.`,
        url: absoluteUrl(`/collections/${collection.handle}`),
        isPartOf: { "@id": absoluteUrl("/#website") },
      }
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {collectionLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
        />
      )}
      <CollectionDetailClient params={params} />
    </>
  );
}
