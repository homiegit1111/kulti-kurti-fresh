import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { B2B_CONFIG } from "@/lib/b2b/config";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";

/**
 * WhatsApp-first empty catalog strip when the product grid has nothing to show.
 */
export function EmptyCatalog() {
  const catalogUrl = buildCatalogRequestUrl();

  return (
    <section
      aria-label="Catalog loading or empty"
      className="content-auto relative overflow-hidden bg-[#faf7f1] py-12 sm:py-14 lg:py-16 dark:bg-[var(--surface-void)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.45)_0%,transparent_40%)] dark:hidden" />

      <div className="relative mx-auto max-w-[720px] px-6 text-center lg:px-12">
        <div className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-indigo dark:text-gold">
          <span className="h-px w-6 bg-indigo/40 dark:bg-gold/40" />
          Catalog
          <span className="h-px w-6 bg-indigo/40 dark:bg-gold/40" />
        </div>

        <h2 className="font-serif text-[clamp(1.75rem,3.5vw,2.4rem)] font-normal leading-[1.1] tracking-[-0.02em] text-charcoal dark:text-white">
          Styles are on the way
          <span className="mt-1 block font-light italic text-madder">
            get the latest wholesale line sheet now.
          </span>
        </h2>

        <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-charcoal/55 dark:text-white/50">
          Our live product grid is empty for a moment. Request the full catalog
          on WhatsApp — MOQ {B2B_CONFIG.minimumOrderSets} sets, clear set
          pricing, GST-ready.
        </p>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={catalogUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 text-[10px] font-bold uppercase tracking-[0.14em] text-[#062016] transition-[filter,transform] hover:brightness-105 active:scale-[0.98] sm:w-auto"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp catalog
          </a>
          <Link
            href="/bulk-order"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-charcoal/15 bg-transparent px-6 text-[10px] font-bold uppercase tracking-[0.14em] text-charcoal transition-colors hover:border-[hsl(var(--brand-madder)/0.5)] hover:text-madder dark:border-white/20 dark:text-white dark:hover:border-gold/40 dark:hover:text-gold sm:w-auto"
          >
            Bulk deals
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
