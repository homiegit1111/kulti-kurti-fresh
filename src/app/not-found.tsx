import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { NotFoundSuggestions } from "@/components/layout/not-found-suggestions";

export const metadata: Metadata = {
  title: "Page Not Found — Rangat Pehnawa",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center bg-surface px-6 py-32 text-center">
        <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.28em] text-content/45">
          404
        </p>

        <h1 className="text-3xl font-black uppercase tracking-[-0.03em] text-content sm:text-4xl">
          Page not found
        </h1>

        <p className="mt-5 max-w-[38ch] text-sm leading-6 text-content/60">
          This page is not in the current price list. It may have moved, or the
          style code may be misspelled.
        </p>

        <NotFoundSuggestions />

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <Link href="/shop" className="btn-luxe">
            Browse styles
          </Link>
          <Link href="/" className="btn-luxe-outline">
            Back home
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
