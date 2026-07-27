"use client";

import Link from "next/link";
import { B2B_CONFIG } from "@/lib/b2b/config";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Global error boundary (Chapter 4) — plain and calm: what happened, that the
 * order is safe, one retry, one WhatsApp help line. No drama, no devices.
 */
export default function GlobalError({ error, reset }: ErrorPageProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 py-24 font-sans text-content">
      <div className="w-full max-w-lg border-y border-line/25 py-12 text-center">
        <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.28em] text-content/45">
          Error
        </p>

        <h1 className="text-2xl font-black uppercase tracking-[-0.03em] text-content sm:text-3xl">
          Something went wrong
        </h1>

        <p className="mx-auto mt-5 max-w-[38ch] text-sm leading-6 text-content/60">
          This page could not load. Your cart and order are safe. Try again, or
          message us on WhatsApp and we will help you order.
        </p>

        {error.digest && (
          <p className="mt-4 font-mono text-[9px] tracking-[0.15em] text-content/30">
            Ref: {error.digest}
          </p>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={reset} className="btn-luxe">
            Try again
          </button>
          <a
            href={`https://wa.me/${B2B_CONFIG.whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-luxe-outline"
          >
            WhatsApp help
          </a>
        </div>

        <p className="mt-8 text-[11px] text-content/45">
          <Link href="/" className="underline transition-colors hover:text-content">
            Back home
          </Link>
        </p>
      </div>
    </main>
  );
}
