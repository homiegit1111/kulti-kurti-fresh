import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="flex-1 bg-warm-white relative min-h-screen flex flex-col items-center justify-center px-6 py-32 text-center overflow-hidden">
        <p
          aria-hidden
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 font-serif text-[38vw] leading-none text-charcoal/[0.04] select-none pointer-events-none"
        >
          404
        </p>
        <div className="relative inline-flex items-center gap-2 mb-5">
          <span className="w-4 h-[1px] bg-gold" />
          <span className="text-[9px] uppercase tracking-[0.3em] text-gold font-bold">
            404
          </span>
          <span className="w-4 h-[1px] bg-gold" />
        </div>
        <h1 className="relative text-5xl md:text-7xl font-serif font-light text-charcoal tracking-tight leading-[1.1]">
          This thread <span className="text-charcoal/40 italic font-light">unravelled.</span>
        </h1>
        <p className="relative text-sm md:text-base text-charcoal/55 max-w-sm mx-auto font-light leading-relaxed mt-6">
          The page you&rsquo;re looking for has moved or never existed. Let&rsquo;s
          get you back to the wholesale catalog.
        </p>
        <div className="relative flex flex-wrap items-center justify-center gap-4 mt-12">
          <Link
            href="/shop"
            className="btn-luxe"
          >
            Open Wholesale Catalog
          </Link>
          <Link
            href="/"
            className="btn-luxe-outline"
          >
            Back Home
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
