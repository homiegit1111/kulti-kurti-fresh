import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Style Not Found — Rangat Pehnawa",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden bg-surface px-6 py-32 text-center">
        {/* Giant faded background number — editorial device */}
        <p
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none text-[42vw] font-black uppercase leading-none tracking-[-0.06em] text-content/[0.05]"
        >
          404
        </p>

        {/* Numbered eyebrow */}
        <div className="relative mb-6 inline-flex items-center gap-3">
          <span className="flex h-6 w-8 items-center justify-center bg-accent-red text-[9px] font-black uppercase tracking-[0.18em] text-content-inverse">
            04
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-accent-red">
            Style not found
          </span>
        </div>

        {/* Headline */}
        <h1 className="relative text-[clamp(3rem,10vw,7rem)] font-black uppercase leading-[0.82] tracking-[-0.06em] text-content">
          Style&nbsp;No.&nbsp;404
          <br />
          <span className="text-content/25">Not in this</span>
          <br />
          line-book.
        </h1>

        {/* Factual sub */}
        <p className="relative mt-6 max-w-[34ch] text-sm leading-6 text-content/60">
          This page has been pulled from the line, moved, or never existed.
          Return to the wholesale catalog to browse current drops.
        </p>

        {/* Actions */}
        <div className="relative mt-12 flex flex-wrap items-center justify-center gap-4">
          <Link href="/shop" className="btn-luxe">
            Open wholesale catalog
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
