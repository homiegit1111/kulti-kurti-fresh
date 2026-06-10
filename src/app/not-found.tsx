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
      <main className="flex-1 bg-[#fcfbf9] relative min-h-screen flex flex-col items-center justify-center px-6 py-32 text-center">
        <div className="inline-flex items-center gap-2 mb-5">
          <span className="w-4 h-[1px] bg-gold" />
          <span className="text-[9px] uppercase tracking-[0.3em] text-gold font-bold">
            404
          </span>
          <span className="w-4 h-[1px] bg-gold" />
        </div>
        <h1 className="text-4xl md:text-6xl font-serif text-charcoal tracking-tight leading-[1.1]">
          This thread <span className="text-charcoal/40 italic font-light">unravelled.</span>
        </h1>
        <p className="text-sm md:text-base text-charcoal/55 max-w-sm mx-auto font-light leading-relaxed mt-5">
          The page you&rsquo;re looking for has moved or never existed. Let&rsquo;s
          find you something beautiful instead.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
          <Link
            href="/shop"
            className="h-12 px-8 inline-flex items-center justify-center rounded-full bg-charcoal text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-black transition-colors"
          >
            Explore the Shop
          </Link>
          <Link
            href="/"
            className="h-12 px-8 inline-flex items-center justify-center rounded-full border border-charcoal/15 text-charcoal text-[10px] font-bold uppercase tracking-[0.2em] hover:border-charcoal/40 transition-colors"
          >
            Back Home
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
