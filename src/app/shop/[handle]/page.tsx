import type { Metadata } from "next";
import { getProductByHandle } from "@/lib/medusa";
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.images,
    description: product.description,
    sku: product.handle,
    brand: {
      "@type": "Brand",
      name: "Rangat Pehnawa",
    },
    offers: {
      "@type": "Offer",
      url: `https://www.rangatpehnawa.com/shop/${product.handle}`,
      priceCurrency: "INR",
      price: product.salePrice ?? product.price,
      itemCondition: "https://schema.org/NewCondition",
      availability: "https://schema.org/InStock",
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
