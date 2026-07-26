import type { Metadata } from "next";
import { Suspense } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getProducts } from "@/lib/commerce/catalog";
import { LineClient } from "./line-client";

export const metadata: Metadata = {
  title: "The Line — Wholesale Kurti Catalogue",
  description:
    "Every style, with set rate and per-piece rate on one screen. Filter by size run, per-piece band and category. Shortlist, compare and order.",
};

export default async function LinePage() {
  const products = await getProducts(60);

  return (
    <>
      <Navbar />
      <main>
        <Suspense fallback={<div className="min-h-screen bg-surface" />}>
          <LineClient products={products} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
