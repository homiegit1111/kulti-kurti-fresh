"use client";

/**
 * Loading register (§4): a scan line over a ghost ledger — no animate-pulse,
 * role tokens only, reduced-motion gated via the `.ledger-scan` keyframes.
 */

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function CartLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-content">
      <Navbar />
      <main className="flex-1 pb-24 pt-24 lg:pt-28" aria-busy="true">
        <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-10 lg:px-16">
          <div className="border-b-2 border-line pb-6">
            <div className="h-3 w-40 bg-surface-hover" />
            <div className="mt-4 h-14 w-full max-w-md bg-surface-hover" />
          </div>

          <div className="relative mt-10 overflow-hidden" aria-hidden="true">
            <div className="ledger-scan pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-content/5 to-transparent" />
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="flex items-center gap-5 border-b border-line/15 py-7"
              >
                <div className="h-24 w-24 shrink-0 bg-surface-hover" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="h-3 w-24 bg-surface-hover" />
                  <div className="h-5 w-48 bg-surface-hover" />
                  <div className="mt-2 h-3 w-32 bg-surface-hover" />
                </div>
                <div className="h-5 w-24 bg-surface-hover" />
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
