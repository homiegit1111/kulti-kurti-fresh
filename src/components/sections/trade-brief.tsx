import Link from "next/link";
import { ArrowRight, FileText, PackageCheck, Scale, WalletCards } from "lucide-react";
import { B2B_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const tradeSignals = [
  {
    icon: PackageCheck,
    label: "Opening order",
    value: `${B2B_CONFIG.minimumOrderSets} sets / ${B2B_CONFIG.minimumOrderSets * B2B_CONFIG.setSize} pcs`,
    copy: "A workable first buy for a considered boutique rail.",
  },
  {
    icon: Scale,
    label: "Balanced packs",
    value: SIZE_RATIO_LABEL,
    copy: "A clear size run in every set, ready to merchandise.",
  },
  {
    icon: WalletCards,
    label: "Volume pricing",
    value: "Rates improve at 8+ sets",
    copy: "Scale into better trade terms as your order grows.",
  },
  {
    icon: FileText,
    label: "Order support",
    value: "Catalog, stock & invoice",
    copy: "A direct line for the details behind every order.",
  },
] as const;

export function TradeBrief() {
  return (
    <section
      aria-labelledby="trade-brief-title"
      className="content-auto relative overflow-hidden border-y border-indigo/12 bg-[color-mix(in_srgb,var(--canvas)_82%,white)] dark:border-white/[0.08] dark:bg-[var(--surface-raised)]"
    >
      <div aria-hidden className="loom-threads pointer-events-none absolute inset-0 opacity-70" />
      <div className="relative mx-auto max-w-[1440px] px-4 py-10 sm:px-6 sm:py-12 lg:px-12 lg:py-14">
        <ScrollReveal as="header" className="grid gap-5 border-b border-indigo/12 pb-7 dark:border-white/[0.1] sm:pb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-10" y={12}>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-indigo/70 dark:text-white/55">
              Built for a buyer’s desk
            </p>
            <div aria-hidden className="dye-rule mt-4 w-12" />
            <h2 id="trade-brief-title" className="mt-5 font-serif text-[clamp(1.8rem,4vw,3.15rem)] leading-[1.02] tracking-tight text-indigo dark:text-white">
              The terms behind
              <span className="block italic text-gold">a calmer first order.</span>
            </h2>
          </div>
          <Link
            href="/bulk-order"
            className="group inline-flex min-h-11 items-center gap-2 self-start border-b border-indigo/30 pb-1 font-mono text-[10px] uppercase tracking-[0.17em] text-indigo transition-colors hover:border-gold hover:text-gold dark:border-white/25 dark:text-white lg:self-auto"
          >
            Build a wholesale order
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </ScrollReveal>

        <div className="grid divide-y divide-indigo/10 dark:divide-white/[0.1] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {tradeSignals.map(({ icon: Icon, label, value, copy }, index) => (
            <ScrollReveal
              key={label}
              className="group relative py-6 sm:px-6 sm:py-8 first:pl-0 sm:first:pl-0 lg:px-7 lg:first:pl-0 lg:last:pr-0"
              delay={index * 0.04}
              y={10}
            >
              <span className="trade-tag transition-transform duration-300 group-hover:-translate-y-0.5">
                <Icon className="h-3 w-3" strokeWidth={1.75} aria-hidden />
                {label}
              </span>
              <p className="mt-6 font-serif text-[1.3rem] leading-[1.08] tracking-tight text-indigo dark:text-white">
                {value}
              </p>
              <p className="mt-2 max-w-[27ch] text-[12px] leading-relaxed text-indigo/60 dark:text-white/48">
                {copy}
              </p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
