import { ArrowUpRight, MessageCircle } from "lucide-react";
import { B2B_CONFIG } from "@/lib/b2b/config";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";
import { BlockMotif } from "@/components/sections/block-motifs";

function formatDisplayPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const withCountry = digits.startsWith("91") ? digits : `91${digits}`;
  const national = withCountry.slice(2);
  if (national.length === 10) {
    return `+91 ${national.slice(0, 5)} ${national.slice(5)}`;
  }
  return `+${withCountry}`;
}

function waDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("91") ? digits : `91${digits}`;
}

export function WhatsappCatalogCta() {
  const catalogUrl = buildCatalogRequestUrl();
  const phone = formatDisplayPhone(B2B_CONFIG.whatsappNumber);
  const digits = waDigits(B2B_CONFIG.whatsappNumber);
  const generalChat = `https://wa.me/${digits}?text=${encodeURIComponent(
    "Namaste Rangat Pehnawa,\n\nI would like to check styles, MOQ, and pricing. Please assist.",
  )}`;

  return (
    <section
      aria-label="WhatsApp"
      className="content-auto relative overflow-hidden border-y border-indigo/[0.08] bg-transparent py-8 dark:border-white/[0.07] sm:py-10 lg:py-12"
    >
      {/* Faint loom ground — quiet closing note, static, decorative only */}
      <span aria-hidden className="loom-threads pointer-events-none absolute inset-0" />

      <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-12">
        <div className="grid gap-5 overflow-hidden rounded-[1.25rem] border border-indigo/[0.1] bg-white/55 p-5 shadow-[0_20px_60px_-40px_rgba(35,25,20,0.35)] dark:border-white/[0.09] dark:bg-[var(--surface-raised)] dark:shadow-none sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10 lg:p-9">
          <div className="min-w-0">
            {/* Maker's mark + mono trade eyebrow — indigo carries the structure */}
            <div className="flex items-center gap-2.5">
              <BlockMotif className="h-4 w-4 shrink-0 text-indigo/70 dark:text-gold/70" />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-indigo dark:text-white/70">
                Wholesale catalog
              </span>
            </div>

            {/* The one bold note — a single madder hairline */}
            <hr aria-hidden className="dye-rule mt-3 w-10 rounded-full" />

            <h2 className="mt-3 font-serif text-[clamp(1.55rem,3.4vw,2.65rem)] font-light leading-[1.08] tracking-tight text-charcoal dark:text-white">
              Talk to us
              <span className="mt-1 block italic text-indigo dark:text-gold">
                on WhatsApp.
              </span>
            </h2>
            <p className="text-caption mt-3 max-w-md">
              Ask about styles, MOQ, stock, or dispatch — one thread, clear
              answers.
            </p>

            {/* Phone as a mono spec chip — WhatsApp green stays on the mark only */}
            <div className="mt-4">
              <span className="trade-tag">
                <WhatsAppGlyph className="h-3 w-3 text-[#25D366]" />
                {phone}
              </span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[240px] lg:grid-cols-1">
            <a
              href={catalogUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 text-[10px] font-bold uppercase tracking-[0.14em] text-[#062016] transition-[filter,transform] hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              <WhatsAppGlyph className="h-4 w-4" />
              Message us
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" />
            </a>
            <a
              href={generalChat}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-indigo/15 px-6 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo/70 transition-colors hover:border-[#25D366]/45 hover:text-[#137846] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo/40 dark:border-white/14 dark:text-white/70 dark:hover:border-[#25D366]/45 dark:hover:text-[#7ddea8]"
            >
              <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" />
              Ask a question
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 1 4.3L2 22l5.8-1.5c1.2.6 2.6.9 4 .9 5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.3 0-2.6-.3-3.7-.9l-.3-.2-3.5.9.9-3.4-.2-.3A7.96 7.96 0 014 12a8 8 0 1116 0 8 8 0 01-8 8zm4.2-5.9c-.23-.12-1.36-.67-1.57-.75-.21-.08-.36-.12-.52.12-.15.23-.6.75-.74.9-.14.15-.27.17-.5.06-.23-.12-.97-.36-1.85-1.14-.68-.61-1.14-1.36-1.27-1.59-.13-.23 0-.35.1-.46.1-.1.23-.26.34-.4.11-.13.15-.22.22-.37.07-.15.04-.28-.02-.4-.06-.11-.52-1.25-.71-1.71-.19-.46-.38-.4-.52-.4-.13 0-.28 0-.43.01-.15.01-.39.06-.6.3-.21.23-.81.79-.81 1.93 0 1.14.83 2.24.95 2.4.11.15 1.63 2.5 3.95 3.5 2.32 1 2.32 .67 2.74.63.45-.04 1.45-.59 1.65-1.16.2-.57.2-1.06.14-1.17-.06-.1-.21-.16-.44-.28z" />
    </svg>
  );
}
