import type { Metadata } from "next";
import { getProductByHandle } from "@/lib/shopify";
import ClientProductDetail from "./client-page";

export async function generateMetadata(
  { params }: { params: Promise<{ handle: string }> }
): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProductByHandle(handle);

  if (!product) {
    return {
      title: "Product Not Found | Rangat Pehnawa",
    };
  }

  return {
    title: `${product.title} | Rangat Pehnawa`,
    description: product.description,
    openGraph: {
      title: `${product.title} | Rangat Pehnawa`,
      description: product.description,
      images: [
        {
          url: product.images[0],
          width: 800,
          height: 1000,
          alt: product.title,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description: product.description,
      images: [product.images[0]],
    },
  };
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

  const inStock = product.availableForSale !== false;
  // Google recommends priceValidUntil; default to ~1 year out.
  const priceValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

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
      priceValidUntil,
      itemCondition: "https://schema.org/NewCondition",
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ClientProductDetail params={params} />
    </>
  );
}
