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
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-[42vw] font-black uppercase leading-none tracking-[-0.06em] text-charcoal/[0.05] select-none pointer-events-none"
        >
          404
        </p>
        <div className="relative inline-flex items-center gap-2 mb-6">
          <span className="w-6 h-[2px] bg-gold" />
          <span className="text-[9px] uppercase tracking-[0.3em] text-gold font-bold">
            Error 404
          </span>
        </div>
        <h1 className="relative text-[clamp(3rem,10vw,7rem)] font-black uppercase text-charcoal tracking-[-0.06em] leading-[0.82]">
          This thread<br />
          <span className="text-charcoal/30">unravelled</span>
        </h1>
        <p className="relative text-sm md:text-base text-charcoal/60 max-w-sm mx-auto leading-relaxed mt-6">
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
