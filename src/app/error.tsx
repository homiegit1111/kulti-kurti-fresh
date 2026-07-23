"use client";

import Link from "next/link";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface px-6 py-24 font-sans text-content">
      {/* Giant faded background letters — editorial device */}
      <p
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none text-center text-[38vw] font-black uppercase leading-none tracking-[-0.08em] text-content/[0.04]"
      >
        ERR
      </p>

      {/* Content frame */}
      <div className="relative w-full max-w-xl border border-line/20 bg-surface-2 px-8 py-12 sm:px-12">
        {/* Inner lime frame — frame-luxe device, inlined to avoid framer dependency */}
        <div className="pointer-events-none absolute inset-2 border border-accent-lime/30" />

        {/* Numbered eyebrow */}
        <div className="mb-6 inline-flex items-center gap-3">
          <span className="flex h-6 w-8 items-center justify-center bg-accent-red text-[9px] font-black uppercase tracking-[0.18em] text-content-inverse">
            00
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-accent-red">
            System interruption
          </span>
        </div>

        {/* Headline — merchant-register, never cutesy */}
        <h1 className="mt-2 text-[clamp(2.4rem,8vw,5.5rem)] font-black uppercase leading-[0.85] tracking-[-0.06em] text-content">
          THE PRESS<br />
          STOPPED.
        </h1>

        {/* One-line factual sub */}
        <p className="mt-6 max-w-[36ch] text-sm leading-6 text-content/60">
          An unexpected fault halted this page. Your cart and order data are
          safe — this is a display error only.
        </p>

        {/* Error digest — 9px mono-feel, shown only when present */}
        {error.digest && (
          <p className="mt-4 font-mono text-[9px] tracking-[0.15em] text-content/30">
            REF&#58; {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="mt-10 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="btn-luxe">
            Try again
          </button>
          <Link href="/" className="btn-luxe-outline">
            Back to storefront
          </Link>
        </div>
      </div>

      {/* Bottom micro-label */}
      <p className="relative mt-6 text-[9px] font-bold uppercase tracking-[0.24em] text-content/30">
        Rangat Pehnawa — Wholesale Line
      </p>
    </main>
  );
}
