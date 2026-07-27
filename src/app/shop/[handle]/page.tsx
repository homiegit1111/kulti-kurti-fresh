import { jsonLdScript } from "@/lib/json-ld";
import type { Metadata } from "next";
import { getProductByHandle, getProducts } from "@/lib/commerce/catalog";
import { getPublishedReviews, summarize } from "@/lib/server/reviews";
import ClientProductDetail from "./client-page";
import { B2B_CONFIG } from "@/lib/b2b/config";
import { getStyleCode } from "@/lib/b2b/style-code";

export async function generateMetadata(
  { params }: { params: Promise<{ handle: string }> }
): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProductByHandle(handle);

  if (!product) {
    return {
      title: "Product Not Found",
    };
  }

  return {
    title: product.title,
    description: product.description,
    alternates: {
      canonical: `/shop/${product.handle}`,
    },
    // og:image / twitter:image intentionally NOT set here: the file-based
    // sibling `opengraph-image.tsx` renders the branded per-product line-sheet
    // card, and Next skips file-based images whenever config metadata
    // specifies an `images` key (see mergeStaticMetadata in
    // next/dist/lib/metadata/resolve-metadata.js).
    openGraph: {
      title: `${product.title} | Rangat Pehnawa`,
      description: product.description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description: product.description,
    },
  };
}

/** Google recommends priceValidUntil; default to ~1 year out (per request). */
function getPriceValidUntil(): string {
  return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const product = await getProductByHandle(handle);

  if (!product) {
    return <ClientProductDetail params={params} />;
  }

  // Real siblings for the "Same run" rail: live catalog products sharing this
  // style's code-category prefix (e.g. RP-COTTON-*). Empty means the rail is
  // absent — never mock data (§1.1.7).
  const codePrefix = getStyleCode(product).split("-").slice(0, 2).join("-");
  const relatedProducts = (await getProducts(24))
    .filter(
      (candidate) =>
        candidate.id !== product.id &&
        getStyleCode(candidate).startsWith(`${codePrefix}-`),
    )
    .slice(0, 8);

  const inStock = product.availableForSale !== false;
  // Google recommends priceValidUntil; default to ~1 year out.
  const priceValidUntil = getPriceValidUntil();

  // Customer reviews → star snippets in search results. Only emitted when
  // real reviews exist (Google penalises fabricated aggregateRating data).
  const reviews = await getPublishedReviews(handle, 10);
  const reviewSummary = summarize(reviews);
  const reviewLd =
    reviewSummary.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: reviewSummary.average,
            reviewCount: reviewSummary.count,
            bestRating: 5,
            worstRating: 1,
          },
          review: reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.author_name },
            datePublished: r.created_at.slice(0, 10),
            reviewBody: r.body,
            ...(r.title ? { name: r.title } : {}),
            reviewRating: {
              "@type": "Rating",
              ratingValue: r.rating,
              bestRating: 5,
              worstRating: 1,
            },
          })),
        }
      : {};

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.images,
    description: product.description,
    sku: product.handle,
    category: product.category,
    brand: {
      "@type": "Brand",
      name: "Rangat Pehnawa",
    },
    offers: {
      "@type": "Offer",
      url: `https://www.rangatpehnawa.com/shop/${product.handle}`,
      priceCurrency: "INR",
      price: product.salePrice ?? product.price,
      unitText: "SET",
      eligibleQuantity: {
        "@type": "QuantitativeValue",
        minValue: B2B_CONFIG.minimumStyleSets,
        unitText: "set",
      },
      priceValidUntil,
      itemCondition: "https://schema.org/NewCondition",
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
    ...reviewLd,
  };

  // Breadcrumb trail (Home › Shop › Product) — lets Google render a breadcrumb
  // path in search results instead of the bare URL.
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.rangatpehnawa.com/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Shop",
        item: "https://www.rangatpehnawa.com/shop",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.title,
        item: `https://www.rangatpehnawa.com/shop/${product.handle}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbLd) }}
      />
      <ClientProductDetail
        params={params}
        initialProduct={product}
        relatedProducts={relatedProducts}
      />
    </>
  );
}
